"use client";
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useStore } from "@/lib/store";
import {
  clients,
  suppliers,
  cost,
  purchaseCost,
  saleTotal,
  money,
  number,
  date,
  clientName,
  purchaseLabels,
  shortOrderId,
  saleProfitability,
  type Shipment,
  type Sale,
} from "@/data";
import { Kpi, Badge, Modal } from "./ui";
import { PeriodPicker, usePeriod, within, compactDate } from "./period-picker";
import { DataTable, type Column } from "./data-table";
import { cashMoney } from "@/data/cash";
// Display names for demo aliases; source contacts and account IDs stay intact.
const demoNames: Record<string, string> = {
  Abarrey: "Carlos Ramírez",
  "Agro/Mario Obregon": "Mario Obregón",
  Alvarez: "Luis Álvarez",
  Bombon: "Roberto García",
  Celestino: "Celestino López",
  Cervantes: "José Cervantes",
  Chato: "Javier Torres",
  Cobian: "Miguel Cobián",
  "Don Jose Hin": "José Hin",
  "Santa Fe de Camargo": "Pedro Campos",
  "Hnos. Márquez": "Alfredo Márquez",
  "Alfonso Hdez": "Alfonso Hernández",
};
const displayName = (name: string) =>
  demoNames[name] ?? name.trim().split(/\s+/).slice(0, 2).join(" ");
const buyerName = (id: string) => displayName(clientName(id));
const expenses = [
  ["purchaseTotal", "Compra"],
  ["freight", "Flete"],
  ["unloading", "Descarga"],
  ["scale", "Báscula 1"],
  ["scale2", "Báscula 2"],
  ["scale3", "Báscula 3"],
  ["handling", "Maniobra"],
] as const;
const monthLabel = (value: string) =>
  new Date(value.slice(0, 7) + "-01T12:00:00").toLocaleDateString("es-MX", {
    month: "short",
    year: "2-digit",
  });

