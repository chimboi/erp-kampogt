"use client";
import { useState } from "react";
import { Card, Kpi, Table, Modal, Empty } from "./ui";
import { useStore } from "@/lib/store";
import {
  clients,
  suppliers,
  money,
  number,
  date,
  TODAY,
  type Contact,
} from "@/data";
export { default as Shipments } from "./shipments";
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
            "Historial",
            "Saldo",
            "",
          ]}
        >
          {rows.map((c) => (
            <tr key={c.id}>
              <td className="font-semibold">{c.name}</td>
              <td>{c.city}</td>
              <td>
                {store.movements.filter((m) => m.contact === c.id).length}{" "}
                movimientos<small>Junio – noviembre 2026</small>
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
          <p className="muted text-sm my-3">
            Historial de demostración · Junio a noviembre de 2026
          </p>
          <div className="history-totals">
            <div>
              <small>{supplier ? "Compras y cargos" : "Ventas y cargos"}</small>
              <strong>{money(ledger.reduce((a, m) => a + m.charge, 0))}</strong>
            </div>
            <div>
              <small>
                {supplier ? "Pagos realizados" : "Abonos recibidos"}
              </small>
              <strong className="positive">
                {money(ledger.reduce((a, m) => a + m.payment, 0))}
              </strong>
            </div>
            <div>
              <small>Movimientos</small>
              <strong>{ledger.length}</strong>
            </div>
          </div>
          <details className="monthly-history">
            <summary>Ver resumen por mes</summary>
            <Table heads={["Mes", "Cargos", "Abonos", "Saldo al cierre"]}>
              {Array.from(new Set(ledger.map((m) => m.date.slice(0, 7))))
                .sort()
                .map((month) => (
                  <tr key={month}>
                    <td>
                      {new Date(month + "-15T12:00:00").toLocaleDateString(
                        "es-MX",
                        { month: "long", year: "numeric" },
                      )}
                    </td>
                    <td>
                      {money(
                        ledger
                          .filter((m) => m.date.startsWith(month))
                          .reduce((a, m) => a + m.charge, 0),
                      )}
                    </td>
                    <td>
                      {money(
                        ledger
                          .filter((m) => m.date.startsWith(month))
                          .reduce((a, m) => a + m.payment, 0),
                      )}
                    </td>
                    <td>
                      {money(
                        ledger
                          .filter((m) => m.date.slice(0, 7) <= month)
                          .reduce((a, m) => a + m.charge - m.payment, 0),
                      )}
                    </td>
                  </tr>
                ))}
            </Table>
          </details>
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
              "Cargo / venta",
              "Abonos",
              "Saldo acumulado",
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
