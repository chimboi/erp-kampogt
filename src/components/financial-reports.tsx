"use client";
import { useState } from "react";
import {
  LayoutDashboard,
  ListOrdered,
  Table2,
  ChevronDown,
  ChevronRight,
  Wallet,
  TrendingUp,
  ArrowLeftRight,
  HandCoins,
  Receipt,
  Percent,
  Landmark,
  Package,
  PiggyBank,
  Sigma,
  Banknote,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { money } from "@/data";
import { cashMoney } from "@/data/cash";
import {
  incomeStatement,
  indirectCashFlow,
  previousPeriod,
  type Breakdown,
} from "@/data/reports";
import { PeriodPicker, usePeriod } from "./period-picker";
import { Card } from "./ui";
import { DataTable, type Column } from "./data-table";
import { Trend, Bars } from "./charts";
const percent = (amount: number, total: number) =>
  total ? (amount / total) * 100 : 0;
const change = (current: number, previous: number) =>
  previous ? ((current - previous) / Math.abs(previous)) * 100 : null;
function Metric({
  label,
  value,
  tone,
  detail,
}: {
  label: string;
  value: number | null;
  tone: string;
  detail?: React.ReactNode;
}) {
  return (
    <Card className={`report-metric ${tone}`}>
      <p>{label}</p>
      <strong>{value === null ? "—" : money(value)}</strong>
      {detail && <div className="report-metric-detail">{detail}</div>}
    </Card>
  );
}
function Change({
  current,
  previous,
  expense = false,
}: {
  current: number;
  previous: number;
  expense?: boolean;
}) {
  const delta = change(current, previous);
  if (delta === null) return <span className="muted">Sin base comparable</span>;
  return (
    <span
      className={(expense ? delta <= 0 : delta >= 0) ? "positive" : "negative"}
    >
      {delta > 0 ? "↑" : delta < 0 ? "↓" : ""} {Math.abs(delta).toFixed(1)}%
    </span>
  );
}
function BreakdownCard({
  title,
  rows,
  total,
  tone,
}: {
  title: string;
  rows: Breakdown[];
  total: number;
  tone: string;
}) {
  return (
    <Card className={`report-breakdown ${tone}`}>
      <h2>{title}</h2>
      {rows.length ? (
        rows.map((row) => (
          <div className="report-breakdown-row" key={row.name}>
            <div>
              <span>{row.name}</span>
              <strong>{money(row.value)}</strong>
            </div>
            <div>
              <progress
                max={100}
                value={Math.max(0, percent(row.value, total))}
                aria-label={`${row.name}: ${percent(row.value, total).toFixed(1)}%`}
              />
              <small>{percent(row.value, total).toFixed(1)}%</small>
            </div>
          </div>
        ))
      ) : (
        <p className="empty">Sin movimientos en el periodo.</p>
      )}
    </Card>
  );
}
type StatementRow = {
  id: string;
  concept: string;
  amount: number;
  previous: number;
  detail?: boolean;
  group?: string;
  total?: boolean;
  expense?: boolean;
};
export default function FinancialReports({
  cashFlow = false,
}: {
  cashFlow?: boolean;
}) {
  const store = useStore(),
    p = usePeriod("Mes");
  const [view, setView] = useState("Panel");
  const [expanded, setExpanded] = useState<string[]>([
    "income",
    "costs",
    "expenses",
    "operation",
    "capital",
  ]);
  const report = incomeStatement(store, p.period);
  const priorPeriod = previousPeriod(p.period, p.mode);
  const prior = incomeStatement(store, priorPeriod);
  const valid = report.missingCosts === 0;
  const toggle = (id: string) =>
    setExpanded((ids) =>
      ids.includes(id) ? ids.filter((value) => value !== id) : [...ids, id],
    );
  const groups: StatementRow[] = [
    {
      id: "income",
      concept: "Ingresos netos",
      amount: report.revenue,
      previous: prior.revenue,
      group: "income",
    },
    {
      id: "costs",
      concept: "(−) Costo de ventas",
      amount: -report.cost,
      previous: -prior.cost,
      group: "costs",
      expense: true,
    },
    {
      id: "gross",
      concept: "= Utilidad bruta",
      amount: report.gross,
      previous: prior.gross,
      total: true,
    },
    {
      id: "expenses",
      concept: "(−) Gastos de operación",
      amount: -report.expense,
      previous: -prior.expense,
      group: "expenses",
      expense: true,
    },
    {
      id: "operating",
      concept: "= Utilidad operativa",
      amount: report.operating,
      previous: prior.operating,
      total: true,
    },
    {
      id: "net",
      concept: "= Utilidad neta registrada",
      amount: report.net,
      previous: prior.net,
      total: true,
    },
  ];
  const statementRows = groups.flatMap((row): StatementRow[] => {
    if (!row.group || !expanded.includes(row.group)) return [row];
    const key = row.group as "income" | "costs" | "expenses";
    return [
      row,
      ...report[key].map((item) => ({
        id: `${row.id}-${item.name}`,
        concept: item.name,
        amount: item.value * (row.expense ? -1 : 1),
        previous:
          (prior[key].find((r) => r.name === item.name)?.value ?? 0) *
          (row.expense ? -1 : 1),
        detail: true,
        expense: row.expense,
      })),
    ];
  });
  const concept = (row: StatementRow) =>
    row.group ? (
      <button
        className="report-group"
        aria-expanded={expanded.includes(row.group)}
        onClick={() => toggle(row.group!)}
      >
        {expanded.includes(row.group) ? (
          <ChevronDown size={14} />
        ) : (
          <ChevronRight size={14} />
        )}{" "}
        {row.concept}
      </button>
    ) : (
      <span
        className={
          row.total ? "report-total" : row.detail ? "report-child" : ""
        }
      >
        {row.concept}
      </span>
    );
  const columns: Column<StatementRow>[] = [
    {
      id: "concept",
      label: "Concepto",
      value: (r) => r.concept,
      render: concept,
    },
    {
      id: "amount",
      label: "Importe",
      value: (r) => r.amount,
      render: (r) => (
        <strong
          className={r.amount < 0 ? "negative" : r.total ? "positive" : ""}
        >
          {!valid && r.id !== "income" && !r.detail && !r.expense
            ? "—"
            : cashMoney(r.amount)}
        </strong>
      ),
    },
    {
      id: "percent",
      label: "% ingresos",
      value: (r) =>
        percent(r.total ? r.amount : Math.abs(r.amount), report.revenue),
      render: (r) =>
        !valid && r.total
          ? "—"
          : `${percent(r.total ? r.amount : Math.abs(r.amount), report.revenue).toFixed(1)}%`,
    },
    {
      id: "change",
      label: "Vs. periodo anterior",
      value: (r) =>
        change(
          r.expense ? -r.amount : r.amount,
          r.expense ? -r.previous : r.previous,
        ) ?? -Infinity,
      render: (r) =>
        !valid && r.total ? (
          "—"
        ) : (
          <Change
            current={r.expense ? -r.amount : r.amount}
            previous={r.expense ? -r.previous : r.previous}
            expense={r.expense}
          />
        ),
    },
  ];
  const end = new Date(p.period.end + "T12:00:00Z");
  const monthly = Array.from({ length: 6 }, (_, index) => {
    const start = new Date(
      Date.UTC(end.getUTCFullYear(), end.getUTCMonth() - 5 + index, 1, 12),
    );
    const finish = new Date(
      Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 0, 12),
    );
    const result = incomeStatement(store, {
      start: start.toISOString().slice(0, 10),
      end:
        finish.toISOString().slice(0, 10) > p.period.end
          ? p.period.end
          : finish.toISOString().slice(0, 10),
    });
    return {
      name: start.toLocaleDateString("es-MX", {
        month: "short",
        year: "2-digit",
      }),
      Ingresos: result.revenue,
      Costos: result.cost,
      Gastos: result.expense,
    };
  });
  const flow = indirectCashFlow(store, p.period);
  const cashGroups: StatementRow[] = [
    {
      id: "initial",
      concept: "Saldo inicial",
      amount: flow.initial,
      previous: 0,
      total: true,
    },
    {
      id: "profit",
      concept: "Utilidad neta",
      amount: flow.profit,
      previous: 0,
    },
    {
      id: "operation",
      concept: "Flujo de operación",
      amount: flow.operation,
      previous: 0,
      group: "operation",
    },
    {
      id: "investment",
      concept: "Flujo de inversión",
      amount: flow.investment,
      previous: 0,
    },
    {
      id: "capital",
      concept: "Flujo de capital",
      amount: flow.capital,
      previous: 0,
      group: "capital",
    },
    {
      id: "period",
      concept: "Saldo periodo",
      amount: flow.period,
      previous: 0,
      total: true,
    },
    {
      id: "final",
      concept: "Saldo final",
      amount: flow.final,
      previous: 0,
      total: true,
    },
  ];
  const flowDetails: Record<
    string,
    { id: string; name: string; value: number }[]
  > = {
    operation: [
      { id: "collections", name: "Cobranza", value: flow.collections },
      { id: "payments", name: "Pagos", value: flow.payments },
      { id: "iva", name: "IVA", value: flow.iva },
      { id: "isr", name: "ISR", value: flow.isr },
    ],
    capital: [
      { id: "withdrawals", name: "Retiros de utilidades", value: 0 },
      { id: "contributions", name: "Aportación de socios", value: 0 },
      { id: "loans", name: "Préstamos recibidos", value: 0 },
      { id: "repayment", name: "Pago de capital de préstamos", value: 0 },
    ],
  };
  const flowRows = cashGroups.flatMap((row): StatementRow[] =>
    !row.group || !expanded.includes(row.group)
      ? [row]
      : [
          row,
          ...flowDetails[row.group].map((item) => ({
            id: item.id,
            concept: item.name,
            amount: item.value,
            previous: 0,
            detail: true,
          })),
        ],
  );
  const flowIcons: Record<string, typeof Wallet> = {
    initial: Wallet,
    profit: TrendingUp,
    operation: ArrowLeftRight,
    collections: HandCoins,
    payments: Receipt,
    iva: Percent,
    isr: Landmark,
    investment: Package,
    capital: PiggyBank,
    period: Sigma,
    final: Banknote,
  };
  const flowConcept = (row: StatementRow) => {
    const Icon = flowIcons[row.id];
    const content = (
      <>
        {Icon && <Icon size={16} />}
        <span>{row.concept}</span>
      </>
    );
    return row.group ? (
      <button
        className="report-group flow-concept"
        aria-expanded={expanded.includes(row.group)}
        onClick={() => toggle(row.group!)}
      >
        {expanded.includes(row.group) ? (
          <ChevronDown size={14} />
        ) : (
          <ChevronRight size={14} />
        )}{" "}
        {content}
      </button>
    ) : (
      <span
        className={`flow-concept ${row.detail ? "report-child" : "flow-main"} ${row.total ? "report-total" : ""} flow-${row.id}`}
      >
        {content}
      </span>
    );
  };
  return (
    <section className="financial-report">
      <div className="page-title report-heading">
        <h1>{cashFlow ? "Flujo de efectivo" : "Edo Resultados"}</h1>
        {!cashFlow && (
          <div
            className="segmented"
            role="tablist"
            aria-label="Vista del estado de resultados"
          >
            {[
              ["Panel", LayoutDashboard],
              ["Números", ListOrdered],
              ["ER", Table2],
            ].map(([label, Icon]) => {
              const TabIcon = Icon as typeof LayoutDashboard;
              return (
                <button
                  key={String(label)}
                  role="tab"
                  aria-selected={view === label}
                  className={view === label ? "active" : ""}
                  onClick={() => setView(String(label))}
                >
                  <TabIcon size={15} />
                  {String(label)}
                </button>
              );
            })}
          </div>
        )}
      </div>
      <PeriodPicker state={p} compact />
      {cashFlow ? (
        <>
          <div className="report-cards flow-cards">
            <Metric label="Saldo inicial" value={flow.initial} tone="teal" />
            <Metric
              label="Utilidad neta"
              value={flow.complete ? flow.profit : null}
              tone="green"
            />
            <Metric
              label="Flujo de operación"
              value={flow.complete ? flow.operation : null}
              tone="rose"
            />
            <Metric
              label="Flujo de inversión"
              value={flow.investment}
              tone="amber"
            />
            <Metric label="Flujo de capital" value={flow.capital} tone="blue" />
            <Metric label="Saldo periodo" value={flow.period} tone="green" />
            <Metric label="Saldo final" value={flow.final} tone="dark" />
          </div>
          {!flow.complete && (
            <p role="status" className="report-note">
              Completa los costos de las ventas para conciliar la utilidad neta
              y el flujo de operación.
            </p>
          )}
          <Card className="report-table">
            <DataTable
              rows={flowRows}
              rowId={(r) => r.id}
              columns={[
                { ...columns[0], render: flowConcept },
                {
                  id: "amount",
                  label: "Importe",
                  value: (r) => r.amount,
                  render: (r) => (
                    <strong
                      className={
                        r.amount < 0 ? "negative" : r.total ? "positive" : ""
                      }
                    >
                      {!flow.complete &&
                      [
                        "profit",
                        "operation",
                        "collections",
                        "payments",
                      ].includes(r.id)
                        ? "—"
                        : cashMoney(r.amount)}
                    </strong>
                  ),
                },
              ]}
            />
          </Card>
          <p className="report-note">
            Saldo periodo = utilidad neta + flujo de operación + flujo de
            inversión + flujo de capital. Saldo final = saldo inicial + saldo
            periodo. Cobranza ajusta las ventas a lo efectivamente cobrado;
            Pagos ajusta los costos y gastos a lo efectivamente pagado. IVA,
            ISR, inversión y capital aparecen en cero porque no tienen
            movimientos registrados.
          </p>
        </>
      ) : (
        <>
          {!valid && (
            <p role="status" className="report-note">
              Hay {report.missingCosts} ventas sin costo de compra válido; las
              utilidades están pendientes de completar.
            </p>
          )}
          {view !== "ER" && (
            <div className="report-cards">
              {(
                [
                  ["Ingresos", report.revenue, prior.revenue, "blue"],
                  ["Costo de ventas", report.cost, prior.cost, "amber"],
                  [
                    "Gastos de operación",
                    report.expense,
                    prior.expense,
                    "rose",
                  ],
                ] as const
              ).map(([label, value, previous, tone], index) => (
                <Metric
                  key={label}
                  label={label}
                  value={value}
                  tone={tone}
                  detail={
                    view === "Panel" ? (
                      <>
                        <Change
                          current={value}
                          previous={previous}
                          expense={index > 0}
                        />{" "}
                        <span>contra el periodo anterior</span>
                      </>
                    ) : undefined
                  }
                />
              ))}
            </div>
          )}
          {view === "Panel" && (
            <>
              <div className="two-cols report-charts">
                <Card>
                  <div className="section-heading">
                    <h2>Ingresos por mes</h2>
                    <small className="muted">
                      Últimos 6 meses al {p.period.end}
                    </small>
                  </div>
                  <Trend
                    data={monthly}
                    keys={["Ingresos"]}
                    currency
                    colors={["#2455dc"]}
                  />
                </Card>
                <Card>
                  <div className="section-heading">
                    <h2>Costos y gastos por mes</h2>
                    <small className="muted">Últimos 6 meses</small>
                  </div>
                  <Bars data={monthly} colors={["#f59e0b", "#f43f5e"]} />
                </Card>
              </div>
              <div className="report-cards">
                {(
                  [
                    ["Utilidad bruta", report.gross],
                    ["Utilidad operativa", report.operating],
                    ["Utilidad neta registrada", report.net],
                  ] as const
                ).map(([label, value]) => (
                  <Metric
                    key={label}
                    label={label}
                    value={valid ? value : null}
                    tone="green"
                    detail={
                      valid
                        ? `${percent(value, report.revenue).toFixed(1)}% sobre ingresos`
                        : "Costo pendiente"
                    }
                  />
                ))}
              </div>
            </>
          )}
          {view === "Números" && (
            <div className="report-cards report-breakdowns">
              <BreakdownCard
                title="Ingresos"
                rows={report.income}
                total={report.revenue}
                tone="blue"
              />
              <BreakdownCard
                title="Costo de ventas"
                rows={report.costs}
                total={report.cost}
                tone="amber"
              />
              <BreakdownCard
                title="Gastos de operación"
                rows={report.expenses}
                total={report.expense}
                tone="rose"
              />
            </div>
          )}
          {view === "ER" && (
            <Card className="report-table">
              <DataTable
                rows={statementRows}
                columns={columns}
                rowId={(r) => r.id}
                pageSize={100}
              />
            </Card>
          )}
          <p className="report-note">
            Ventas por fecha de venta, incluidas las pendientes de cobro.
            Compras y gastos de embarque proporcionales a los kilos vendidos;
            otros costos y gastos según los registros del periodo. No se han
            registrado impuestos ni gastos financieros. Comparativo:{" "}
            {priorPeriod.start} — {priorPeriod.end}.
          </p>
        </>
      )}
    </section>
  );
}
