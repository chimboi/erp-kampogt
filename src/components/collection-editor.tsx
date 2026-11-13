"use client";
import { useState } from "react";
import { useStore } from "@/lib/store";
import {
  clients,
  saleTotal,
  salePaid,
  clientName,
  shortOrderId,
  date,
  TODAY,
} from "@/data";
import { cashMoney } from "@/data/cash";
import { Modal } from "./ui";
export default function CollectionEditor({
  saleId,
  clientId,
  onClose,
  onSaved,
}: {
  saleId?: string;
  clientId?: string;
  onClose: () => void;
  onSaved: (date: string) => void;
}) {
  const store = useStore();
  const [paymentDate, setPaymentDate] = useState(TODAY);
  const [scope, setScope] = useState(saleId ? "Todos" : "Este mes");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(saleId ? `sale:${saleId}` : "");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState("");
  const targets = [
    ...store.sales.map((sale) => {
      const order = store.orders.find((order) => order.saleId === sale.id);
      return {
        key: `sale:${sale.id}`,
        saleId: sale.id,
        orderId: order?.id,
        label: order
          ? shortOrderId(order.id)
          : sale.id.replace(/^daily-sale-/, "V-"),
        client: clientName(sale.client),
        clientId: sale.client,
        date: sale.date,
        total: saleTotal(sale),
        paid: salePaid(sale),
      };
    }),
    ...store.orders
      .filter((order) => !order.saleId)
      .map((order) => ({
        key: `order:${order.id}`,
        saleId: undefined,
        orderId: order.id,
        label: shortOrderId(order.id),
        client: order.client,
        clientId: clients.find((client) => client.name === order.client)?.id,
        date: order.date,
        total: order.kg * order.price,
        paid: order.paid ?? 0,
      })),
  ].filter(
    (row) =>
      Math.round((row.total - row.paid) * 100) > 0 &&
      (!clientId || row.clientId === clientId),
  );
  const target = targets.find((row) => row.key === selected);
  const remaining = target
    ? Math.round((target.total - target.paid) * 100) / 100
    : 0;
  const month = paymentDate.slice(0, 7);
  const options = targets.filter(
    (row) =>
      row.date <= paymentDate &&
      (scope === "Todos" ||
        (scope === "Este mes"
          ? row.date.slice(0, 7) === month
          : row.date.slice(0, 7) < month)) &&
      `${row.label} ${row.client}`.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <Modal title="Cobrar venta o pedido pendiente" onClose={onClose}>
      <form
        className="cash-entry-form"
        onSubmit={(event) => {
          event.preventDefault();
          setError("");
          const value = Math.round(Number(amount || remaining) * 100) / 100;
          if (
            !target ||
            target.date > paymentDate ||
            !Number.isFinite(value) ||
            value <= 0 ||
            value > remaining
          ) {
            setError(
              "Selecciona un pendiente y un importe que no exceda su saldo.",
            );
            return;
          }
          const accepted = store.registerCollection({
            id: `collection-${crypto.randomUUID()}`,
            kind: "Cobro",
            category: "Cobro de venta",
            saleId: target.saleId,
            orderId: target.orderId,
            clientId: target.clientId,
            contact: target.client,
            description: `Cobro ${target.label}`,
            originDate: target.date,
            date: paymentDate,
            time: "12:00",
            amount: value,
          });
          if (!accepted) {
            setError(
              "El saldo cambió. Revisa el pendiente antes de volver a guardar.",
            );
            return;
          }
          onSaved(paymentDate);
        }}
      >
        <label>
          Fecha del cobro
          <input
            aria-label="Fecha del cobro"
            type="date"
            required
            min={target?.date ?? "2026-01-01"}
            value={paymentDate}
            onChange={(event) => {
              if (event.target.value) setPaymentDate(event.target.value);
            }}
          />
        </label>
        <div className="segmented" aria-label="Antigüedad del pendiente">
          {["Este mes", "Meses anteriores", "Todos"].map((name) => (
            <button
              key={name}
              type="button"
              className={scope === name ? "active" : ""}
              onClick={() => {
                setScope(name);
                setSelected("");
                setAmount("");
              }}
            >
              {name}
            </button>
          ))}
        </div>
        <label>
          Buscar cliente o pedido
          <input
            aria-label="Buscar pendiente"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <label>
          Venta / pedido pendiente
          <select
            aria-label="Pendiente a cobrar"
            required
            value={selected}
            onChange={(event) => {
              setSelected(event.target.value);
              setAmount("");
            }}
          >
            <option value="">Selecciona un pendiente ({options.length})</option>
            {options.map((row) => (
              <option key={row.key} value={row.key}>
                {row.label} · {row.client} · {date(row.date)} ·{" "}
                {cashMoney(row.total - row.paid)}
              </option>
            ))}
            {target && !options.some((row) => row.key === target.key) && (
              <option value={target.key}>
                {target.label} · {target.client} · {cashMoney(remaining)}
              </option>
            )}
          </select>
        </label>
        {target && (
          <div className="sale-payment-summary">
            <span>
              Venta total<strong>{cashMoney(target.total)}</strong>
            </span>
            <span>
              Pagado<strong>{cashMoney(target.paid)}</strong>
            </span>
            <span>
              Por cobrar<strong>{cashMoney(remaining)}</strong>
            </span>
          </div>
        )}
        <label>
          Importe a cobrar
          <input
            aria-label="Importe a cobrar"
            type="number"
            step="0.01"
            min="0.01"
            max={remaining || undefined}
            required
            value={amount || (target ? remaining : "")}
            onChange={(event) => setAmount(event.target.value)}
          />
        </label>
        {error && (
          <p className="out" role="alert">
            {error}
          </p>
        )}
        <div className="cash-form-actions">
          <button className="secondary" type="button" onClick={onClose}>
            Cancelar
          </button>
          <button className="primary" type="submit" disabled={!target}>
            Registrar cobro
          </button>
        </div>
      </form>
    </Modal>
  );
}
