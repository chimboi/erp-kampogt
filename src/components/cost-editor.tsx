"use client";
import { useState } from "react";
import { Modal } from "./ui";
import { suppliers, purchaseLabels, type Shipment } from "@/data";
import { cashMoney, costCategories, type CashEntry } from "@/data/cash";
export default function CostEditor({
  purchases,
  initialDate,
  onSave,
  onClose,
}: {
  purchases: Shipment[];
  initialDate: string;
  onSave: (entry: CashEntry, purchase?: Shipment) => void;
  onClose: () => void;
}) {
  const [category, setCategory] = useState<string>("Compras");
  const [supplierId, setSupplierId] = useState("p6");
  const [kg, setKg] = useState("");
  const [price, setPrice] = useState("");
  const [amount, setAmount] = useState("");
  const [status, setStatus] = useState("Pendiente");
  const [entryDate, setEntryDate] = useState(initialDate);
  const [error, setError] = useState("");
  const isPurchase = category === "Compras";
  const total = Math.round(Number(kg) * Number(price) * 100) / 100;
  const paid = isPurchase
    ? status === "Pagado"
      ? total
      : status === "Pendiente"
        ? 0
        : Number(amount)
    : Number(amount);
  const supplier = suppliers.find((row) => row.id === supplierId)!;
  const labels = purchaseLabels(purchases);
  return (
    <Modal title="Registrar costo" onClose={onClose}>
      <form
        className="cash-entry-form"
        onSubmit={(event) => {
          event.preventDefault();
          setError("");
          const form = new FormData(event.currentTarget);
          if (
            !Number.isFinite(paid) ||
            paid < 0 ||
            (!isPurchase && paid <= 0) ||
            (isPurchase &&
              (!Number.isFinite(total) ||
                total <= 0 ||
                (status === "Anticipo" && (paid <= 0 || paid >= total))))
          ) {
            setError(
              "Revisa el importe. El anticipo debe ser mayor a cero y menor que la compra total.",
            );
            return;
          }
          const linkedId = String(form.get("purchaseId") ?? "");
          if (
            linkedId &&
            !purchases.some(
              (row) => row.id === linkedId && row.date <= entryDate,
            )
          ) {
            setError("Selecciona una compra anterior o del mismo día.");
            return;
          }
          let purchase: Shipment | undefined;
          if (isPurchase) {
            const id = `purchase-${crypto.randomUUID()}`;
            purchase = {
              id,
              name: "",
              supplier: supplierId,
              origin: supplier.city,
              date: entryDate,
              product: String(form.get("product")) as Shipment["product"],
              kg: Number(kg),
              purchase: Number(price),
              purchaseTotal: total,
              freight: 0,
              unloading: 0,
              scale: 0,
              handling: 0,
            };
            purchase.name = purchaseLabels([...purchases, purchase]).get(id)!;
          }
          onSave(
            {
              id: `cash-${crypto.randomUUID()}`,
              kind: "Gasto",
              category,
              date: entryDate,
              time: String(form.get("time")),
              contact: isPurchase
                ? supplier.name
                : String(form.get("contact") || "Operación"),
              description: isPurchase
                ? `Compra de cebolla ${purchase!.product.toLowerCase()}`
                : String(form.get("description")).trim(),
              amount: Math.round(paid * 100) / 100,
              purchaseId: purchase?.id ?? (linkedId || undefined),
              total: isPurchase ? total : undefined,
            },
            purchase,
          );
        }}
      >
        <label>
          Categoría
          <select
            aria-label="Categoría del costo"
            value={category}
            onChange={(event) => setCategory(event.target.value)}
          >
            {costCategories.map((name) => (
              <option key={name}>{name}</option>
            ))}
          </select>
        </label>
        <div className="cash-form-grid">
          <label>
            Fecha
            <input
              aria-label="Fecha del costo"
              type="date"
              required
              min="2026-01-01"
              value={entryDate}
              onChange={(event) => {
                if (event.target.value) setEntryDate(event.target.value);
              }}
            />
          </label>
          <label>
            Hora
            <input
              aria-label="Hora del costo"
              type="time"
              name="time"
              required
              defaultValue="12:00"
            />
          </label>
        </div>
        {isPurchase ? (
          <>
            <label>
              Proveedor
              <select
                aria-label="Proveedor de la compra"
                value={supplierId}
                onChange={(event) => setSupplierId(event.target.value)}
              >
                {suppliers.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Producto
              <select aria-label="Producto de la compra" name="product">
                <option>Blanca</option>
                <option>Morada</option>
                <option>Amarilla</option>
              </select>
            </label>
            <div className="cash-form-grid">
              <label>
                KG comprados
                <input
                  aria-label="KG comprados"
                  type="number"
                  required
                  min="0.01"
                  step="0.01"
                  value={kg}
                  onChange={(event) => setKg(event.target.value)}
                />
              </label>
              <label>
                Costo por kg
                <input
                  aria-label="Costo por kg"
                  type="number"
                  required
                  min="0.01"
                  step="0.01"
                  value={price}
                  onChange={(event) => setPrice(event.target.value)}
                />
              </label>
            </div>
            <label>
              Compra total
              <input
                aria-label="Compra total"
                readOnly
                value={cashMoney(total)}
              />
            </label>
            <label>
              Status
              <select
                aria-label="Status de la compra"
                value={status}
                onChange={(event) => setStatus(event.target.value)}
              >
                <option>Pendiente</option>
                <option>Anticipo</option>
                <option>Pagado</option>
              </select>
            </label>
          </>
        ) : (
          <>
            <label>
              Compra relacionada
              <select aria-label="Compra relacionada" name="purchaseId">
                <option value="">Sin compra específica</option>
                {purchases
                  .filter((row) => row.date <= entryDate)
                  .map((row) => (
                    <option key={row.id} value={row.id}>
                      {labels.get(row.id)} · {row.product}
                    </option>
                  ))}
              </select>
            </label>
            <label>
              Beneficiario
              <input
                aria-label="Beneficiario del costo"
                name="contact"
                required
              />
            </label>
            <label>
              Concepto
              <input
                aria-label="Concepto del costo"
                name="description"
                required
              />
            </label>
          </>
        )}
        {(!isPurchase || status === "Anticipo") && (
          <label>
            {isPurchase ? "Anticipo pagado" : "Monto pagado"}
            <input
              aria-label="Monto pagado del costo"
              type="number"
              required
              min="0.01"
              step="0.01"
              max={isPurchase ? total - 0.01 : undefined}
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
            />
          </label>
        )}
        {isPurchase && (
          <div className="sale-payment-summary">
            <span>
              Pagado <strong>{cashMoney(paid)}</strong>
            </span>
            <span>
              Por pagar <strong>{cashMoney(Math.max(0, total - paid))}</strong>
            </span>
          </div>
        )}
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
            Guardar {isPurchase ? "compra" : "costo"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
