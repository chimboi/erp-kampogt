"use client";
import { useState } from "react";
import { Plus, ArrowLeft, ArrowRight } from "lucide-react";
import { clients, suppliers, number, date } from "@/data";
import { marketOffers, quoteMoney, type MarketOffer } from "@/data/market";
import { usePersistentState } from "@/lib/store";
import { useTomorrowDate } from "@/lib/crm-date";
import { DataTable, type Column } from "./data-table";
import { Badge, Modal } from "./ui";
import "./market.css";

function shiftDay(day: string, offset: number) {
  return new Date(new Date(day + "T12:00:00Z").getTime() + offset * 86400000)
    .toISOString()
    .slice(0, 10);
}
function Editable({
  value,
  label,
  display,
  type = "text",
  min,
  onSave,
}: {
  value: string | number;
  label: string;
  display?: string;
  type?: string;
  min?: number;
  onSave: (value: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));
  const [error, setError] = useState("");
  function save() {
    if (
      !draft.trim() ||
      (type === "number" &&
        (!Number.isFinite(Number(draft)) || Number(draft) < (min ?? 0)))
    ) {
      setError("Revisa el valor");
      return;
    }
    onSave(draft.trim());
    setEditing(false);
    setError("");
  }
  return editing ? (
    <div>
      <input
        autoFocus
        aria-label={label}
        type={type}
        min={min}
        step={type === "number" ? "0.01" : undefined}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => {
          if (e.key === "Enter") save();
          if (e.key === "Escape") {
            setEditing(false);
            setError("");
          }
        }}
      />
      {error && <small role="alert">{error}</small>}
    </div>
  ) : (
    <button
      className="market-edit-cell"
      aria-label={`Editar ${label}`}
      onClick={() => {
        setDraft(String(value));
        setEditing(true);
      }}
    >
      {display ?? (value || "Agregar")}
    </button>
  );
}
export default function Market() {
  const [offers, setOffers] = usePersistentState<MarketOffer[]>(
    "kampo-market-v1",
    marketOffers,
  );
  const tomorrow = useTomorrowDate();
  const today = tomorrow ? shiftDay(tomorrow, -1) : "";
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const day = selectedDate ?? today;
  const [side, setSide] = useState("Todas");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");
  const update = (id: string, patch: Partial<MarketOffer>) =>
    setOffers((previous) =>
      previous.map((o) => (o.id === id ? { ...o, ...patch } : o)),
    );
  function cell(
    o: MarketOffer,
    key: keyof MarketOffer,
    label: string,
    type = "text",
    min?: number,
    display?: string,
  ) {
    return (
      <Editable
        value={o[key]}
        display={display}
        label={`${label} · ${o.id}`}
        type={type}
        min={min}
        onSave={(value) =>
          update(o.id, { [key]: type === "number" ? Number(value) : value })
        }
      />
    );
  }
  function choice(
    o: MarketOffer,
    key: keyof MarketOffer,
    label: string,
    values: string[],
  ) {
    return (
      <select
        aria-label={`${label} · ${o.id}`}
        value={o[key]}
        onChange={(e) => update(o.id, { [key]: e.target.value })}
      >
        {values.map((v) => (
          <option key={v}>{v}</option>
        ))}
      </select>
    );
  }
  const columns: Column<MarketOffer>[] = [
    { id: "id", label: "ID", value: (o) => o.id },
    {
      id: "timestamp",
      label: "Fecha y hora",
      value: (o) => o.timestamp,
      render: (o) =>
        cell(
          o,
          "timestamp",
          "Fecha y hora",
          "datetime-local",
          undefined,
          `${date(o.timestamp.slice(0, 10))} · ${o.timestamp.slice(11, 16)}`,
        ),
    },
    {
      id: "side",
      label: "Oferta",
      value: (o) => o.side,
      render: (o) => choice(o, "side", "Oferta", ["Compra", "Venta"]),
    },
    {
      id: "contact",
      label: "Contacto",
      value: (o) => o.contact,
      render: (o) => cell(o, "contact", "Contacto"),
    },
    {
      id: "product",
      label: "Producto",
      value: (o) => o.product,
      render: (o) =>
        choice(o, "product", "Producto", ["Blanca", "Morada", "Amarilla"]),
    },
    {
      id: "size",
      label: "Tamaño",
      value: (o) => o.size,
      render: (o) => choice(o, "size", "Tamaño", ["GDE", "MED", "CH", "PP"]),
    },
    {
      id: "kg",
      label: "KG",
      value: (o) => o.kg,
      render: (o) => cell(o, "kg", "KG", "number", 0.01, number(o.kg)),
    },
    {
      id: "price",
      label: "Precio/kg",
      value: (o) => o.price,
      render: (o) =>
        cell(o, "price", "Precio/kg", "number", 0.01, quoteMoney(o.price)),
    },
    {
      id: "freight",
      label: "Flete total",
      value: (o) => o.freight,
      render: (o) =>
        cell(o, "freight", "Flete total", "number", 0, quoteMoney(o.freight)),
    },
    {
      id: "delivered",
      label: "Con flete/kg",
      value: (o) => o.price + o.freight / o.kg,
      render: (o) => quoteMoney(o.price + o.freight / o.kg),
    },
    {
      id: "total",
      label: "Total cotizado",
      value: (o) => o.kg * o.price + o.freight,
      render: (o) => quoteMoney(o.kg * o.price + o.freight),
    },
    {
      id: "origin",
      label: "Origen",
      value: (o) => o.origin,
      render: (o) => cell(o, "origin", "Origen"),
    },
    {
      id: "destination",
      label: "Destino",
      value: (o) => o.destination,
      render: (o) => cell(o, "destination", "Destino"),
    },
    {
      id: "status",
      label: "Estado",
      value: (o) => o.status,
      render: (o) =>
        choice(o, "status", "Estado", ["Vigente", "Cerrada", "Descartada"]),
    },
    {
      id: "notes",
      label: "Observaciones",
      value: (o) => o.notes,
      render: (o) => cell(o, "notes", "Observaciones"),
    },
  ];
  const periodOffers = offers.filter(
    (o) => !day || o.timestamp.startsWith(day),
  );
  const rows = offers.filter(
    (o) =>
      (!day || o.timestamp.startsWith(day)) &&
      (side === "Todas" || o.side === side),
  );
  return (
    <div className="market-page">
      <div className="page-title">
        <div>
          <h1>Mercado</h1>
          <p className="muted">El pulso diario de las ofertas de cebolla.</p>
        </div>
        <button
          className="primary"
          disabled={!today}
          onClick={() => {
            setError("");
            setAdding(true);
          }}
        >
          <Plus size={16} /> Registrar oferta
        </button>
      </div>
      <div className="market-toolbar">
        <div className="market-date">
          <button
            className="secondary"
            aria-label="Día anterior"
            disabled={!day}
            onClick={() => setSelectedDate(shiftDay(day, -1))}
          >
            <ArrowLeft size={15} />
          </button>
          <input
            aria-label="Fecha de mercado"
            type="date"
            value={day}
            onChange={(e) => setSelectedDate(e.target.value)}
          />
          <button
            className="secondary"
            aria-label="Día siguiente"
            disabled={!day}
            onClick={() => setSelectedDate(shiftDay(day, 1))}
          >
            <ArrowRight size={15} />
          </button>
          <button className="text-link" onClick={() => setSelectedDate(null)}>
            Hoy
          </button>
          <button className="text-link" onClick={() => setSelectedDate("")}>
            Historial
          </button>
        </div>
        <div className="segmented" aria-label="Tipo de oferta">
          {["Todas", "Compra", "Venta"].map((v) => (
            <button
              key={v}
              aria-pressed={side === v}
              className={side === v ? "active" : ""}
              onClick={() => setSide(v)}
            >
              {v}
            </button>
          ))}
        </div>
      </div>
      <div className="market-snapshot">
        {(["Blanca", "Morada", "Amarilla"] as const).map((product) => {
          const active = periodOffers.filter(
            (o) => o.product === product && o.status === "Vigente",
          );
          const range = (side: string) => {
            const prices = active
              .filter((o) => o.side === side)
              .map((o) => o.price);
            return prices.length
              ? `${quoteMoney(Math.min(...prices))} – ${quoteMoney(Math.max(...prices))}`
              : "Sin ofertas";
          };
          return (
            <section className="card" key={product}>
              <Badge>{product}</Badge>
              <dl>
                <div>
                  <dt>
                    <strong>Compra · Proveedores</strong>
                  </dt>
                  <dd>{range("Compra")}</dd>
                </div>
                <div>
                  <dt>
                    <strong>Venta · Clientes</strong>
                  </dt>
                  <dd>{range("Venta")}</dd>
                </div>
              </dl>
            </section>
          );
        })}
      </div>
      <DataTable
        rows={rows}
        columns={columns}
        rowId={(o) => o.id}
        initialSort={{ id: "timestamp", direction: "desc" }}
        pageSize={30}
      />
      <p className="market-footnote">
        Registro de referencia comercial con ejemplos demo. Cerrar una oferta
        solo cambia su estado aquí; no registra compras, ventas ni pagos.
        Cambios guardados en este navegador.
      </p>
      {adding && (
        <Modal
          title="Registrar oferta de mercado"
          onClose={() => setAdding(false)}
        >
          <form
            className="form-grid"
            onSubmit={(e) => {
              e.preventDefault();
              const data = new FormData(e.currentTarget);
              const text = (key: string) => String(data.get(key) ?? "").trim();
              const kg = Number(data.get("kg")),
                price = Number(data.get("price")),
                freight = Number(data.get("freight"));
              if (
                ![kg, price, freight].every(Number.isFinite) ||
                kg <= 0 ||
                price <= 0 ||
                freight < 0 ||
                !text("contact") ||
                !text("origin") ||
                !text("destination")
              ) {
                setError(
                  "Revisa el contacto, las plazas, los kilos, el precio y el flete.",
                );
                return;
              }
              const timestamp = text("timestamp");
              const offer: MarketOffer = {
                id: "M-" + crypto.randomUUID().slice(0, 8).toUpperCase(),
                timestamp,
                side: text("side") as MarketOffer["side"],
                contact: text("contact"),
                product: text("product") as MarketOffer["product"],
                size: text("size") as MarketOffer["size"],
                kg,
                price,
                freight,
                origin: text("origin"),
                destination: text("destination"),
                status: "Vigente",
                notes: text("notes"),
              };
              setOffers((previous) => [...previous, offer]);
              setSelectedDate(timestamp.slice(0, 10));
              setSide("Todas");
              setAdding(false);
            }}
          >
            <label>
              Fecha y hora
              <input
                name="timestamp"
                type="datetime-local"
                defaultValue={`${day || today}T09:00`}
                required
              />
            </label>
            <label>
              Oferta
              <select
                name="side"
                defaultValue={side === "Venta" ? "Venta" : "Compra"}
              >
                <option>Compra</option>
                <option>Venta</option>
              </select>
            </label>
            <label>
              Contacto
              <input
                name="contact"
                list="market-contacts"
                required
                maxLength={120}
              />
              <datalist id="market-contacts">
                {[...suppliers, ...clients].map((c) => (
                  <option key={c.id} value={c.name} />
                ))}
              </datalist>
            </label>
            <label>
              Producto
              <select name="product">
                <option>Blanca</option>
                <option>Morada</option>
                <option>Amarilla</option>
              </select>
            </label>
            <label>
              Tamaño
              <select name="size">
                <option>MED</option>
                <option>GDE</option>
                <option>CH</option>
                <option>PP</option>
              </select>
            </label>
            <label>
              KG
              <input name="kg" type="number" min="0.01" step="0.01" required />
            </label>
            <label>
              Precio/kg
              <input
                name="price"
                type="number"
                min="0.01"
                step="0.01"
                required
              />
            </label>
            <label>
              Flete total
              <input
                name="freight"
                type="number"
                min="0"
                step="0.01"
                required
                defaultValue="0"
              />
            </label>
            <label>
              Origen
              <input
                name="origin"
                required
                defaultValue="Guadalajara"
                maxLength={120}
              />
            </label>
            <label>
              Destino
              <input
                name="destination"
                required
                defaultValue="Guadalajara"
                maxLength={120}
              />
            </label>
            <label className="market-form-wide">
              Observaciones
              <textarea
                name="notes"
                rows={2}
                maxLength={1000}
                placeholder="Disponibilidad, calidad, condiciones de pago…"
              />
            </label>
            {error && <p role="alert">{error}</p>}
            <button className="primary">Guardar oferta</button>
          </form>
        </Modal>
      )}
    </div>
  );
}
