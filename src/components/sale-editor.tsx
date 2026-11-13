"use client";
import { useState } from "react";
import { Modal } from "./ui";
import {
  clients,
  suppliers,
  purchaseLabels,
  salePaid,
  saleTotal,
  paymentStatus,
  date,
  type Sale,
  type Shipment,
} from "@/data";
import { cashMoney } from "@/data/cash";
export default function SaleEditor({
  sale,
  purchases,
  initialDate,
  minimumPaid = 0,
  onSave,
  onClose,
}: {
  sale?: Sale;
  purchases: Shipment[];
  initialDate: string;
  minimumPaid?: number;
  onSave: (sale: Sale) => void;
  onClose: () => void;
}) {
  const [saleDate, setSaleDate] = useState(sale?.date ?? initialDate);
  const [purchaseId, setPurchaseId] = useState(sale?.shipment ?? "");
  const [kg, setKg] = useState(sale ? String(sale.kg) : "");
  const [price, setPrice] = useState(sale ? String(sale.price) : "");
  const [status, setStatus] = useState(
    sale ? paymentStatus(saleTotal(sale), salePaid(sale)) : "Pendiente",
  );
  const [advance, setAdvance] = useState(sale ? String(salePaid(sale)) : "");
  const [error, setError] = useState("");
  const labels = purchaseLabels(purchases);
  const purchase = purchases.find((row) => row.id === purchaseId);
  const total = Math.round(Number(kg) * Number(price) * 100) / 100;
  const paid =
    status === "Cobrado" ? total : status === "Anticipo" ? Number(advance) : 0;
  return (
    <Modal title={sale ? "Editar venta" : "Registrar venta"} onClose={onClose}>
      <form
        className="cash-entry-form"
        onSubmit={(event) => {
          event.preventDefault();
          setError("");
          if (!purchase || purchase.date > saleDate) {
            setError(
              "Selecciona una compra con fecha igual o anterior a la venta.",
            );
            return;
          }
          if (
            !Number.isFinite(total) ||
            total <= 0 ||
            Number(kg) <= 0 ||
            Number(price) <= 0
          ) {
            setError("Captura kilos y precio mayores a cero.");
            return;
          }
          if (
            status === "Anticipo" &&
            (!Number.isFinite(paid) || paid <= 0 || paid >= total)
          ) {
            setError(
              "El anticipo debe ser mayor a cero y menor que la venta total.",
            );
            return;
          }
          if (total < minimumPaid || paid < minimumPaid) {
            setError(
              "La venta ya tiene cobros vinculados. El total y lo recibido no pueden ser menores que esos cobros.",
            );
            return;
          }
          const form = new FormData(event.currentTarget);
          onSave({
            ...sale,
            id: sale?.id ?? `sale-${crypto.randomUUID()}`,
            date: saleDate,
            time: String(form.get("time")),
            shipment: purchase.id,
            client: String(form.get("client")),
            product: purchase.product,
            kg: Number(kg),
            price: Number(price),
            paid: Math.round(paid * 100) / 100,
            cash: status === "Cobrado",
          });
        }}
      >
        <div className="cash-form-grid">
          <label>
            Fecha
            <input
              aria-label="Fecha de la venta"
              type="date"
              min="2026-01-01"
              required
              value={saleDate}
              onChange={(event) => {
                if (event.target.value) setSaleDate(event.target.value);
              }}
            />
          </label>
          <label>
            Hora
            <input
              aria-label="Hora de la venta"
              name="time"
              type="time"
              required
              defaultValue={sale?.time ?? "12:00"}
            />
          </label>
        </div>
        <label>
          Cliente
          <select
            aria-label="Cliente de la venta"
            name="client"
            required
            defaultValue={sale?.client ?? ""}
          >
            <option value="" disabled>
              Selecciona un cliente
            </option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Compra de origen
          <select
            aria-label="Compra de origen"
            required
            value={purchaseId}
            onChange={(event) => setPurchaseId(event.target.value)}
          >
            <option value="" disabled>
              Selecciona proveedor y compra
            </option>
            {purchases
              .filter((row) => row.date <= saleDate || row.id === purchaseId)
              .slice()
              .sort((a, b) => b.date.localeCompare(a.date))
              .map((row) => (
                <option key={row.id} value={row.id}>
                  {labels.get(row.id)} · {row.product} · {date(row.date)}
                </option>
              ))}
          </select>
        </label>
        <div className="cash-form-grid">
          <label>
            Proveedor
            <input
              aria-label="Proveedor de la venta"
              readOnly
              value={
                suppliers.find((row) => row.id === purchase?.supplier)?.name ??
                ""
              }
            />
          </label>
          <label>
            Producto
            <input
              aria-label="Producto de la venta"
              readOnly
              value={purchase?.product ?? ""}
            />
          </label>
        </div>
        <div className="cash-form-grid">
          <label>
            KG
            <input
              aria-label="KG de la venta"
              type="number"
              step="0.01"
              min="0.01"
              required
              value={kg}
              onChange={(event) => setKg(event.target.value)}
            />
          </label>
          <label>
            Precio por kg
            <input
              aria-label="Precio por kg"
              type="number"
              step="0.01"
              min="0.01"
              required
              value={price}
              onChange={(event) => setPrice(event.target.value)}
            />
          </label>
        </div>
        <label>
          Venta total
          <input
            aria-label="Venta total"
            readOnly
            value={cashMoney(Number.isFinite(total) ? total : 0)}
          />
        </label>
        <label>
          Status
          <select
            aria-label="Status de la venta"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            <option>Pendiente</option>
            <option>Anticipo</option>
            <option>Cobrado</option>
          </select>
        </label>
        {status === "Anticipo" && (
          <label>
            Anticipo recibido
            <input
              aria-label="Anticipo recibido"
              type="number"
              step="0.01"
              min="0.01"
              max={Math.max(0, total - 0.01)}
              required
              value={advance}
              onChange={(event) => setAdvance(event.target.value)}
            />
          </label>
        )}
        <div className="sale-payment-summary">
          <span>
            Recibido{" "}
            <strong>{cashMoney(Number.isFinite(paid) ? paid : 0)}</strong>
          </span>
          <span>
            Pendiente{" "}
            <strong>
              {cashMoney(
                Number.isFinite(total - paid) ? Math.max(0, total - paid) : 0,
              )}
            </strong>
          </span>
        </div>
        {error && (
          <p role="alert" className="out">
            {error}
          </p>
        )}
        <div className="cash-form-actions">
          <button className="secondary" type="button" onClick={onClose}>
            Cancelar
          </button>
          <button className="primary" type="submit">
            Guardar venta
          </button>
        </div>
      </form>
    </Modal>
  );
}
