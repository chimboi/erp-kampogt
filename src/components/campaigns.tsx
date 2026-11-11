"use client";
import { useState } from "react";
import {
  Plus,
  Megaphone,
  CalendarClock,
  Wallet,
  Settings2,
  Users,
  Truck,
} from "lucide-react";
import { Card, Modal, Table, Badge } from "./ui";
import { clients, suppliers, money, TODAY, type Contact } from "@/data";
import { usePersistentState, useStore } from "@/lib/store";
type Campaign = {
  id: string;
  name: string;
  enabled: boolean;
  time: string;
  template: string;
  days: number[];
  recipients: string[];
  overdue: number;
  audience?: "clients" | "suppliers";
  kind?: "broadcast" | "quotes" | "loading" | "collection";
  contactDays?: Record<string, number[]>;
};
const defaults: Campaign[] = [
  {
    id: "quotes",
    name: "Cotización a proveedores",
    enabled: true,
    time: "07:30",
    template: "Buen día {nombre}, ¿a cómo traes la blanca y morada hoy?",
    days: [0, 1, 2, 3, 4, 5],
    recipients: suppliers.map((c) => c.id),
    overdue: 7,
  },
  {
    id: "loading",
    name: "Recordatorio por día de carga",
    enabled: true,
    time: "08:00",
    template:
      "Buen día {nombre}, mañana te toca carga. ¿Cuántos bultos te apartamos?",
    days: [0, 1, 2, 3, 4, 5, 6],
    recipients: clients.map((c) => c.id),
    overdue: 7,
  },
  {
    id: "collection",
    name: "Seguimiento de cobranza",
    enabled: false,
    time: "10:00",
    template:
      "Hola {nombre}, te recordamos tu saldo pendiente. ¿Nos apoyas con tu fecha de pago?",
    days: [0, 2, 4],
    recipients: clients.slice(0, 10).map((c) => c.id),
    overdue: 7,
  },
];
const days = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const fullDays = [
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
  "Domingo",
];
const audience = (c: Campaign) =>
  c.audience ?? (c.id === "quotes" ? "suppliers" : "clients");
const kind = (c: Campaign) =>
  c.kind ??
  (["quotes", "loading", "collection"].includes(c.id) ? c.id : "broadcast");
const contacts = (c: Campaign) =>
  audience(c) === "suppliers" ? suppliers : clients;
const toggleDay = (values: number[], day: number) =>
  values.includes(day)
    ? values.filter((d) => d !== day)
    : [...values, day].sort();
