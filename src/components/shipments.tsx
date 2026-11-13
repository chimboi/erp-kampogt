"use client";
import { useState } from "react";
import { Plus, Trash2, Pencil } from "lucide-react";
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
  type Shipment,
  type Sale,
} from "@/data";
import { Card, Kpi, Badge, Table, Modal, Empty } from "./ui";
import { PeriodPicker, usePeriod, within } from "./period-picker";
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
export default function Shipments() {
  const store = useStore(),
    p = usePeriod(),
    [selected, setSelected] = useState<string | null>(null),
    [q, setQ] = useState("");
  const rows = store.shipments.filter(
    (s) =>
      (within(s.date, p.period) ||
        store.sales.some(
          (v) => v.shipment === s.id && within(v.date, p.period),
        )) &&
      [
        s.name,
        suppliers.find((p) => p.id === s.supplier)?.name,
        ...store.sales
          .filter((v) => v.shipment === s.id)
          .map((v) => buyerName(v.client)),
      ]
        .join(" ")
        .toLowerCase()
        .includes(q.toLowerCase()),
  );
  const total = (id: string) =>
    store.sales
      .filter((v) => v.shipment === id && within(v.date, p.period))
      .reduce((a, v) => a + saleTotal(v), 0);
  const revenue = rows.reduce((a, s) => a + total(s.id), 0),
    expense = rows
      .filter((s) => within(s.date, p.period))
      .reduce((a, s) => a + cost(s), 0);
  const current = store.shipments.find((s) => s.id === selected);
  return (
    <>
      <div className="page-title">
        <h1>Rentabilidad embarques</h1>
      </div>
      <PeriodPicker state={p} />
      <div className="kpis">
        <Kpi label="Embarques" value={number(rows.length)} />
        <Kpi
          label="Kilos comprados"
          value={number(rows.reduce((a, s) => a + s.kg, 0))}
        />
        <Kpi label="Venta total" value={money(revenue)} />
        <Kpi
          label="Utilidad del periodo"
          value={money(revenue - expense)}
          detail={`${revenue ? (((revenue - expense) / revenue) * 100).toFixed(1) : 0}% de margen`}
        />
      </div>
      <Card>
        <div className="section-heading">
          <h2>Liquidaciones</h2>
          <input
            aria-label="Buscar embarque"
            placeholder="Embarque, proveedor o cliente…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <Table
          heads={[
            "Fecha",
            "Embarque",
            "Proveedor",
            "Cliente",
            "Kg comprados",
            "Venta",
            "Efectivo",
            "Crédito",
            "Gastos",
            "Utilidad",
            "",
          ]}
        >
          {rows.map((s) => {
            const sales = store.sales.filter(
                (v) => v.shipment === s.id && within(v.date, p.period),
              ),
              buyers = Array.from(
                new Set(sales.map((v) => buyerName(v.client))),
              ),
              revenue = sales.reduce((a, v) => a + saleTotal(v), 0),
              cash = sales
                .filter((v) => v.cash)
                .reduce((a, v) => a + saleTotal(v), 0);
            return (
              <tr key={s.id}>
                <td>{date(s.date)}</td>
                <td>
                  <button
                    className="text-link"
                    onClick={() => setSelected(s.id)}
                  >
                    {s.name}
                  </button>
                </td>
                <td>
                  {displayName(
                    suppliers.find((supplier) => supplier.id === s.supplier)
                      ?.name ?? "",
                  )}
                </td>
                <td className="buyer-cell">
                  {buyers.map((name) => (
                    <span key={name} className="buyer-name">
                      {name}
                    </span>
                  ))}
                </td>
                <td>{number(s.kg)}</td>
                <td>{money(revenue)}</td>
                <td>{money(cash)}</td>
                <td>{money(revenue - cash)}</td>
                <td>{money(cost(s))}</td>
                <td className={revenue >= cost(s) ? "positive" : "negative"}>
                  {money(revenue - cost(s))}
                </td>
                <td>
                  <button
                    className="secondary"
                    onClick={() => setSelected(s.id)}
                  >
                    <Pencil size={13} /> Ajustar
                  </button>
                </td>
              </tr>
            );
          })}
        </Table>
        {!rows.length && <Empty />}
      </Card>
      {current && (
        <ShipmentEditor
          key={current.id}
          shipment={current}
          onClose={() => setSelected(null)}
        />
      )}
    </>
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
          Los ajustes se reflejan en Control de caja y KPIs al guardar.
        </p>
      </form>
    </Modal>
  );
}
