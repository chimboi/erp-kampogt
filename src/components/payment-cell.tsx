"use client";
import { useState } from "react";
import { paymentStatus } from "@/data";
export function PaymentCell({
  id,
  total,
  paid,
  onSave,
  disabled = false,
}: {
  id: string;
  total: number;
  paid: number;
  onSave: (paid: number) => void;
  disabled?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [amount, setAmount] = useState("");
  const status = paymentStatus(total, paid);
  if (disabled)
    return <span className={`payment-${status.toLowerCase()}`}>{status}</span>;
  return (
    <div className="payment-cell">
      <select
        className={`cell-select payment-${status.toLowerCase()}`}
        aria-label={`Estatus ${id}`}
        value={editing ? "Anticipo" : status}
        onChange={(event) => {
          if (event.target.value === "Anticipo") {
            setAmount(paid > 0 && paid < total ? String(paid) : "");
            setEditing(true);
          } else {
            setEditing(false);
            onSave(event.target.value === "Cobrado" ? total : 0);
          }
        }}
      >
        <option>Cobrado</option>
        <option>Anticipo</option>
        <option>Pendiente</option>
      </select>
      {!editing && status === "Anticipo" && (
        <button
          className="edit-advance"
          aria-label={`Editar anticipo ${id}`}
          onClick={() => {
            setAmount(String(paid));
            setEditing(true);
          }}
        >
          ✎
        </button>
      )}
      {editing && (
        <form
          className="advance-editor"
          onSubmit={(event) => {
            event.preventDefault();
            const value = Number(amount);
            if (Number.isFinite(value) && value > 0 && value < total) {
              onSave(Math.round(value * 100) / 100);
              setEditing(false);
            }
          }}
        >
          <input
            autoFocus
            aria-label={`Anticipo ${id}`}
            type="number"
            step="0.01"
            min="0.01"
            max={Math.max(0, total - 0.01)}
            required
            placeholder="Abono $"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape") setEditing(false);
            }}
          />
          <button type="submit" className="text-link">
            Guardar
          </button>
          <button
            type="button"
            aria-label="Cancelar anticipo"
            onClick={() => setEditing(false)}
          >
            ×
          </button>
        </form>
      )}
    </div>
  );
}
