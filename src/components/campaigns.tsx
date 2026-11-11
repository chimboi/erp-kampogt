"use client";
import { useState } from "react";
import { Megaphone, CalendarClock, Wallet, Settings2 } from "lucide-react";
import { Card, Modal, Table, Badge } from "./ui";
import { clients, suppliers, money } from "@/data";
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
};
const defaults: Campaign[] = [
  {
    id: "quotes",
    name: "Cotización a proveedores",
    enabled: true,
    time: "07:30",
    template: "Buen día {nombre}, ¿a cómo traes la blanca y morada hoy?",
    days: [0, 1, 2, 3, 4, 5],
    recipients: suppliers.map((s) => s.id),
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
const days = ["L", "M", "M", "J", "V", "S", "D"];
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
  const store = useStore();
  const target = 2;
  function recipients(c: Campaign) {
    if (!c.enabled || !c.days.includes(1)) return [];
    const list = c.id === "quotes" ? suppliers : clients;
    return list.filter(
      (contact) =>
        c.recipients.includes(contact.id) &&
        (c.id !== "loading" || schedule[contact.id]?.includes(target)) &&
        (c.id !== "collection" ||
          (store.movements
            .filter((m) => m.contact === contact.id)
            .reduce((a, m) => a + m.charge - m.payment, 0) > 0 &&
            store.movements.some(
              (m) =>
                m.contact === contact.id &&
                m.charge > 0 &&
                (new Date("2026-11-10").getTime() -
                  new Date(m.date).getTime()) /
                  86400000 >
                  c.overdue,
            ))),
    );
  }
  const count = recipients(campaigns.find((c) => c.id === "loading")!).length;
  return (
    <>
      <div className="page-title">
        <h1>Campañas</h1>
        <Badge>Simulación</Badge>
      </div>
      <div className="campaign-grid">
        {campaigns.map((c, i) => {
          const Icon = [Megaphone, CalendarClock, Wallet][i];
          return (
            <Card key={c.id}>
              <div className="flex justify-between">
                <span className="campaign-icon">
                  <Icon size={23} />
                </span>
                <button
                  aria-label={"Activar " + c.name}
                  role="switch"
                  aria-checked={c.enabled}
                  className={"switch " + (c.enabled ? "on" : "")}
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
              <p className="muted text-sm">
                {c.time} ·{" "}
                {c.id === "loading"
                  ? `${count} clientes con carga mañana`
                  : `${c.recipients.length} destinatarios`}
              </p>
              <blockquote>{c.template}</blockquote>
              <div className="flex justify-between items-center">
                <span className={c.enabled ? "positive" : "muted"}>
                  {c.enabled ? "Activa" : "Pausada"}
                </span>
                <button
                  className="secondary"
                  onClick={() => setEditing({ ...c })}
                >
                  <Settings2 size={14} /> Editar
                </button>
              </div>
            </Card>
          );
        })}
      </div>
      <Card>
        <div className="section-heading">
          <div>
            <h2>Días de carga</h2>
            <p className="muted text-sm mt-1">
              Hoy se escribiría a{" "}
              {campaigns.find((c) => c.id === "loading")?.enabled ? count : 0}{" "}
              clientes para la carga de mañana.
            </p>
          </div>
        </div>
        <Table
          heads={[
            "Cliente",
            ...[
              "Lunes",
              "Martes",
              "Miércoles",
              "Jueves",
              "Viernes",
              "Sábado",
              "Domingo",
            ],
          ]}
        >
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
                    aria-label={`${c.name}, ${["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"][i]}`}
                    aria-pressed={schedule[c.id]?.includes(i) || false}
                    onClick={() =>
                      setSchedule((s) => ({
                        ...s,
                        [c.id]: s[c.id]?.includes(i)
                          ? s[c.id].filter((x) => x !== i)
                          : [...(s[c.id] || []), i],
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
              disabled={!campaigns.some((c) => c.enabled)}
              onClick={() =>
                setHistory((h) => [
                  ...campaigns
                    .filter((c) => recipients(c).length > 0)
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
              Simular envíos
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
        <Modal title={editing.name} onClose={() => setEditing(null)}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setCampaigns((all) =>
                all.map((c) => (c.id === editing.id ? editing : c)),
              );
              setEditing(null);
            }}
          >
            <div className="form-grid">
              <label>
                Hora de envío
                <input
                  type="time"
                  value={editing.time}
                  required
                  onChange={(e) =>
                    setEditing({ ...editing, time: e.target.value })
                  }
                />
              </label>
              {editing.id === "collection" && (
                <label>
                  Días de vencimiento
                  <input
                    type="number"
                    min="1"
                    required
                    value={editing.overdue}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        overdue: Number(e.target.value),
                      })
                    }
                  />
                </label>
              )}
            </div>
            <label className="field">
              Días de envío
              <div className="day-pills">
                {days.map((d, i) => (
                  <button
                    type="button"
                    key={i}
                    aria-label={
                      [
                        "Lunes",
                        "Martes",
                        "Miércoles",
                        "Jueves",
                        "Viernes",
                        "Sábado",
                        "Domingo",
                      ][i]
                    }
                    aria-pressed={editing.days.includes(i)}
                    className={editing.days.includes(i) ? "active" : ""}
                    onClick={() =>
                      setEditing({
                        ...editing,
                        days: editing.days.includes(i)
                          ? editing.days.filter((x) => x !== i)
                          : [...editing.days, i],
                      })
                    }
                  >
                    {d}
                  </button>
                ))}
              </div>
            </label>
            <label className="field">
              Plantilla
              <textarea
                rows={4}
                value={editing.template}
                required
                onChange={(e) =>
                  setEditing({ ...editing, template: e.target.value })
                }
              />
            </label>
            <p className="label-caps">Destinatarios</p>
            <div className="recipient-list">
              {(editing.id === "quotes" ? suppliers : clients).map((c) => (
                <label key={c.id}>
                  <input
                    type="checkbox"
                    checked={editing.recipients.includes(c.id)}
                    onChange={() =>
                      setEditing({
                        ...editing,
                        recipients: editing.recipients.includes(c.id)
                          ? editing.recipients.filter((id) => id !== c.id)
                          : [...editing.recipients, c.id],
                      })
                    }
                  />
                  {c.name}
                </label>
              ))}
            </div>
            <button className="primary mt-4">Guardar automatización</button>
          </form>
        </Modal>
      )}
    </>
  );
}