export default function Campaigns() {
  const [campaigns, setCampaigns] = usePersistentState(
      "kampo-campaigns-v1",
      defaults,
    ),
    [schedule, setSchedule] = usePersistentState<Record<string, number[]>>(
      "kampo-schedule-v1",
      Object.fromEntries(clients.map((c) => [c.id, c.days])),
    ),
    [editing, setEditing] = useState<Campaign | null>(null),
    [history, setHistory] = usePersistentState("kampo-campaign-history-v1", [
      {
        id: "seed",
        time: "10 nov · 08:00",
        campaign: "Recordatorio por día de carga",
        count: 8,
      },
    ]);
  const store = useStore(),
    today = (new Date(TODAY + "T12:00:00").getDay() + 6) % 7;
  function recipients(c: Campaign) {
    if (!c.enabled) return [];
    return contacts(c).filter(
      (contact) =>
        c.recipients.includes(contact.id) &&
        (c.contactDays?.[contact.id] ?? c.days).includes(today) &&
        (kind(c) !== "loading" ||
          schedule[contact.id]?.includes((today + 1) % 7)) &&
        (kind(c) !== "collection" ||
          (store.movements
            .filter((m) => m.contact === contact.id)
            .reduce((a, m) => a + m.charge - m.payment, 0) > 0 &&
            store.movements.some(
              (m) =>
                m.contact === contact.id &&
                m.charge > 0 &&
                (new Date(TODAY).getTime() - new Date(m.date).getTime()) /
                  86400000 >
                  c.overdue,
            ))),
    );
  }
  return (
    <>
      <div className="page-title">
        <h1>Campañas</h1>
        <button
          className="primary"
          onClick={() =>
            setEditing({
              id: crypto.randomUUID(),
              name: "",
              enabled: true,
              time: "09:00",
              template: "Hola {nombre}, ",
              days: [0, 1, 2, 3, 4],
              recipients: [],
              overdue: 7,
              audience: "clients",
              kind: "broadcast",
            })
          }
        >
          <Plus size={17} /> Nueva campaña
        </button>
      </div>
      <div className="campaign-intro">
        <Badge>Simulación</Badge>
        <span>Elige a quién escribir, qué días y qué mensaje enviar.</span>
      </div>
      <div className="campaign-grid">
        {campaigns.map((c) => {
          const Icon =
            kind(c) === "loading"
              ? CalendarClock
              : kind(c) === "collection"
                ? Wallet
                : Megaphone;
          const list = contacts(c).filter((p) => c.recipients.includes(p.id));
          return (
            <Card key={c.id}>
              <div className="flex justify-between">
                <span className="campaign-icon">
                  <Icon size={23} />
                </span>
                <button
                  className={"switch " + (c.enabled ? "on" : "")}
                  aria-label={"Activar " + c.name}
                  role="switch"
                  aria-checked={c.enabled}
                  onClick={() =>
                    setCampaigns((all) =>
                      all.map((x) =>
                        x.id === c.id ? { ...x, enabled: !x.enabled } : x,
                      ),
                    )
                  }
                />
              </div>
              <h2>{c.name}</h2>
              <span
                className={
                  "party-tag " +
                  (audience(c) === "suppliers" ? "supplier" : "client")
                }
              >
                {audience(c) === "suppliers" ? "Proveedores" : "Clientes"} ·{" "}
                {list.length}
              </span>
              <p className="campaign-calendar">
                {c.days.map((d) => days[d]).join(" · ")} a las {c.time}
              </p>
              {!!Object.keys(c.contactDays ?? {}).length && (
                <small>Días personalizados por contacto</small>
              )}
              <p className="campaign-recipients">
                {list
                  .slice(0, 3)
                  .map((c) => c.name)
                  .join(", ")}
                {list.length > 3 ? ` y ${list.length - 3} más` : ""}
              </p>
              <blockquote>{c.template}</blockquote>
              <div className="flex justify-between items-center">
                <span className={c.enabled ? "positive" : "muted"}>
                  {c.enabled ? `${recipients(c).length} envíos hoy` : "Pausada"}
                </span>
                <button
                  className="secondary"
                  aria-label={"Editar " + c.name}
                  onClick={() =>
                    setEditing({
                      ...c,
                      audience: audience(c),
                      kind: kind(c) as Campaign["kind"],
                    })
                  }
                >
                  <Settings2 size={14} /> Editar campaña
                </button>
              </div>
            </Card>
          );
        })}
      </div>
      <Card>
        <details>
          <summary className="schedule-summary">
            <CalendarClock size={18} />
            <strong>Calendario de carga de clientes</strong>
            <span>Ver y ajustar</span>
          </summary>
          <p className="muted text-sm my-4">
            Estos son días de carga. Los recordatorios se programan un día
            antes, dentro de los días de envío elegidos en cada campaña.
          </p>
          <Table heads={["Cliente", ...fullDays]}>
            {clients.map((c) => (
              <tr key={c.id}>
                <td>{c.name}</td>
                {days.map((d, i) => (
                  <td key={i}>
                    <button
                      className={
                        "day-check " +
                        (schedule[c.id]?.includes(i) ? "checked" : "")
                      }
                      aria-label={`${c.name}, carga ${fullDays[i]}`}
                      aria-pressed={schedule[c.id]?.includes(i) || false}
                      onClick={() =>
                        setSchedule((s) => ({
                          ...s,
                          [c.id]: toggleDay(s[c.id] ?? [], i),
                        }))
                      }
                    >
                      {schedule[c.id]?.includes(i) ? "✓" : "·"}
                    </button>
                  </td>
                ))}
              </tr>
            ))}
          </Table>
        </details>
      </Card>
      <div className="two-cols">
        <Card>
          <h2>Precios de compra recibidos</h2>
          <Table heads={["Proveedor", "Blanca / kg", "Morada / kg"]}>
            {suppliers.map((s, i) => (
              <tr key={s.id}>
                <td>{s.name}</td>
                <td>{money(2.9 + i * 0.2)}</td>
                <td>{money(5.8 + i * 0.3)}</td>
              </tr>
            ))}
          </Table>
        </Card>
        <Card>
          <div className="section-heading">
            <h2>Historial simulado</h2>
            <button
              className="secondary"
              disabled={!campaigns.some((c) => recipients(c).length)}
              onClick={() =>
                setHistory((h) => [
                  ...campaigns
                    .filter((c) => recipients(c).length)
                    .map((c) => ({
                      id: crypto.randomUUID(),
                      time: "10 nov · " + c.time,
                      campaign: c.name,
                      count: recipients(c).length,
                    })),
                  ...h,
                ])
              }
            >
              Simular envíos de hoy
            </button>
          </div>
          {history.map((h) => (
            <div className="history-row" key={h.id}>
              <span className="history-dot" />
              <div>
                <strong>{h.campaign}</strong>
                <small>
                  {h.time} · {h.count} destinatarios · Simulado
                </small>
              </div>
            </div>
          ))}
        </Card>
      </div>
      {editing && (
        <CampaignEditor
          campaign={editing}
          isNew={!campaigns.some((c) => c.id === editing.id)}
          onClose={() => setEditing(null)}
          onSave={(c) => {
            setCampaigns((all) =>
              all.some((x) => x.id === c.id)
                ? all.map((x) => (x.id === c.id ? c : x))
                : [...all, c],
            );
            setEditing(null);
          }}
        />
      )}
    </>
  );
}
function DayButtons({
  value,
  onChange,
  label,
}: {
  value: number[];
  onChange: (days: number[]) => void;
  label: string;
}) {
  return (
    <div className="week-buttons">
      {days.map((d, i) => (
        <button
          type="button"
          key={d}
          aria-label={`${label}: ${fullDays[i]}`}
          aria-pressed={value.includes(i)}
          className={value.includes(i) ? "active" : ""}
          onClick={() => onChange(toggleDay(value, i))}
        >
          {d}
        </button>
      ))}
    </div>
  );
}
function CampaignEditor({
  campaign,
  isNew,
  onClose,
  onSave,
}: {
  campaign: Campaign;
  isNew: boolean;
  onClose: () => void;
  onSave: (c: Campaign) => void;
}) {
  const [draft, setDraft] = useState(campaign),
    [query, setQuery] = useState(""),
    [error, setError] = useState("");
  const list = contacts(draft),
    visible = list.filter((c) =>
      c.name.toLowerCase().includes(query.toLowerCase()),
    ),
    selected = list.filter((c) => draft.recipients.includes(c.id));
  function select(c: Contact) {
    setDraft((d) => ({
      ...d,
      recipients: d.recipients.includes(c.id)
        ? d.recipients.filter((id) => id !== c.id)
        : [...d.recipients, c.id],
    }));
  }
  return (
    <Modal title={isNew ? "Nueva campaña" : "Editar campaña"} onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (
            !draft.name.trim() ||
            !draft.template.trim() ||
            !selected.length ||
            !draft.days.length
          ) {
            setError(
              "Completa el nombre, mensaje, al menos un destinatario y un día de envío.",
            );
            return;
          }
          if (
            selected.some(
              (c) => !(draft.contactDays?.[c.id] ?? draft.days).length,
            )
          ) {
            setError("Cada destinatario debe tener al menos un día de envío.");
            return;
          }
          onSave({
            ...draft,
            name: draft.name.trim(),
            recipients: selected.map((c) => c.id),
            contactDays: Object.fromEntries(
              Object.entries(draft.contactDays ?? {}).filter(([id]) =>
                selected.some((c) => c.id === id),
              ),
            ),
          });
        }}
      >
        <label className="field">
          Nombre de la campaña
          <input
            autoFocus
            required
            placeholder="Ej. Precios de la semana"
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          />
        </label>
        <section className="campaign-step">
          <h2>
            <b>1</b> ¿A quién se envía?
          </h2>
          <div className="audience-buttons">
            {(["clients", "suppliers"] as const).map((a) => (
              <button
                type="button"
                key={a}
                aria-pressed={audience(draft) === a}
                className={audience(draft) === a ? "active" : ""}
                onClick={() => {
                  if (a !== audience(draft)) {
                    setDraft({
                      ...draft,
                      audience: a,
                      recipients: [],
                      contactDays: {},
                      kind: "broadcast",
                    });
                    setQuery("");
                  }
                }}
              >
                {a === "clients" ? <Users size={18} /> : <Truck size={18} />}{" "}
                {a === "clients" ? "Clientes" : "Proveedores"}
              </button>
            ))}
          </div>
          <div className="toolbar">
            <input
              aria-label="Buscar destinatarios"
              placeholder="Buscar por nombre…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <button
              type="button"
              className="text-link"
              onClick={() =>
                setDraft({
                  ...draft,
                  recipients: Array.from(
                    new Set([...draft.recipients, ...visible.map((c) => c.id)]),
                  ),
                })
              }
            >
              Seleccionar {query ? "resultados" : "todos"}
            </button>
            <button
              type="button"
              className="text-link"
              onClick={() => setDraft({ ...draft, recipients: [] })}
            >
              Limpiar
            </button>
            <span className="muted">{selected.length} seleccionados</span>
          </div>
          <div className="recipient-list campaign-select-list">
            {visible.map((c) => (
              <label key={c.id}>
                <input
                  type="checkbox"
                  checked={draft.recipients.includes(c.id)}
                  onChange={() => select(c)}
                />
                <span>
                  {c.name}
                  <small>{c.city}</small>
                </span>
              </label>
            ))}
          </div>
          {!visible.length && (
            <p className="muted">No hay contactos con ese nombre.</p>
          )}
        </section>
        <section className="campaign-step">
          <h2>
            <b>2</b> ¿Qué días y a qué hora?
          </h2>
          <DayButtons
            label="Días de envío"
            value={draft.days}
            onChange={(days) => setDraft({ ...draft, days })}
          />
          <div className="form-grid">
            <label>
              Hora de envío
              <input
                type="time"
                required
                value={draft.time}
                onChange={(e) => setDraft({ ...draft, time: e.target.value })}
              />
            </label>
            <label>
              Cuándo enviar
              <select
                value={kind(draft)}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    kind: e.target.value as Campaign["kind"],
                  })
                }
              >
                <option value="broadcast">Cada día seleccionado</option>
                {audience(draft) === "suppliers" ? (
                  <option value="quotes">Solicitar cotización</option>
                ) : (
                  <>
                    <option value="loading">Un día antes de su carga</option>
                    <option value="collection">Solo con saldo vencido</option>
                  </>
                )}
              </select>
            </label>
            {kind(draft) === "collection" && (
              <label>
                Días de vencimiento
                <input
                  type="number"
                  min="1"
                  max="365"
                  required
                  value={draft.overdue}
                  onChange={(e) =>
                    setDraft({ ...draft, overdue: e.target.valueAsNumber })
                  }
                />
              </label>
            )}
          </div>
          {kind(draft) === "loading" && (
            <p className="muted text-sm">
              Se usa el calendario de carga de cada cliente y se escribe un día
              antes, solo si ese día está seleccionado aquí.
            </p>
          )}
          {!!selected.length && (
            <details className="contact-days">
              <summary>Personalizar días por destinatario</summary>
              {selected.map((c) => (
                <div key={c.id}>
                  <strong>{c.name}</strong>
                  <DayButtons
                    label={c.name}
                    value={draft.contactDays?.[c.id] ?? draft.days}
                    onChange={(days) =>
                      setDraft({
                        ...draft,
                        contactDays: { ...draft.contactDays, [c.id]: days },
                      })
                    }
                  />
                  {draft.contactDays?.[c.id] && (
                    <button
                      type="button"
                      className="text-link"
                      onClick={() => {
                        const rest = { ...draft.contactDays };
                        delete rest[c.id];
                        setDraft({ ...draft, contactDays: rest });
                      }}
                    >
                      Usar días generales
                    </button>
                  )}
                </div>
              ))}
            </details>
          )}
        </section>
        <section className="campaign-step">
          <h2>
            <b>3</b> ¿Qué mensaje reciben?
          </h2>
          <label className="field">
            Mensaje
            <textarea
              aria-label="Mensaje"
              required
              rows={4}
              value={draft.template}
              onChange={(e) => setDraft({ ...draft, template: e.target.value })}
            />
          </label>
          <button
            className="text-link"
            type="button"
            onClick={() =>
              setDraft({ ...draft, template: draft.template + "{nombre}" })
            }
          >
            + Insertar nombre del contacto
          </button>
          <div className="message-preview">
            <small>Vista previa · {selected[0]?.name ?? "Contacto"}</small>
            <p>
              {draft.template.replaceAll(
                "{nombre}",
                selected[0]?.name ?? "Jorge",
              )}
            </p>
          </div>
        </section>
        <div className="campaign-save-summary">
          <strong>
            {selected.length}{" "}
            {audience(draft) === "suppliers" ? "proveedores" : "clientes"}
          </strong>
          <span>
            {draft.days.map((d) => days[d]).join(", ") || "Elige los días"} ·{" "}
            {draft.time}
          </span>
        </div>
        {error && (
          <p role="alert" className="negative text-sm my-3">
            {error}
          </p>
        )}
        <div className="editor-actions">
          <button type="button" className="secondary" onClick={onClose}>
            Cancelar
          </button>
          <button className="primary">
            {isNew ? "Crear campaña" : "Guardar campaña"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