export default function Shipments() {
  const store = useStore(),
    p = usePeriod(),
    [selected, setSelected] = useState<string | null>(null);
  const purchases = new Map(store.shipments.map((s) => [s.id, s]));
  const labels = purchaseLabels(store.shipments);
  const orderIds = new Map(
    store.orders
      .filter((order) => order.saleId)
      .map((order) => [order.saleId, shortOrderId(order.id)]),
  );
  const rows = store.sales
    .filter((sale) => within(sale.date, p.period))
    .map((sale) => ({
      ...sale,
      ...saleProfitability(sale, purchases.get(sale.shipment)),
    }))
    .sort(
      (a, b) =>
        b.date.localeCompare(a.date) ||
        (b.time ?? "").localeCompare(a.time ?? ""),
    );
  type Row = (typeof rows)[number];
  const columns: Column<Row>[] = [
    {
      id: "id",
      label: "Pedido",
      value: (r) => r.id,
      render: (r) => (
        <span title={r.id}>{orderIds.get(r.id) ?? r.id.slice(0, 8)}</span>
      ),
    },
    {
      id: "month",
      label: "Mes",
      value: (r) => r.date.slice(0, 7),
      filterValue: (r) => `${r.date.slice(0, 7)} ${monthLabel(r.date)}`,
      render: (r) => monthLabel(r.date),
    },
    {
      id: "date",
      label: "Fecha",
      value: (r) => `${r.date} ${r.time ?? ""}`,
      render: (r) => (
        <span title={`${r.date} ${r.time ?? ""}`}>{compactDate(r.date)}</span>
      ),
    },
    {
      id: "client",
      label: "Cliente",
      value: (r) => clientName(r.client),
      render: (r) => (
        <span title={clientName(r.client)}>{clientName(r.client)}</span>
      ),
    },
    { id: "product", label: "Producto", value: (r) => r.product },
    {
      id: "purchase",
      label: "Compra",
      value: (r) => labels.get(r.shipment) ?? r.shipment,
      render: (r) => (
        <button
          className="text-link"
          title={labels.get(r.shipment) ?? r.shipment}
          onClick={() => setSelected(r.shipment)}
        >
          {labels.get(r.shipment) ?? "Sin compra"}
        </button>
      ),
    },
    { id: "kg", label: "KG", value: (r) => r.kg, render: (r) => number(r.kg) },
    {
      id: "price",
      label: "Venta/kg",
      value: (r) => r.price,
      render: (r) => cashMoney(r.price),
    },
    {
      id: "purchasePrice",
      label: "Compra/kg",
      value: (r) => r.purchasePrice ?? -1,
      render: (r) =>
        r.purchasePrice === null ? "Sin costo" : cashMoney(r.purchasePrice),
    },
    {
      id: "revenue",
      label: "Venta",
      value: (r) => r.revenue,
      render: (r) => cashMoney(r.revenue),
    },
    {
      id: "expense",
      label: "Gastos",
      value: (r) => r.expense ?? -1,
      render: (r) => (r.expense === null ? "Sin costo" : cashMoney(r.expense)),
    },
    {
      id: "profit",
      label: "Utilidad",
      value: (r) => r.profit ?? -Infinity,
      render: (r) =>
        r.profit === null ? (
          "—"
        ) : (
          <span className={r.profit >= 0 ? "positive" : "negative"}>
            {cashMoney(r.profit)}
          </span>
        ),
    },
    {
      id: "margin",
      label: "Margen %",
      value: (r) => r.margin ?? -Infinity,
      render: (r) => (r.margin === null ? "—" : `${r.margin.toFixed(1)}%`),
    },
  ];
  const current = purchases.get(selected ?? "");
  return (
    <section className="profitability-page">
      <div className="page-title">
        <h1>Rentabilidad pedidos</h1>
      </div>
      <PeriodPicker state={p} compact />
      <DataTable
        rows={rows}
        columns={columns}
        rowId={(r) => r.id}
        initialSort={{ id: "month", direction: "desc" }}
        renderSummary={(visible) => {
          const revenue = visible.reduce((sum, r) => sum + r.revenue, 0);
          const expense = visible.reduce((sum, r) => sum + (r.expense ?? 0), 0);
          const incomplete = visible.some((r) => r.expense === null);
          return (
            <>
              <div className="kpis profitability-kpis">
                <Kpi label="#pedidos" value={number(visible.length)} />
                <Kpi label="$ventas" value={cashMoney(revenue)} />
                <Kpi
                  label="$gastos"
                  value={incomplete ? "—" : cashMoney(expense)}
                />
                <Kpi
                  label="$margen"
                  value={incomplete ? "—" : cashMoney(revenue - expense)}
                />
                <Kpi
                  label="%"
                  value={
                    incomplete
                      ? "—"
                      : `${(revenue ? ((revenue - expense) / revenue) * 100 : 0).toFixed(1)}%`
                  }
                />
              </div>
              <details className="profitability-help muted">
                <summary>Cómo se calcula</summary>
                <p>
                  Una fila por venta. Gastos totales = compra + gastos del
                  embarque, proporcionales a los KG vendidos. Utilidad = venta −
                  gastos totales; margen = utilidad / venta.
                </p>
              </details>
              {incomplete && (
                <p role="status">
                  Hay ventas sin compra válida para calcular sus costos.
                </p>
              )}
            </>
          );
        }}
      />
      {current && (
        <ShipmentEditor
          key={current.id}
          shipment={current}
          onClose={() => setSelected(null)}
        />
      )}
    </section>
  );
}
function ShipmentEditor({
  shipment,
  onClose,
}: {
  shipment: Shipment;
  onClose: () => void;
}) {
  const store = useStore(),
    [draft, setDraft] = useState({
      ...shipment,
      purchaseTotal: purchaseCost(shipment),
      scale2: shipment.scale2 ?? 0,
      scale3: shipment.scale3 ?? 0,
    }),
    [sales, setSales] = useState(
      store.sales.filter((v) => v.shipment === shipment.id),
    ),
    [error, setError] = useState("");
  const revenue = sales.reduce((a, v) => a + saleTotal(v), 0),
    totalCost = cost(draft);
  function update(id: string, patch: Partial<Sale>) {
    setSales((all) => all.map((v) => (v.id === id ? { ...v, ...patch } : v)));
  }
  function save(e: React.FormEvent) {
    e.preventDefault();
    if (
      expenses.some(
        ([key]) => !Number.isFinite(draft[key]) || draft[key] < 0,
      ) ||
      sales.some(
        (v) =>
          !Number.isFinite(v.kg) ||
          v.kg <= 0 ||
          !Number.isFinite(v.price) ||
          v.price <= 0 ||
          !v.date,
      )
    ) {
      setError("Revisa los importes, kilos y fechas antes de guardar.");
      return;
    }
    store.setShipments((all) =>
      all.map((s) => (s.id === draft.id ? draft : s)),
    );
    store.setSales((all) => [
      ...all.filter((v) => v.shipment !== draft.id),
      ...sales,
    ]);
    onClose();
  }
  return (
    <Modal title={"Ajustar embarque " + shipment.name} onClose={onClose}>
      <form onSubmit={save}>
        <div className="shipment-parties">
          <div>
            <h3>Proveedor</h3>
            <p>
              {displayName(
                suppliers.find((p) => p.id === shipment.supplier)?.name ?? "",
              )}
            </p>
          </div>
          <div>
            <h3>Cliente</h3>
            <p>
              {Array.from(new Set(sales.map((v) => buyerName(v.client)))).join(
                ", ",
              ) || "Sin ventas registradas"}
            </p>
          </div>
        </div>
        <div className="detail-summary">
          <Badge>{shipment.product}</Badge>
          <span>
            {number(shipment.kg)} kg comprados · {date(shipment.date)} ·
            Remisión {shipment.id.toUpperCase()}
          </span>
        </div>
        <div className="section-heading">
          <h2>Ventas a clientes</h2>
          <button
            type="button"
            className="secondary"
            onClick={() =>
              setSales((all) => [
                ...all,
                {
                  id: crypto.randomUUID(),
                  shipment: shipment.id,
                  client: clients[0].id,
                  date: shipment.date,
                  product: shipment.product,
                  kg: 25,
                  price: shipment.purchase + 2.8,
                  cash: false,
                },
              ])
            }
          >
            <Plus size={15} /> Agregar venta
          </button>
        </div>
        <div className="sale-edit-list">
          {sales.map((v, i) => (
            <fieldset key={v.id} className="sale-edit">
              <legend>Venta {i + 1}</legend>
              <label>
                Cliente
                <select
                  aria-label={`Cliente venta ${i + 1}`}
                  value={v.client}
                  onChange={(e) => update(v.id, { client: e.target.value })}
                >
                  <option value="diversos">Diversos</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {displayName(c.name)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Fecha
                <input
                  aria-label={`Fecha venta ${i + 1}`}
                  type="date"
                  required
                  value={v.date}
                  onChange={(e) => update(v.id, { date: e.target.value })}
                />
              </label>
              <label>
                Kilos
                <input
                  aria-label={`Kilos venta ${i + 1}`}
                  type="number"
                  min="0.01"
                  step="0.01"
                  required
                  value={Number.isNaN(v.kg) ? "" : v.kg}
                  onChange={(e) => update(v.id, { kg: e.target.valueAsNumber })}
                />
              </label>
              <label>
                Precio / kg
                <input
                  aria-label={`Precio venta ${i + 1}`}
                  type="number"
                  min="0.01"
                  step="0.01"
                  required
                  value={Number.isNaN(v.price) ? "" : v.price}
                  onChange={(e) =>
                    update(v.id, { price: e.target.valueAsNumber })
                  }
                />
              </label>
              <label>
                Forma de pago
                <select
                  aria-label={`Pago venta ${i + 1}`}
                  value={v.cash ? "cash" : "credit"}
                  onChange={(e) =>
                    update(v.id, { cash: e.target.value === "cash" })
                  }
                >
                  <option value="cash">Efectivo</option>
                  <option value="credit">Crédito</option>
                </select>
              </label>
              <div className="sale-subtotal">
                <strong>{money(saleTotal(v))}</strong>
                <button
                  type="button"
                  aria-label={`Quitar venta ${i + 1}`}
                  onClick={() =>
                    setSales((all) => all.filter((s) => s.id !== v.id))
                  }
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </fieldset>
          ))}
        </div>
        {!sales.length && (
          <p className="empty">Agrega la primera venta del embarque.</p>
        )}
        <h2 className="mt-6">Gastos del embarque</h2>
        <div className="expense-grid">
          {expenses.map(([key, label]) => (
            <label key={key}>
              {label}
              <div className="currency-input">
                <span>$</span>
                <input
                  aria-label={label}
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  value={Number.isNaN(draft[key]) ? "" : draft[key]}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, [key]: e.target.valueAsNumber }))
                  }
                />
              </div>
            </label>
          ))}
        </div>
        <div className="shipment-totals">
          <div>
            <small>Ventas</small>
            <strong>{money(revenue)}</strong>
          </div>
          <div>
            <small>Compra + gastos</small>
            <strong>{money(totalCost)}</strong>
          </div>
          <div>
            <small>Utilidad</small>
            <strong className={revenue >= totalCost ? "positive" : "negative"}>
              {money(revenue - totalCost)}
            </strong>
          </div>
        </div>
        {error && (
          <p role="alert" className="negative">
            {error}
          </p>
        )}
        <div className="editor-actions">
          <button type="button" className="secondary" onClick={onClose}>
            Cancelar
          </button>
          <button className="primary">Guardar cambios</button>
        </div>
        <p className="muted text-xs mt-3">
          Los ajustes se reflejan en Control de caja y en la rentabilidad al
          guardar.
        </p>
      </form>
    </Modal>
  );
}
