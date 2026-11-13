"use client";
import { useState } from "react";
import { Card, Kpi, Modal } from "./ui";
import { DataTable, type Column } from "./data-table";
import CollectionEditor from "./collection-editor";
import InvoiceButton from "./invoice-button";
import { useStore } from "@/lib/store";
import {
  clients,
  suppliers,
  money,
  number,
  date,
  TODAY,
  saleTotal,
  salePaid,
  purchaseCost,
  purchaseLabels,
  shortOrderId,
} from "@/data";
export { default as Shipments } from "./shipments";

type BalanceOperation = {
  id: string;
  label: string;
  contactId: string;
  contact: string;
  city: string;
  date: string;
  product: string;
  total: number;
  paid: number;
  remaining: number;
  saleId?: string;
  orderId?: string;
  purchaseId?: string;
};

export function Balances({ supplier = false }: { supplier?: boolean }) {
  const store = useStore();
  const [view, setView] = useState("contact");
  const [selected, setSelected] = useState<string | null>(null);
  const [collection, setCollection] = useState<{
    saleId?: string;
    orderId?: string;
    clientId?: string;
  } | null>(null);
  const [payment, setPayment] = useState<BalanceOperation | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const labels = purchaseLabels(store.shipments);
  const contacts = supplier ? suppliers : clients;
  const round = (value: number) => Math.round(value * 100) / 100;
  const operations: BalanceOperation[] = supplier
    ? store.shipments.map((purchase) => {
        const contact = suppliers.find((row) => row.id === purchase.supplier);
        const total = purchaseCost(purchase);
        const paid = round(
          store.cashEntries
            .filter(
              (entry) =>
                entry.purchaseId === purchase.id &&
                entry.kind === "Gasto" &&
                ["Compras", "Pago a proveedores"].includes(entry.category),
            )
            .reduce((sum, entry) => sum + entry.amount, 0),
        );
        return {
          id: purchase.id,
          label: labels.get(purchase.id) ?? purchase.id,
          contactId: purchase.supplier,
          contact: contact?.name ?? purchase.supplier,
          city: contact?.city ?? purchase.origin,
          date: purchase.date,
          product: purchase.product,
          total,
          paid,
          remaining: Math.max(0, round(total - paid)),
          purchaseId: purchase.id,
        };
      })
    : [
        ...store.sales.map((sale) => {
          const contact = clients.find((row) => row.id === sale.client);
          const order = store.orders.find((row) => row.saleId === sale.id);
          const total = saleTotal(sale),
            paid = salePaid(sale);
          return {
            id: sale.id,
            label: order
              ? shortOrderId(order.id)
              : sale.id.replace(/^daily-sale-/, "V-"),
            contactId: sale.client,
            contact: contact?.name ?? sale.client,
            city: contact?.city ?? "—",
            date: sale.date,
            product: sale.product,
            total,
            paid,
            remaining: Math.max(0, round(total - paid)),
            saleId: sale.id,
          };
        }),
        ...store.orders
          .filter((order) => !order.saleId && !/cancel/i.test(order.status))
          .map((order) => {
            const contact = clients.find((row) => row.name === order.client);
            const total = round(order.kg * order.price),
              paid = order.paid ?? 0;
            return {
              id: order.id,
              orderId: order.id,
              label: shortOrderId(order.id),
              contactId: contact?.id ?? order.client,
              contact: order.client,
              city: contact?.city ?? "—",
              date: order.date,
              product: order.product,
              total,
              paid,
              remaining: Math.max(0, round(total - paid)),
            };
          }),
      ];
  const grouped = Array.from(
    new Set([
      ...contacts.map((row) => row.id),
      ...operations.map((row) => row.contactId),
    ]),
  ).map((id) => {
    const rows = operations.filter((row) => row.contactId === id);
    const contact = contacts.find((row) => row.id === id);
    return {
      id,
      name: contact?.name ?? rows[0]?.contact ?? id,
      city: contact?.city ?? rows[0]?.city ?? "—",
      count: rows.length,
      pending: rows.filter((row) => row.remaining > 0).length,
      total: rows.reduce((sum, row) => sum + row.total, 0),
      paid: rows.reduce((sum, row) => sum + row.paid, 0),
      remaining: rows.reduce((sum, row) => sum + row.remaining, 0),
    };
  });
  const selectedContact = grouped.find((row) => row.id === selected);
  const detail = operations.filter((row) => row.contactId === selected);
  const ledger = store.movements
    .filter((row) => row.contact === selected)
    .sort((a, b) => a.date.localeCompare(b.date));
  const operationColumns: Column<BalanceOperation>[] = [
    {
      id: "id",
      label: supplier ? "Compra" : "Venta / pedido",
      value: (row) => row.label,
    },
    {
      id: "date",
      label: "Fecha",
      value: (row) => row.date,
      render: (row) => date(row.date),
    },
    {
      id: "contact",
      label: supplier ? "Proveedor" : "Cliente",
      value: (row) => row.contact,
    },
    { id: "product", label: "Producto", value: (row) => row.product },
    {
      id: "total",
      label: "Total",
      value: (row) => row.total,
      render: (row) => money(row.total),
    },
    {
      id: "paid",
      label: supplier ? "Pagado" : "Recibido",
      value: (row) => row.paid,
      render: (row) => money(row.paid),
    },
    {
      id: "remaining",
      label: supplier ? "Por pagar" : "Por cobrar",
      value: (row) => row.remaining,
      render: (row) => <strong>{money(row.remaining)}</strong>,
    },
    {
      id: "status",
      label: "Estado",
      value: (row) =>
        row.remaining <= 0
          ? supplier
            ? "Pagado"
            : "Cobrado"
          : row.paid > 0
            ? "Anticipo"
            : "Pendiente",
    },
    {
      id: "action",
      label: "Acción",
      value: (row) =>
        row.remaining > 0 ? (supplier ? "Pagar" : "Cobrar") : "Al corriente",
      render: (row) =>
        row.remaining > 0 ? (
          <button
            className="text-link"
            onClick={() => {
              setError("");
              if (supplier) setPayment(row);
              else
                setCollection({
                  saleId: row.saleId,
                  orderId: row.orderId,
                  clientId: clients.some(
                    (client) => client.id === row.contactId,
                  )
                    ? row.contactId
                    : undefined,
                });
            }}
          >
            {supplier ? "Registrar pago" : "Cobrar"} →
          </button>
        ) : (
          <span className="muted">Al corriente</span>
        ),
    },
  ];
  if (!supplier)
    operationColumns.push({
      id: "invoice",
      label: "Factura",
      value: (row) => (row.saleId ? "Facturar" : "Sin venta registrada"),
      render: (row) => {
        const sale = store.sales.find((sale) => sale.id === row.saleId);
        return sale ? (
          <InvoiceButton sale={sale} />
        ) : (
          <span className="muted">—</span>
        );
      },
    });
  return (
    <>
      <div className="page-title">
        <h1>Saldo {supplier ? "proveedores" : "clientes"}</h1>
        <div className="segmented" aria-label="Agrupar saldos">
          <button
            className={view === "contact" ? "active" : ""}
            onClick={() => setView("contact")}
          >
            Por {supplier ? "proveedor" : "cliente"}
          </button>
          <button
            className={view === "operation" ? "active" : ""}
            onClick={() => setView("operation")}
          >
            Por {supplier ? "compra" : "venta"}
          </button>
        </div>
      </div>
      <div className="kpis three">
        <Kpi
          label={supplier ? "Total por pagar" : "Total por cobrar"}
          value={money(operations.reduce((sum, row) => sum + row.remaining, 0))}
        />
        <Kpi
          label={supplier ? "Proveedores con saldo" : "Clientes con saldo"}
          value={number(grouped.filter((row) => row.remaining > 0).length)}
        />
        <Kpi
          label={
            supplier
              ? "Compras pendientes de pago"
              : "Pedidos pendientes de cobro"
          }
          value={number(operations.filter((row) => row.remaining > 0).length)}
        />
      </div>
      {notice && (
        <p role="status" className="positive">
          {notice}
        </p>
      )}
      <Card>
        <div className="section-heading">
          <h2>
            {view === "contact"
              ? "Estado de cuentas"
              : supplier
                ? "Detalle de compras"
                : "Detalle de ventas y pedidos"}
          </h2>
          <span className="muted text-sm">
            Saldos vinculados a operaciones y pagos
          </span>
        </div>
        {view === "contact" ? (
          <DataTable
            key="contacts"
            rows={grouped}
            rowId={(row) => row.id}
            initialSort={{ id: "remaining", direction: "desc" }}
            columns={[
              {
                id: "name",
                label: supplier ? "Proveedor" : "Cliente",
                value: (row) => row.name,
                render: (row) => (
                  <button
                    className="text-link"
                    onClick={() => setSelected(row.id)}
                  >
                    {row.name}
                  </button>
                ),
              },
              { id: "city", label: "Plaza", value: (row) => row.city },
              {
                id: "count",
                label: supplier ? "Compras" : "Ventas / pedidos",
                value: (row) => row.count,
              },
              {
                id: "pending",
                label: "Pedidos pendientes",
                value: (row) => row.pending,
                render: (row) => <strong>{row.pending}</strong>,
              },
              {
                id: "total",
                label: "Importe total",
                value: (row) => row.total,
                render: (row) => money(row.total),
              },
              {
                id: "paid",
                label: supplier ? "Pagado" : "Recibido",
                value: (row) => row.paid,
                render: (row) => money(row.paid),
              },
              {
                id: "remaining",
                label: supplier ? "Por pagar" : "Por cobrar",
                value: (row) => row.remaining,
                render: (row) => <strong>{money(row.remaining)}</strong>,
              },
              {
                id: "action",
                label: "Detalle",
                value: () => "Ver pedidos",
                render: (row) => (
                  <button
                    className="text-link"
                    onClick={() => setSelected(row.id)}
                  >
                    Ver pedidos →
                  </button>
                ),
              },
            ]}
          />
        ) : (
          <DataTable
            key="operations"
            rows={operations}
            columns={operationColumns}
            rowId={(row) => row.id}
            initialSort={{ id: "remaining", direction: "desc" }}
          />
        )}
      </Card>
      {selectedContact && (
        <Modal title={selectedContact.name} onClose={() => setSelected(null)}>
          <div className="history-totals">
            <div>
              <small>Pedidos pendientes</small>
              <strong>
                {selectedContact.pending} de {selectedContact.count}
              </strong>
            </div>
            <div>
              <small>{supplier ? "Pagado" : "Recibido"}</small>
              <strong>{money(selectedContact.paid)}</strong>
            </div>
            <div>
              <small>{supplier ? "Por pagar" : "Por cobrar"}</small>
              <strong>{money(selectedContact.remaining)}</strong>
            </div>
          </div>
          <DataTable
            rows={detail}
            columns={operationColumns.filter(
              (column) => column.id !== "contact",
            )}
            rowId={(row) => row.id}
            initialSort={{ id: "date", direction: "desc" }}
          />
          {!!ledger.length && (
            <details className="monthly-history">
              <summary>Historial de referencia anterior</summary>
              <p className="muted text-sm">
                Movimientos históricos conservados. No se suman a los saldos de
                operaciones vinculadas.
              </p>
              <DataTable
                rows={ledger}
                rowId={(row) => row.id}
                initialSort={{ id: "date", direction: "desc" }}
                columns={[
                  {
                    id: "date",
                    label: "Fecha",
                    value: (row) => row.date,
                    render: (row) => date(row.date),
                  },
                  {
                    id: "charge",
                    label: "Cargo",
                    value: (row) => row.charge,
                    render: (row) => money(row.charge),
                  },
                  {
                    id: "payment",
                    label: "Abono",
                    value: (row) => row.payment,
                    render: (row) => money(row.payment),
                  },
                  {
                    id: "method",
                    label: "Forma de pago",
                    value: (row) => row.method,
                  },
                  {
                    id: "note",
                    label: "Observaciones",
                    value: (row) => row.note,
                  },
                ]}
              />
            </details>
          )}
        </Modal>
      )}
      {collection && (
        <CollectionEditor
          {...collection}
          onClose={() => setCollection(null)}
          onSaved={() => {
            setCollection(null);
            setNotice(
              "Cobro registrado. El saldo y el control de caja se actualizaron.",
            );
          }}
        />
      )}
      {payment && (
        <Modal
          title={`Pagar ${payment.label}`}
          onClose={() => setPayment(null)}
        >
          <form
            className="cash-entry-form"
            onSubmit={(event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              const amount = round(Number(form.get("amount")));
              const paymentDate = String(form.get("date"));
              const current = operations.find((row) => row.id === payment.id);
              if (
                !current ||
                !Number.isFinite(amount) ||
                amount <= 0 ||
                amount > current.remaining ||
                paymentDate < current.date
              ) {
                setError(
                  "Ingresa un pago válido, sin exceder el saldo, con fecha igual o posterior a la compra.",
                );
                return;
              }
              store.setCashEntries((rows) => [
                ...rows,
                {
                  id: `supplier-payment-${crypto.randomUUID()}`,
                  kind: "Gasto",
                  category: "Pago a proveedores",
                  purchaseId: payment.purchaseId,
                  contact: payment.contact,
                  description: `Pago ${payment.label}`,
                  amount,
                  account: String(form.get("account")) as
                    "Efectivo" | "Banorte",
                  date: paymentDate,
                  time: new Date().toTimeString().slice(0, 5),
                },
              ]);
              setPayment(null);
              setNotice(
                "Pago registrado y ligado a la compra. Se actualizó la salida en control de caja.",
              );
            }}
          >
            <div className="total-line">
              <span>Saldo por pagar</span>
              <strong>{money(payment.remaining)}</strong>
            </div>
            <label>
              Fecha del pago
              <input
                type="date"
                name="date"
                min={payment.date}
                defaultValue={TODAY < payment.date ? payment.date : TODAY}
                required
              />
            </label>
            <label>
              Importe a pagar
              <input
                type="number"
                name="amount"
                min="0.01"
                step="0.01"
                max={payment.remaining}
                defaultValue={payment.remaining}
                required
              />
            </label>
            <label>
              Cuenta de salida
              <select name="account" defaultValue="Banorte">
                <option>Efectivo</option>
                <option>Banorte</option>
              </select>
            </label>
            {error && (
              <p role="alert" className="out">
                {error}
              </p>
            )}
            <div className="cash-form-actions">
              <button
                type="button"
                className="secondary"
                onClick={() => setPayment(null)}
              >
                Cancelar
              </button>
              <button className="primary" type="submit">
                Registrar pago
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
