"use client";
import { useState } from "react";
import { BookOpen, Bot, History, Truck } from "lucide-react";
import { usePersistentState } from "@/lib/store";
import {
  CATALOG_KEY,
  emptyCatalog,
  catalogToday,
  catalogTiers,
  catalogProducts,
  catalogRoutes,
  catalogPrice,
  catalogDayOffset,
  type CatalogState,
} from "@/data/catalog";
import { DataTable, type Column } from "./data-table";
import { Badge, Card, Modal } from "./ui";
import "./catalog.css";

const money = (n: number) =>
  n.toLocaleString("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 2,
  });
type PriceRow = {
  id: string;
  name: string;
  tier: string;
  tierIndex?: number;
  price: number;
  previous: number;
  manual: boolean;
};
function PriceCell({
  row,
  onSave,
}: {
  row: PriceRow;
  onSave: (row: PriceRow, value: number) => string | null;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(row.price));
  const [error, setError] = useState("");
  return editing ? (
    <div className="catalog-edit">
      <input
        autoFocus
        aria-label={`Precio ${row.name} ${row.tier}`}
        type="number"
        min="0.01"
        step="0.01"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape") setEditing(false);
        }}
      />
      <button
        className="text-link"
        onClick={() => {
          const issue = onSave(row, Number(draft));
          if (issue) setError(issue);
          else {
            setEditing(false);
            setError("");
          }
        }}
      >
        Guardar
      </button>
      <button className="text-link" onClick={() => setEditing(false)}>
        Cancelar
      </button>
      {error && <small role="alert">{error}</small>}
    </div>
  ) : (
    <button
      className="catalog-price"
      title="Clic para editar precio"
      onClick={() => {
        setDraft(String(row.price));
        setEditing(true);
      }}
    >
      {money(row.price)} <span>✎</span>
    </button>
  );
}
export default function Catalog() {
  const [catalog, setCatalog] = usePersistentState<CatalogState>(
    CATALOG_KEY,
    emptyCatalog,
  );
  const [tab, setTab] = useState<"product" | "freight">("product");
  const [day, setDay] = useState(catalogToday);
  const [history, setHistory] = useState<PriceRow | null>(null);
  const [notice, setNotice] = useState("");
  const previous = catalogDayOffset(day, -1);
  const row = (
    id: string,
    name: string,
    tier: string,
    tierIndex?: number,
  ): PriceRow => ({
    id,
    name,
    tier,
    tierIndex,
    price: catalogPrice(catalog, id, day),
    previous: catalogPrice(catalog, id, previous),
    manual: catalog.changes.some((c) => c.key === id && c.date <= day),
  });
  const rows =
    tab === "product"
      ? catalogProducts.flatMap((name) =>
          catalogTiers.map((tier, i) =>
            row(`product:${name}:${i}`, name, tier.label, i),
          ),
        )
      : catalogRoutes.map((name) => row(`freight:${name}`, name, "Por viaje"));
  function save(item: PriceRow, price: number) {
    if (!Number.isFinite(price) || price <= 0)
      return "Ingresa un precio mayor a cero.";
    if (item.tierIndex !== undefined) {
      const i = item.tierIndex;
      if (
        (i > 0 &&
          price >=
            catalogPrice(catalog, `product:${item.name}:${i - 1}`, day)) ||
        (i < 4 &&
          price <= catalogPrice(catalog, `product:${item.name}:${i + 1}`, day))
      )
        return "El precio debe bajar conforme aumenta el volumen. Revisa los rangos vecinos.";
    }
    if (price !== item.price)
      setCatalog((state) => ({
        changes: [
          ...state.changes,
          {
            id: crypto.randomUUID(),
            key: item.id,
            date: day,
            timestamp: new Date().toISOString(),
            before: item.price,
            price: Math.round(price * 100) / 100,
          },
        ],
      }));
    setNotice(
      `Precio de ${item.name} guardado. ${day <= catalogToday() ? "El agente ya utiliza el catálogo vigente." : "Se aplicará a partir de la fecha seleccionada."}`,
    );
    return null;
  }
  const columns: Column<PriceRow>[] = [
    {
      id: "name",
      label: tab === "product" ? "Producto" : "Destino desde GDL",
      value: (r) => r.name,
      render: (r) =>
        tab === "product" ? (
          <Badge>{r.name}</Badge>
        ) : (
          <strong>Guadalajara → {r.name}</strong>
        ),
    },
    {
      id: "tier",
      label: tab === "product" ? "Volumen (kg)" : "Unidad",
      value: (r) => r.tierIndex ?? 0,
      filterValue: (r) => r.tier,
      render: (r) => r.tier,
    },
    {
      id: "price",
      label: tab === "product" ? "Precio / kg" : "Precio / viaje",
      value: (r) => r.price,
      render: (r) => <PriceCell key={`${r.id}-${day}`} row={r} onSave={save} />,
    },
    {
      id: "previous",
      label: "Día anterior",
      value: (r) => r.previous,
      render: (r) => <span className="muted">{money(r.previous)}</span>,
    },
    {
      id: "change",
      label: "Variación",
      value: (r) => r.price - r.previous,
      render: (r) => (
        <span className={r.price <= r.previous ? "catalog-down" : "catalog-up"}>
          {r.price === r.previous
            ? "Sin cambio"
            : `${r.price > r.previous ? "+" : ""}${money(r.price - r.previous)}`}
        </span>
      ),
    },
    {
      id: "agent",
      label: "Precio agente hoy",
      value: (r) => catalogPrice(catalog, r.id),
      render: (r) => (
        <strong className="catalog-agent-price">
          {money(catalogPrice(catalog, r.id))}
        </strong>
      ),
    },
    {
      id: "source",
      label: "Origen",
      value: (r) => (r.manual ? "Editado" : "Tabulador demo"),
      render: (r) => (
        <span className="muted">
          {r.manual ? "Editado · vigente" : "Tabulador demo"}
        </span>
      ),
    },
    {
      id: "history",
      label: "Histórico",
      value: (r) => catalog.changes.filter((c) => c.key === r.id).length,
      render: (r) => (
        <button className="text-link" onClick={() => setHistory(r)}>
          <History size={14} /> Ver histórico
        </button>
      ),
    },
  ];
  const historicalRows = history
    ? Array.from({ length: 14 }, (_, i) => {
        const date = catalogDayOffset(day, -i);
        return {
          id: date,
          date,
          price: catalogPrice(catalog, history.id, date),
        };
      })
    : [];
  const edits = history
    ? catalog.changes.filter((c) => c.key === history.id)
    : [];
  return (
    <div className="catalog-page">
      <div className="catalog-heading">
        <div>
          <p className="eyebrow">CRM · PRECIOS Y COTIZACIONES</p>
          <h1>Catálogo</h1>
          <p className="muted">
            Precios por volumen y rutas de entrega, conectados con tu agente.
          </p>
        </div>
        <label className="catalog-date">
          Fecha del tabulador
          <input
            aria-label="Fecha del tabulador"
            type="date"
            value={day}
            onChange={(e) => {
              if (e.target.value) setDay(e.target.value);
            }}
          />
        </label>
      </div>
      <div className="catalog-agent-note">
        <Bot size={22} />
        <div>
          <strong>Una sola referencia para cotizar</strong>
          <p>
            El agente usa los precios vigentes de hoy ({catalogToday()}). Edita
            una celda para actualizar el catálogo y conservar su histórico.
          </p>
        </div>
        <span className="badge">MXN</span>
      </div>
      <div className="cash-tabs">
        <button
          className={tab === "product" ? "active" : ""}
          onClick={() => setTab("product")}
        >
          <BookOpen size={16} /> Productos
        </button>
        <button
          className={tab === "freight" ? "active" : ""}
          onClick={() => setTab("freight")}
        >
          <Truck size={16} /> Fletes
        </button>
      </div>
      {notice && (
        <p className="catalog-notice" role="status">
          {notice}
        </p>
      )}
      <Card>
        <div className="catalog-table-head">
          <div>
            <h2>
              {tab === "product"
                ? "Mejor precio al comprar más"
                : "Tabulador de fletes"}
            </h2>
            <p className="muted">
              {tab === "product"
                ? "Blanca, Morada y Amarilla · cinco rangos de volumen"
                : "Origen Guadalajara · tarifa por viaje"}
            </p>
          </div>
          <span className="muted">{day} · clic en el precio para editar</span>
        </div>
        <DataTable
          key={tab}
          rows={rows}
          columns={columns}
          rowId={(r) => r.id}
          pageSize={20}
        />
      </Card>
      <p className="catalog-footnote">
        Precios de demostración. El tabulador base varía diariamente; tus
        precios editados se conservan hasta el siguiente cambio. Histórico
        guardado en este navegador.
      </p>
      {history && (
        <Modal
          title={`Histórico · ${history.name} · ${history.tier}`}
          onClose={() => setHistory(null)}
        >
          <p className="muted">
            Referencia diaria de las últimas dos semanas. Los días sin edición
            usan el tabulador demo o el último precio vigente.
          </p>
          <DataTable
            rows={historicalRows}
            columns={[
              { id: "date", label: "Fecha", value: (r) => r.date },
              {
                id: "price",
                label: "Precio vigente",
                value: (r) => r.price,
                render: (r) => money(r.price),
              },
            ]}
            rowId={(r) => r.id}
            pageSize={7}
            initialSort={{ id: "date", direction: "desc" }}
          />
          <h3>Registro de ediciones</h3>
          {edits.length ? (
            <DataTable
              rows={edits}
              columns={[
                {
                  id: "timestamp",
                  label: "Editado",
                  value: (r) => r.timestamp,
                  render: (r) => new Date(r.timestamp).toLocaleString("es-MX"),
                },
                { id: "date", label: "Vigencia desde", value: (r) => r.date },
                {
                  id: "before",
                  label: "Anterior",
                  value: (r) => r.before,
                  render: (r) => money(r.before),
                },
                {
                  id: "price",
                  label: "Nuevo",
                  value: (r) => r.price,
                  render: (r) => money(r.price),
                },
              ]}
              rowId={(r) => r.id}
              pageSize={5}
              initialSort={{ id: "timestamp", direction: "desc" }}
            />
          ) : (
            <p className="muted">Todavía no hay ediciones para esta tarifa.</p>
          )}
        </Modal>
      )}
    </div>
  );
}
