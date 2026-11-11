"use client";
import { useState } from "react";
import { Plus, Download, Search } from "lucide-react";
import { Card, Kpi, Badge, Table, Modal, Empty } from "./ui";
import { PeriodPicker, usePeriod, within } from "./period-picker";
import { useStore } from "@/lib/store";
import {
  clients,
  suppliers,
  shipments,
  cost,
  saleTotal,
  money,
  number,
  date,
  clientName,
  shipmentName,
  TODAY,
  type Shipment,
  type Contact,
} from "@/data";
export function Shipments() {
  const p = usePeriod(),
    store = useStore(),
    [selected, setSelected] = useState<Shipment | null>(null),
    [q, setQ] = useState("");
  const rows = shipments.filter(
    (s) =>
      (within(s.date, p.period) ||
        store.sales.some(
          (v) => v.shipment === s.id && within(v.date, p.period),
        )) &&
      s.name.toLowerCase().includes(q.toLowerCase()),
  );
  const total = (id: string) =>
      store.sales
        .filter((v) => v.shipment === id && within(v.date, p.period))
        .reduce((a, v) => a + saleTotal(v), 0),
    revenue = rows.reduce((a, s) => a + total(s.id), 0),
    profit = revenue - rows.reduce((a, s) => a + cost(s), 0);
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
          label="Utilidad"
          value={money(profit)}
          detail={`${revenue ? ((profit / revenue) * 100).toFixed(1) : 0}% margen`}
        />
      </div>
      <Card>
        <div className="section-heading">
          <h2>Liquidaciones</h2>
          <input
            placeholder="Buscar embarque…"
            aria-label="Buscar embarque"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <Table
          heads={[
            "Embarque",
            "Proveedor / origen",
            "Producto",
            "Fecha",
            "Kg comprados",
            "Kg vendidos",
            "Efectivo",
            "Crédito",
            "Venta total",
            "Gastos",
            "Resultado",
          ]}
        >
          {rows.map((s) => {
            const vs = store.sales.filter(
              (v) => v.shipment === s.id && within(v.date, p.period),
            );
            return (
              <tr key={s.id}>
                <td>
                  <button className="text-link" onClick={() => setSelected(s)}>
                    {s.name}
                  </button>
                </td>
                <td>
                  {suppliers.find((p) => p.id === s.supplier)?.name}
                  <small>{s.origin}</small>
                </td>
                <td>
                  <Badge>{s.product}</Badge>
                </td>
                <td>{date(s.date)}</td>
                <td>{number(s.kg)}</td>
                <td>{number(vs.reduce((a, v) => a + v.kg, 0))}</td>
                <td>
                  {money(
                    vs
                      .filter((v) => v.cash)
                      .reduce((a, v) => a + saleTotal(v), 0),
                  )}
                </td>
                <td>
                  {money(
                    vs
                      .filter((v) => !v.cash)
                      .reduce((a, v) => a + saleTotal(v), 0),
                  )}
                </td>
                <td>{money(total(s.id))}</td>
                <td>{money(cost(s))}</td>
                <td
                  className={
                    total(s.id) - cost(s) >= 0 ? "positive" : "negative"
                  }
                >
                  {money(total(s.id) - cost(s))}
                </td>
              </tr>
            );
          })}
        </Table>
        {!rows.length && <Empty />}
      </Card>
      {selected && (
        <Modal
          title={"Embarque " + selected.name}
          onClose={() => setSelected(null)}
        >
          <div className="detail-summary">
            <Badge>{selected.product}</Badge>
            <span>
              Remisión {selected.id.toUpperCase()} · {selected.origin} ·{" "}
              {date(selected.date)}
            </span>
          </div>
          <Table heads={["Tamaño", "Bultos (25 kg)", "Kilos", "Precio compra"]}>
            {["GDE", "MED", "PP", "CH"].map((t) => (
              <tr key={t}>
                <td>{t}</td>
                <td>{selected.kg / 100}</td>
                <td>{number(selected.kg / 4)}</td>
                <td>{money(selected.purchase)}</td>
              </tr>
            ))}
          </Table>
          <h3>Ventas</h3>
          <Table heads={["Cliente", "Kilos", "Importe", "Pago"]}>
            {store.sales
              .filter((v) => v.shipment === selected.id)
              .map((v) => (
                <tr key={v.id}>
                  <td>{clientName(v.client)}</td>
                  <td>{number(v.kg)}</td>
                  <td>{money(saleTotal(v))}</td>
                  <td>{v.cash ? "Efectivo" : "Crédito"}</td>
                </tr>
              ))}
          </Table>
          <h3>Gastos</h3>
          {Object.entries({
            Compra: selected.kg * selected.purchase,
            Flete: selected.freight,
            Descarga: selected.unloading,
            Báscula: selected.scale,
            Maniobra: selected.handling,
          }).map(([k, v]) => (
            <div key={k} className="ledger-line">
              <span>{k}</span>
              <strong>{money(v)}</strong>
            </div>
          ))}
          <div className="total-line">
            <span>Resultado</span>
            <strong>{money(total(selected.id) - cost(selected))}</strong>
          </div>
        </Modal>
      )}
    </>
  );
}
export function Cash() {
  const p = usePeriod(),
    store = useStore(),
    [q, setQ] = useState(""),
    [shipment, setShipment] = useState(""),
    [client, setClient] = useState(""),
    [payment, setPayment] = useState(""),
    [add, setAdd] = useState(false),
    [error, setError] = useState("");
  const rows = store.sales.filter(
    (v) =>
      within(v.date, p.period) &&
      (!shipment || v.shipment === shipment) &&
      (!client || v.client === client) &&
      (!payment || v.cash === (payment === "Efectivo")) &&
      `${clientName(v.client)} ${shipmentName(v.shipment)}`
        .toLowerCase()
        .includes(q.toLowerCase()),
  );
  const total = rows.reduce((a, v) => a + saleTotal(v), 0),
    cash = rows.filter((v) => v.cash).reduce((a, v) => a + saleTotal(v), 0);
  function exportCsv() {
    const csv = [
      [
        "Fecha",
        "Embarque",
        "Producto",
        "Bultos",
        "Cliente",
        "Kilos",
        "Precio",
        "Efectivo",
        "Crédito",
      ],
      ...rows.map((v) => [
        v.date,
        shipmentName(v.shipment),
        v.product,
        v.kg / 25,
        clientName(v.client),
        v.kg,
        v.price,
        v.cash ? saleTotal(v) : 0,
        v.cash ? 0 : saleTotal(v),
      ]),
    ]
      .map((r) =>
        r
          .map(
            (c) =>
              '"' +
              String(c)
                .replace(/^[=+@-]/, "'")
                .replaceAll('"', '""') +
              '"',
          )
          .join(","),
      )
      .join("\r\n");
    const url = URL.createObjectURL(
      new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "kampo-caja.csv";
    a.click();
    URL.revokeObjectURL(url);
  }
  return (
    <>
      <div className="page-title">
        <h1>Control de caja</h1>
        <button className="primary" onClick={() => setAdd(true)}>
          <Plus size={16} /> Registrar venta
        </button>
      </div>
      <PeriodPicker state={p} />
      <div className="kpis three">
        <Kpi
          label="Kilos vendidos"
          value={number(rows.reduce((a, v) => a + v.kg, 0))}
        />
        <Kpi label="Ventas" value={money(total)} />
        <Card>
          <div className="kpi-label">Efectivo / Crédito</div>
          <div className="payment-bar">
            <i style={{ width: `${total ? (cash / total) * 100 : 0}%` }} />
          </div>
          <div className="flex justify-between text-sm">
            <span>{money(cash)}</span>
            <span>{money(total - cash)}</span>
          </div>
        </Card>
      </div>
      <Card>
        <div className="toolbar">
          <div className="search">
            <Search size={16} />
            <input
              placeholder="Buscar…"
              aria-label="Buscar ventas"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <select
            aria-label="Embarque"
            value={shipment}
            onChange={(e) => setShipment(e.target.value)}
          >
            <option value="">Todos los embarques</option>
            {shipments.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <select
            aria-label="Cliente"
            value={client}
            onChange={(e) => setClient(e.target.value)}
          >
            <option value="">Todos los clientes</option>
            <option value="diversos">Diversos</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <select
            aria-label="Forma de pago"
            value={payment}
            onChange={(e) => setPayment(e.target.value)}
          >
            <option value="">Todas las formas</option>
            <option>Efectivo</option>
            <option>Crédito</option>
          </select>
          <button className="secondary" onClick={exportCsv}>
            <Download size={16} /> CSV
          </button>
        </div>
        <Table
          heads={[
            "Fecha",
            "Embarque",
            "Producto",
            "Bultos",
            "Cliente",
            "Kilos",
            "Precio",
            "Efectivo",
            "Crédito",
          ]}
        >
          {rows.map((v) => (
            <tr key={v.id}>
              <td>{date(v.date)}</td>
              <td>{shipmentName(v.shipment)}</td>
              <td>
                <Badge>{v.product}</Badge>
              </td>
              <td>{number(v.kg / 25)}</td>
              <td>{clientName(v.client)}</td>
              <td>{number(v.kg)}</td>
              <td>{money(v.price)}</td>
              <td>{v.cash ? money(saleTotal(v)) : "—"}</td>
              <td>{!v.cash ? money(saleTotal(v)) : "—"}</td>
            </tr>
          ))}
        </Table>
        {!rows.length && <Empty />}
      </Card>
      {add && (
        <Modal title="Registrar venta" onClose={() => setAdd(false)}>
          <form
            className="form-grid"
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget),
                s = shipments.find((s) => s.id === f.get("shipment"))!;
              const kg = Number(f.get("kg")),
                price = Number(f.get("price"));
              if (
                !Number.isFinite(kg) ||
                !Number.isFinite(price) ||
                kg <= 0 ||
                price <= 0
              ) {
                setError("Revisa kilos y precio.");
                return;
              }
              store.setSales((v) => [
                ...v,
                {
                  id: crypto.randomUUID(),
                  shipment: s.id,
                  client: String(f.get("client")),
                  date: String(f.get("date")),
                  product: s.product,
                  kg,
                  price,
                  cash: f.get("payment") === "Efectivo",
                },
              ]);
              setAdd(false);
            }}
          >
            <label>
              Embarque
              <select name="shipment">
                {shipments
                  .slice()
                  .reverse()
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} · {s.product}
                    </option>
                  ))}
              </select>
            </label>
            <label>
              Cliente
              <select name="client">
                <option value="diversos">Diversos</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Fecha
              <input name="date" type="date" defaultValue={TODAY} required />
            </label>
            <label>
              Kilos
              <input name="kg" type="number" min="0.01" step="0.01" required />
            </label>
            <label>
              Precio por kilo
              <input
                name="price"
                type="number"
                min="0.01"
                step="0.01"
                required
              />
            </label>
            <label>
              Pago
              <select name="payment">
                <option>Efectivo</option>
                <option>Crédito</option>
              </select>
            </label>
            {error && <p role="alert">{error}</p>}
            <button className="primary">Guardar venta</button>
          </form>
        </Modal>
      )}
    </>
  );
}
export function Balances({ supplier = false }: { supplier?: boolean }) {
  const store = useStore(),
    [selected, setSelected] = useState<Contact | null>(null),
    [q, setQ] = useState(""),
    [kind, setKind] = useState(""),
    [error, setError] = useState("");
  const contacts = supplier ? suppliers : clients,
    balance = (id: string) =>
      store.movements
        .filter((m) => m.contact === id)
        .reduce((a, m) => a + m.charge - m.payment, 0),
    rows = contacts
      .filter((c) => c.name.toLowerCase().includes(q.toLowerCase()))
      .sort((a, b) => balance(b.id) - balance(a.id));
  const ledger = store.movements
    .filter((m) => m.contact === selected?.id)
    .sort((a, b) => a.date.localeCompare(b.date));
  return (
    <>
      <div className="page-title">
        <h1>Saldo {supplier ? "proveedores" : "clientes"}</h1>
      </div>
      <div className="kpis three">
        <Kpi
          label={supplier ? "Total por pagar" : "Total por cobrar"}
          value={money(contacts.reduce((a, c) => a + balance(c.id), 0))}
        />
        <Kpi
          label={supplier ? "Proveedores" : "Clientes"}
          value={number(contacts.length)}
        />
        <Kpi
          label="Con saldo pendiente"
          value={number(contacts.filter((c) => balance(c.id) > 0).length)}
        />
      </div>
      <Card>
        <div className="section-heading">
          <h2>Estado de cuentas</h2>
          <input
            aria-label="Buscar contacto"
            placeholder="Buscar nombre…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <Table
          heads={[
            supplier ? "Proveedor" : "Cliente",
            "Plaza",
            "Movimientos",
            "Saldo",
            "",
          ]}
        >
          {rows.map((c) => (
            <tr key={c.id}>
              <td className="font-semibold">{c.name}</td>
              <td>{c.city}</td>
              <td>
                {store.movements.filter((m) => m.contact === c.id).length}
              </td>
              <td className="font-semibold">{money(balance(c.id))}</td>
              <td>
                <button
                  className="text-link"
                  onClick={() => {
                    setSelected(c);
                    setKind("");
                  }}
                >
                  Ver estado →
                </button>
              </td>
            </tr>
          ))}
        </Table>
        {!rows.length && <Empty />}
      </Card>
      {selected && (
        <Modal title={selected.name} onClose={() => setSelected(null)}>
          <div className="total-line">
            <span>Saldo actual</span>
            <strong>{money(balance(selected.id))}</strong>
          </div>
          <div className="toolbar">
            <button className="secondary" onClick={() => setKind("cargo")}>
              + Registrar cargo
            </button>
            <button className="primary" onClick={() => setKind("abono")}>
              + Registrar abono
            </button>
          </div>
          {kind && (
            <form
              className="form-grid"
              onSubmit={(e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget),
                  amount = Number(f.get("amount"));
                if (!Number.isFinite(amount) || amount <= 0) {
                  setError("Ingresa un importe válido");
                  return;
                }
                store.setMovements((m) => [
                  ...m,
                  {
                    id: crypto.randomUUID(),
                    contact: selected.id,
                    date: String(f.get("date")),
                    charge: kind === "cargo" ? amount : 0,
                    payment: kind === "abono" ? amount : 0,
                    method: String(f.get("method")),
                    note: String(f.get("note")),
                  },
                ]);
                setKind("");
                setError("");
              }}
            >
              <label>
                Importe de {kind}
                <input
                  autoFocus
                  name="amount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  required
                />
              </label>
              <label>
                Fecha
                <input name="date" type="date" defaultValue={TODAY} required />
              </label>
              <label>
                Forma de pago
                <select name="method">
                  <option>Transferencia</option>
                  <option>Efectivo</option>
                  <option>Crédito</option>
                </select>
              </label>
              <label>
                Observaciones
                <input name="note" required />
              </label>
              {error && <p role="alert">{error}</p>}
              <button className="primary">Guardar {kind}</button>
            </form>
          )}
          <Table
            heads={[
              "Fecha",
              ...(supplier ? ["Entrada / factura"] : []),
              "Importe",
              "Abonos",
              "Saldo",
              "Forma de pago",
              "Observaciones",
            ]}
          >
            {ledger.map((m, index) => {
              const accumulated = ledger
                .slice(0, index + 1)
                .reduce((a, x) => a + x.charge - x.payment, 0);
              return (
                <tr key={m.id}>
                  <td>{date(m.date)}</td>
                  {supplier && <td>{m.id.slice(0, 8)}</td>}
                  <td>{m.charge ? money(m.charge) : "—"}</td>
                  <td>{m.payment ? money(m.payment) : "—"}</td>
                  <td>{money(accumulated)}</td>
                  <td>{m.method}</td>
                  <td>{m.note}</td>
                </tr>
              );
            })}
          </Table>
        </Modal>
      )}
    </>
  );
}
