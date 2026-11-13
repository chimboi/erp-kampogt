"use client";
import { useState } from "react";
import { Plus, Search } from "lucide-react";
import SaleEditor from "./sale-editor";
import CashAccounts from "./cash-accounts";
import InvoiceButton from "./invoice-button";
import AccountSelect from "./account-select";
import CollectionEditor from "./collection-editor";
import CostEditor from "./cost-editor";
import { Card, Modal } from "./ui";
import { DataTable, type Column } from "./data-table";
import { PeriodPicker, usePeriod, within } from "./period-picker";
import DashboardReport from "./dashboard-report";
import { useStore } from "@/lib/store";
import {
  TODAY,
  date,
  clients,
  suppliers,
  number,
  clientName,
  shortOrderId,
  type Sale,
} from "@/data";
import {
  cashMoney,
  cashRows,
  cashSummary,
  operatingCategories,
  costCategories,
  isCost,
  purchaseCostRows,
  type CashRow,
  type CashEntry,
  type CashAccount,
  cashAccount,
} from "@/data/cash";

export default function Dashboard({
  initialDate: selectedDate,
}: {
  initialDate?: string;
}) {
  const p = usePeriod("Día", selectedDate),
    store = useStore();
  const [accountsOpen, setAccountsOpen] = useState(false);
  const [tab, setTab] = useState("Números");
  const [section, setSection] = useState("Ventas");
  const [collections, setCollections] = useState(false);
  const [adding, setAdding] = useState(false);
  const [collectionEditor, setCollectionEditor] = useState<{
    saleId?: string;
  } | null>(null);
  const [costEditor, setCostEditor] = useState(false);
  const [search, setSearch] = useState("");
  const [editor, setEditor] = useState<{
    kind: "Cobro" | "Gasto";
    entry?: CashEntry;
  } | null>(null);
  const [saleEditor, setSaleEditor] = useState<{ sale?: Sale } | null>(null);
  const initialDate =
    p.period.start > TODAY
      ? p.period.start
      : p.period.end > TODAY
        ? TODAY
        : p.period.end;
  const allRows = cashRows(store.sales, store.cashEntries, store.shipments);
  function showDate(value: string) {
    if (!within(value, p.period)) {
      p.setMode("Día");
      p.setAnchor(value);
    }
  }
  function saveSale(sale: Sale) {
    const existing = store.sales.some((row) => row.id === sale.id);
    store.setSales((rows) =>
      existing
        ? rows.map((row) => (row.id === sale.id ? sale : row))
        : [...rows, sale],
    );
    const purchase = store.shipments.find((row) => row.id === sale.shipment);
    const changes = {
      saleId: sale.id,
      client: clientName(sale.client),
      product: sale.product,
      kg: sale.kg,
      price: sale.price,
      date: sale.date,
      time: sale.time,
      paid: sale.paid,
      supplier: purchase?.supplier,
      purchase: purchase?.purchase,
    };
    store.setOrders((rows) => {
      if (rows.some((row) => row.saleId === sale.id))
        return rows.map((row) =>
          row.saleId === sale.id ? { ...row, ...changes } : row,
        );
      if (existing) return rows;
      const next =
        Math.max(
          2000,
          ...rows.map(
            (row) => Number(shortOrderId(row.id).replace(/^P-/, "")) || 0,
          ),
        ) + 1;
      return [
        ...rows,
        { id: `PED-${next}`, ...changes, status: "Pendiente de carga" },
      ];
    });
    showDate(sale.date);
    setSection("Ventas");
    setCollections(false);
    setSearch("");
    setSaleEditor(null);
  }

  const summary = cashSummary(allRows, p.period);
  const rows =
    section === "Costos"
      ? purchaseCostRows(store.shipments, store.cashEntries)
      : allRows.filter((row) =>
          section === "Ventas"
            ? row.kind === (collections ? "Cobro" : "Venta")
            : row.kind === "Gasto" && !isCost(row.category),
        );
  const filtered = rows.filter(
    (row) =>
      within(row.date, p.period) &&
      `${row.contact} ${row.description} ${row.category} ${row.purchase ?? ""} ${row.status ?? ""}`
        .toLocaleLowerCase("es")
        .includes(search.toLocaleLowerCase("es")),
  );
  const isSales = section === "Ventas" && !collections;
  const isCosts = section === "Costos";
  const editSale = (row: CashRow) => {
    const sale = store.sales.find((sale) => sale.id === row.saleId);
    if (sale) setSaleEditor({ sale });
  };
  const receivedAccounts = (row: CashRow) => {
    if (row.kind !== "Venta")
      return row.amount > 0 ? cashAccount(row) : "Sin pago";
    const accounts = new Set<CashAccount>();
    if (row.amount > 0) accounts.add(cashAccount(row));
    store.cashEntries
      .filter(
        (entry) =>
          entry.kind === "Cobro" &&
          entry.saleId === row.saleId &&
          entry.amount > 0,
      )
      .forEach((entry) => accounts.add(cashAccount(entry)));
    return [...accounts].sort().join(" + ") || "Sin cobro";
  };
  const columns: Column<CashRow>[] = [
    {
      id: "date",
      label: "Fecha",
      value: (row) => `${row.date} ${row.time}`,
      filterValue: (row) => `${row.date} ${date(row.date)} ${row.time}`,
      render: (row) => (
        <span className="nowrap cash-date">
          {date(row.date)}
          {row.time ? ` · ${row.time}` : ""}
        </span>
      ),
    },
    {
      id: "contact",
      label:
        isSales || section === "Ventas"
          ? "Cliente"
          : "Proveedor / beneficiario",
      value: (row) => row.contact,
      render: (row) => {
        const entry = store.cashEntries.find((entry) => entry.id === row.id);
        return isSales ? (
          <button
            className="text-link"
            title="Editar venta"
            onClick={() => editSale(row)}
          >
            {row.contact}
          </button>
        ) : entry &&
          !entry.saleId &&
          !entry.orderId &&
          row.category !== "Compras" ? (
          <button
            className="text-link"
            title="Editar movimiento"
            onClick={() => setEditor({ kind: entry.kind, entry })}
          >
            {row.contact}
          </button>
        ) : (
          row.contact
        );
      },
    },
    {
      id: "category",
      label: isSales ? "Producto" : "Categoría",
      value: (row) => row.category,
    },
    ...(isSales || isCosts
      ? [
          {
            id: "purchase",
            label: "Compra de origen",
            value: (row: CashRow) => row.purchase ?? "",
            render: (row: CashRow) => row.purchase ?? "—",
          },
        ]
      : []),
    ...(isSales || isCosts
      ? [
          {
            id: "kg",
            label: "KG",
            value: (row: CashRow) => row.kg ?? -1,
            render: (row: CashRow) =>
              row.kg === undefined ? "—" : number(row.kg),
          },
          {
            id: "price",
            label: isSales ? "Precio/kg" : "Costo/kg",
            value: (row: CashRow) => row.price ?? -1,
            render: (row: CashRow) =>
              row.price === undefined ? "—" : cashMoney(row.price),
          },
          {
            id: "total",
            label: isSales ? "Venta total" : "Total",
            value: (row: CashRow) => row.total ?? row.amount,
            render: (row: CashRow) => cashMoney(row.total ?? row.amount),
          },
          {
            id: "status",
            label: "Status",
            value: (row: CashRow) => row.status ?? "Pagado",
            render: (row: CashRow) =>
              !isSales ? (
                (row.status ?? "Pagado")
              ) : (
                <div className="sale-collect-cell">
                  <span className={`payment-${row.status?.toLowerCase()}`}>
                    {row.status}
                  </span>
                  {(row.credit ?? 0) > 0 && (
                    <button
                      className="text-link"
                      onClick={() =>
                        setCollectionEditor({ saleId: row.saleId })
                      }
                    >
                      Cobrar
                    </button>
                  )}
                </div>
              ),
          },
        ]
      : [
          {
            id: "concept",
            label: "Concepto",
            value: (row: CashRow) => row.description,
          },
        ]),
    {
      id: "account",
      label: "Cuenta",
      value: receivedAccounts,
      render: (row) => {
        const linkedCollections =
          row.kind === "Venta" &&
          store.cashEntries.some(
            (entry) =>
              entry.kind === "Cobro" &&
              entry.saleId === row.saleId &&
              entry.amount > 0,
          );
        if (linkedCollections || row.amount <= 0)
          return (
            <span
              title={
                linkedCollections
                  ? "Cuentas de los importes recibidos. Edita la cuenta de cada cobro en Cobros."
                  : undefined
              }
            >
              {receivedAccounts(row)}
            </span>
          );
        return (
          <select
            className="cell-select"
            disabled={
              row.kind !== "Venta" &&
              !store.cashEntries.some((entry) => entry.id === row.id)
            }
            aria-label={`Cuenta ${row.id}`}
            value={cashAccount(row)}
            onChange={(event) => {
              const account = event.target.value as CashAccount;
              if (row.kind === "Venta")
                store.setSales((sales) =>
                  sales.map((sale) =>
                    sale.id === row.saleId ? { ...sale, account } : sale,
                  ),
                );
              else
                store.setCashEntries((entries) =>
                  entries.map((entry) =>
                    entry.id === row.id ? { ...entry, account } : entry,
                  ),
                );
            }}
          >
            <option>Efectivo</option>
            <option>Banorte</option>
          </select>
        );
      },
    },
    {
      id: "paid",
      label: section === "Ventas" ? "Recibido" : "Pagado",
      value: (row) => row.amount,
      render: (row) => (
        <span className={`cash-amount ${section === "Ventas" ? "in" : "out"}`}>
          {cashMoney(
            isSales ? (row.total ?? 0) - (row.credit ?? 0) : row.amount,
          )}
        </span>
      ),
    },
    ...(isSales
      ? [
          {
            id: "credit",
            label: "Por cobrar",
            value: (row: CashRow) => row.credit ?? 0,
            render: (row: CashRow) => cashMoney(row.credit ?? 0),
          },
        ]
      : []),
    ...(isSales
      ? [
          {
            id: "invoice",
            label: "Factura",
            value: (row: CashRow) =>
              (row.credit ?? 0) > 0 ? "Pendiente de cobro" : "Facturar",
            render: (row: CashRow) => {
              const sale = store.sales.find((item) => item.id === row.saleId);
              return sale ? <InvoiceButton sale={sale} /> : null;
            },
          },
        ]
      : []),
  ];
  return (
    <>
      <div className="cash-page-controls">
        <div
          className="cash-tabs"
          role="tablist"
          aria-label="Vista de Control de caja"
        >
          {["Números", "Reporte"].map((name) => (
            <button
              key={name}
              role="tab"
              aria-selected={tab === name}
              className={tab === name ? "active" : ""}
              onClick={() => setTab(name)}
            >
              {name}
            </button>
          ))}
        </div>
        <div className="cash-actions">
          <button className="secondary" onClick={() => setAccountsOpen(true)}>
            Cuentas
          </button>
          <PeriodPicker state={p} />
        </div>
      </div>
      {tab === "Números" ? (
        <>
          <div className="cash-scorecards">
            <Card>
              <span className="cash-score-label">Saldo inicial</span>
              <strong data-testid="cash-initial">
                {cashMoney(summary.initial)}
              </strong>
              <small>Saldo anterior al {date(p.period.start)}</small>
            </Card>
            <Card className="income-score">
              <span className="cash-score-label">Ingresos</span>
              <strong data-testid="cash-income">
                {cashMoney(summary.income)}
              </strong>
              <div className="income-breakdown">
                <button
                  className={
                    section === "Ventas" && !collections ? "active" : ""
                  }
                  onClick={() => {
                    setSection("Ventas");
                    setCollections(false);
                    setSearch("");
                  }}
                >
                  Ventas <b>{cashMoney(summary.sales)}</b>
                </button>
                <button
                  className={
                    section === "Ventas" && collections ? "active" : ""
                  }
                  onClick={() => {
                    setSection("Ventas");
                    setCollections(true);
                    setSearch("");
                  }}
                >
                  Cobros <b>{cashMoney(summary.collections)}</b>
                </button>
              </div>
            </Card>
            <Card className="expense-score">
              <span className="cash-score-label">Costos y gastos</span>
              <strong data-testid="cash-expenses">
                {cashMoney(summary.expenses)}
              </strong>
              <small>Salidas de caja del periodo</small>
            </Card>
            <Card className="net-score">
              <span className="cash-score-label">Saldo periodo</span>
              <strong data-testid="cash-net">{cashMoney(summary.net)}</strong>
              <small>Ingresos menos costos y gastos</small>
            </Card>
            <Card>
              <span className="cash-score-label">Saldo final</span>
              <strong data-testid="cash-final">
                {cashMoney(summary.final)}
              </strong>
              <small>Saldo inicial + saldo periodo</small>
            </Card>
          </div>

          <Card className="cash-movements">
            <div className="cash-toolbar">
              <div
                className="cash-tabs ledger-tabs"
                role="tablist"
                aria-label="Operación comercial"
              >
                {["Ventas", "Costos", "Gastos"].map((name) => (
                  <button
                    key={name}
                    role="tab"
                    aria-selected={section === name}
                    className={section === name ? "active" : ""}
                    onClick={() => {
                      setSection(name);
                      setCollections(false);
                      setSearch("");
                      setAdding(false);
                    }}
                  >
                    {name}
                  </button>
                ))}
              </div>
              <div className="cash-actions">
                <span className="cash-count">
                  {number(filtered.length)} registros
                </span>
                <label className="cash-search">
                  <Search size={16} />
                  <input
                    aria-label="Buscar movimientos"
                    placeholder="Buscar…"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                  />
                </label>
                {section === "Ventas" && (
                  <button
                    className="secondary"
                    onClick={() => setCollectionEditor({})}
                  >
                    Cobrar pendientes
                  </button>
                )}
                <div className="ledger-add">
                  <button
                    className="cash-add in"
                    aria-label={`Agregar en ${section}`}
                    aria-expanded={adding}
                    onClick={() => {
                      if (section === "Ventas") setAdding(!adding);
                      else if (section === "Costos") setCostEditor(true);
                      else setEditor({ kind: "Gasto" });
                    }}
                  >
                    <Plus size={20} />
                  </button>
                  {adding && section === "Ventas" && (
                    <div className="ledger-add-menu">
                      <button
                        onClick={() => {
                          setSaleEditor({});
                          setAdding(false);
                        }}
                      >
                        Registrar venta
                      </button>
                      <button
                        onClick={() => {
                          setCollectionEditor({});
                          setAdding(false);
                        }}
                      >
                        Registrar cobro
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
            {section === "Ventas" && collections && (
              <div className="collection-caption">
                Cobros de días anteriores{" "}
                <button
                  className="text-link"
                  onClick={() => setCollections(false)}
                >
                  Volver a ventas
                </button>
              </div>
            )}
            <DataTable
              key={`${section}-${collections}-${p.period.start}-${p.period.end}-${search}`}
              rows={filtered}
              columns={columns}
              rowId={(row) => row.id}
              initialSort={{ id: "date", direction: "desc" }}
            />
          </Card>
        </>
      ) : (
        <DashboardReport p={p} />
      )}
      {accountsOpen && (
        <CashAccounts
          rows={allRows}
          period={p.period}
          onClose={() => setAccountsOpen(false)}
        />
      )}
      {collectionEditor && (
        <CollectionEditor
          saleId={collectionEditor.saleId}
          onClose={() => setCollectionEditor(null)}
          onSaved={(value) => {
            setCollectionEditor(null);
            showDate(value);
            setSection("Ventas");
            setCollections(true);
            setSearch("");
          }}
        />
      )}
      {saleEditor && (
        <SaleEditor
          minimumPaid={store.cashEntries
            .filter(
              (entry) =>
                entry.kind === "Cobro" &&
                entry.saleId &&
                entry.saleId === saleEditor.sale?.id,
            )
            .reduce((sum, entry) => sum + entry.amount, 0)}
          sale={saleEditor.sale}
          purchases={store.shipments}
          initialDate={initialDate}
          onClose={() => setSaleEditor(null)}
          onSave={saveSale}
        />
      )}
      {costEditor && (
        <CostEditor
          purchases={store.shipments}
          initialDate={initialDate}
          onClose={() => setCostEditor(false)}
          onSave={(entry, purchase) => {
            if (purchase) store.setShipments((rows) => [...rows, purchase]);
            store.setCashEntries((rows) => [...rows, entry]);
            setCostEditor(false);
            setSection("Costos");
            setSearch("");
            showDate(entry.date);
          }}
        />
      )}
      {editor && (
        <CashEntryEditor
          key={editor.entry?.id ?? editor.kind}
          kind={editor.kind}
          entry={editor.entry}
          initialDate={initialDate}
          onClose={() => setEditor(null)}
          onSave={(entry) => {
            store.setCashEntries((rows) =>
              editor.entry
                ? rows.map((row) => (row.id === entry.id ? entry : row))
                : [...rows, entry],
            );
            setSection(
              entry.kind === "Cobro"
                ? "Ventas"
                : isCost(entry.category)
                  ? "Costos"
                  : "Gastos",
            );
            setCollections(entry.kind === "Cobro");
            setSearch("");
            showDate(entry.date);
            setEditor(null);
          }}
        />
      )}
    </>
  );
}
function CashEntryEditor({
  kind,
  entry,
  initialDate,
  onSave,
  onClose,
}: {
  kind: "Cobro" | "Gasto";
  entry?: CashEntry;
  initialDate: string;
  onSave: (entry: CashEntry) => void;
  onClose: () => void;
}) {
  const [category, setCategory] = useState(
    entry?.category ??
      (kind === "Gasto" ? operatingCategories[0] : "Cobro de días anteriores"),
  );
  const [entryDate, setEntryDate] = useState(entry?.date ?? initialDate);
  const [account, setAccount] = useState<CashAccount>(cashAccount(entry ?? {}));
  const [error, setError] = useState("");
  const previousDate = new Date(
    new Date(entryDate + "T12:00:00Z").getTime() - 86400000,
  )
    .toISOString()
    .slice(0, 10);
  return (
    <Modal
      title={`${entry ? "Editar" : "Registrar"} ${kind.toLowerCase()}`}
      onClose={onClose}
    >
      <form
        className="cash-entry-form"
        onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          const amount = Math.round(Number(form.get("amount")) * 100) / 100;
          const originDate =
            kind === "Cobro" ? String(form.get("originDate")) : undefined;
          if (!Number.isFinite(amount) || amount <= 0) {
            setError("Captura un monto mayor a cero.");
            return;
          }
          if (originDate && originDate >= entryDate) {
            setError(
              "El cobro debe corresponder a una venta de un día anterior.",
            );
            return;
          }
          const clientId =
            kind === "Cobro" ? String(form.get("client")) : undefined;
          const contact = clientId
            ? (clients.find((client) => client.id === clientId)?.name ??
              "Cliente")
            : String(form.get("contact") || "Operación");
          onSave({
            ...entry,
            id: entry?.id ?? `cash-${crypto.randomUUID()}`,
            kind,
            date: entryDate,
            time: String(form.get("time")),
            category,
            contact,
            clientId,
            description: String(form.get("description")).trim(),
            amount,
            account,
            originDate,
          });
        }}
      >
        <div className="cash-form-grid">
          <label>
            Fecha
            <input
              aria-label="Fecha del movimiento"
              type="date"
              required
              value={entryDate}
              onChange={(event) => {
                if (event.target.value) setEntryDate(event.target.value);
              }}
              min="2026-01-01"
            />
          </label>
          <label>
            Hora
            <input
              aria-label="Hora del movimiento"
              type="time"
              required
              name="time"
              defaultValue={entry?.time ?? "12:00"}
            />
          </label>
        </div>
        {kind === "Gasto" ? (
          <>
            <label>
              Categoría
              <select
                aria-label="Categoría del gasto"
                value={category}
                onChange={(event) => setCategory(event.target.value)}
              >
                {Array.from(
                  new Set([
                    ...(entry && isCost(entry.category)
                      ? [
                          ...costCategories.filter(
                            (category) => category !== "Compras",
                          ),
                          "Pago a proveedores",
                        ]
                      : operatingCategories),
                    ...(entry ? [entry.category] : []),
                  ]),
                ).map((name) => (
                  <option key={name}>{name}</option>
                ))}
              </select>
            </label>
            <label>
              {category === "Pago a proveedores" ? "Proveedor" : "Beneficiario"}
              {category === "Pago a proveedores" ? (
                <select
                  name="contact"
                  aria-label="Proveedor del gasto"
                  defaultValue={entry?.contact ?? "Pelon"}
                >
                  {suppliers.map((supplier) => (
                    <option key={supplier.id}>{supplier.name}</option>
                  ))}
                </select>
              ) : (
                <input
                  name="contact"
                  aria-label="Beneficiario"
                  defaultValue={entry?.contact ?? "Operación"}
                />
              )}
            </label>
          </>
        ) : (
          <>
            <label>
              Cliente
              <select
                name="client"
                aria-label="Cliente del cobro"
                required
                defaultValue={entry?.clientId ?? clients[0].id}
              >
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Fecha de la venta original
              <input
                name="originDate"
                aria-label="Fecha de la venta original"
                type="date"
                required
                max={previousDate}
                defaultValue={entry?.originDate ?? previousDate}
              />
            </label>
          </>
        )}
        <label>
          Concepto
          <input
            name="description"
            aria-label="Concepto del movimiento"
            required
            defaultValue={entry?.description ?? ""}
            placeholder={
              kind === "Cobro" ? "Abono a venta anterior" : "Detalle del gasto"
            }
          />
        </label>
        <AccountSelect value={account} onChange={setAccount} />
        <label>
          Monto recibido / pagado
          <input
            aria-label="Monto del movimiento"
            name="amount"
            type="number"
            required
            min="0.01"
            step="0.01"
            defaultValue={entry?.amount}
            placeholder="0.00"
          />
        </label>
        {error && (
          <p role="alert" className="out">
            {error}
          </p>
        )}
        <div className="cash-form-actions">
          <button type="button" className="secondary" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className="primary">
            Guardar {kind.toLowerCase()}
          </button>
        </div>
      </form>
    </Modal>
  );
}
