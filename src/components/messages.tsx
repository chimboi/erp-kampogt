"use client";
import { useEffect, useState, useRef, type RefObject } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  inboxContacts,
  demoDeal,
  demoPreview,
  demoMessages,
} from "@/data/crm-demo";
import "./messages.css";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import {
  Search,
  Settings2,
  Send,
  Bot,
  CheckCheck,
  ArrowLeft,
  ChevronRight,
  X,
} from "lucide-react";
import {
  clients,
  money,
  date,
  purchaseLabels,
  salePaid,
  saleTotal,
  type Contact,
} from "@/data";
import { useTomorrowDate } from "@/lib/crm-date";
import {
  usePersistentState,
  useStore,
  resetMessagesDemoState,
} from "@/lib/store";
import { DEFAULT_PROMPT } from "@/lib/agent/system-prompt";
import { orderSchema, type DetectedOrder } from "@/lib/agent/schema";
import { FRIENDLY_PROMPT } from "@/data/crm-agent-prompt";
import CollectionEditor from "./collection-editor";
import {
  DEFAULT_AUTOMATION,
  reminderClients,
  reminderMessages,
  reminderText,
  type Automation,
  type Reminder,
  type ReminderBatch,
  type ClientSchedule,
} from "@/data/crm-automation";

const contacts = inboxContacts;
const stages = [
  "Cotizando",
  "Por confirmar",
  "Pedido en curso",
  "Esperando pago",
  "Cerrado",
];
const initialStage = (c: Contact) =>
  c.id.startsWith("p") ? "Cotizando" : "Por confirmar";
const crmMoney = (n: number) =>
  n.toLocaleString("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 2,
  });
const isSupplier = (c: Contact) => c.id.startsWith("p");
const roleLabel = (c: Contact) => (isSupplier(c) ? "Proveedor" : "Cliente");
function PartyBadge({ contact }: { contact: Contact }) {
  return (
    <span
      className={"party-tag " + (isSupplier(contact) ? "supplier" : "client")}
    >
      {roleLabel(contact)} · {isSupplier(contact) ? "Compras" : "Ventas"}
    </span>
  );
}
const preview = demoPreview;
const seed = demoMessages;
export default function Messages() {
  const [generation, setGeneration] = useState(0);
  return (
    <MessagesWorkspace
      key={generation}
      onReset={() => setGeneration((g) => g + 1)}
    />
  );
}
function MessagesWorkspace({ onReset }: { onReset: () => void }) {
  const resetting = useRef(false);
  const store = useStore();
  function resetDemo() {
    resetting.current = true;
    resetMessagesDemoState();
    store.setOrders((orders) =>
      orders.filter(
        (order) =>
          !(
            (order.id.startsWith("IA-reminder-") ||
              order.id.startsWith("IA-demo-v2-")) &&
            order.status === "Por confirmar" &&
            !order.saleId &&
            !(order.paid && order.paid > 0)
          ),
      ),
    );
    onReset();
  }
  const [selected, setSelected] = useState(contacts[0].id),
    [kind, setKind] = useState("Todos"),
    [stage, setStage] = useState("Todos"),
    [q, setQ] = useState(""),
    [mobile, setMobile] = useState(false),
    [connected, setConnected] = useState(false),
    [details, setDetails] = useState(false),
    [batchOnly, setBatchOnly] = useState(true);
  const [storedSystem] = usePersistentState("kampo-system-v1", DEFAULT_PROMPT),
    [agents, setAgents] = usePersistentState<Record<string, boolean>>(
      "kampo-agents-v1",
      {},
    );
  const [automation] = usePersistentState<Automation>(
    "kampo-automation-v1",
    DEFAULT_AUTOMATION,
  );
  const [reminders, setReminders] = usePersistentState<
    Record<string, Reminder>
  >("kampo-reminders-v1", {});
  const [schedule] = usePersistentState<ClientSchedule>(
    "kampo-client-schedule-v1",
    {},
  );
  const [batch, setBatch] = usePersistentState<ReminderBatch | null>(
    "kampo-reminder-batch-v2",
    null,
  );
  const tomorrow = useTomorrowDate();
  const scheduled = reminderClients(tomorrow, "loading", schedule);
  const recipients = [
    ...scheduled,
    ...clients.filter((c) => !scheduled.some((s) => s.id === c.id)),
  ].slice(0, 20);
  const sentIds = batch?.ids.slice(0, batch.sentCount) ?? [];
  // One arrival at a time, then stop completely until the operator tries the AI.
  useEffect(() => {
    if (!batch || batch.phase !== "sending") return;
    const timer = window.setTimeout(() => {
      if (resetting.current) return;
      const contact = clients.find((c) => c.id === batch.ids[batch.sentCount]);
      if (!contact) return;
      setReminders((previous) => ({
        ...previous,
        [contact.id]: {
          batchId: batch.id,
          date: batch.date,
          sentAt: new Date().toISOString(),
          text: reminderText(automation.message, contact, batch.date),
          step: 0,
        },
      }));
      setBatch((previous) =>
        previous?.id === batch.id
          ? {
              ...previous,
              sentCount: previous.sentCount + 1,
              phase:
                previous.sentCount + 1 === previous.ids.length
                  ? "ready"
                  : "sending",
            }
          : previous,
      );
    }, 180);
    return () => window.clearTimeout(timer);
  }, [batch, automation.message, setBatch, setReminders]);
  useEffect(() => {
    if (!batch || batch.phase !== "ai") return;
    if (!batch.ids.some((id) => reminders[id]?.step < 4 && agents[id])) return;
    const timer = window.setTimeout(() => {
      if (resetting.current) return;
      setReminders((previous) => {
        const next = { ...previous };
        for (const id of batch.ids) {
          const r = next[id];
          if (r && r.batchId === batch.id && r.step < 4 && agents[id])
            next[id] = { ...r, step: r.step + 1 };
        }
        return next;
      });
    }, 1500);
    return () => window.clearTimeout(timer);
  }, [batch, agents, reminders, setReminders]);
  function sendReminders() {
    if (!tomorrow || !automation.message.trim() || batch?.phase === "sending")
      return;
    const id = crypto.randomUUID();
    const first = recipients[0];
    setReminders((previous) => ({
      ...previous,
      [first.id]: {
        batchId: id,
        date: tomorrow,
        sentAt: new Date().toISOString(),
        text: reminderText(automation.message, first, tomorrow),
        step: 0,
      },
    }));
    setBatch({
      id,
      date: tomorrow,
      ids: recipients.map((c) => c.id),
      sentCount: 1,
      phase: "sending",
    });
    setAgents((previous) => ({
      ...previous,
      ...Object.fromEntries(recipients.map((c) => [c.id, false])),
    }));
    setKind("Clientes");
    setStage("Todos");
    setQ("");
    setBatchOnly(true);
    setSelected(first.id);
    setMobile(false);
  }
  function tryAI() {
    if (!batch || batch.phase !== "ready") return;
    setAgents((previous) => ({
      ...previous,
      ...Object.fromEntries(batch.ids.map((id) => [id, true])),
    }));
    setBatch({ ...batch, phase: "ai" });
    setSelected(batch.ids[0]);
    setBatchOnly(true);
    setKind("Clientes");
    setStage("Todos");
    setQ("");
    setMobile(true);
  }
  const aiComplete =
    !!batch &&
    batch.ids.every(
      (id) => reminders[id]?.batchId === batch.id && reminders[id]?.step === 4,
    );
  const batchContacts = sentIds
    .map((id) => contacts.find((c) => c.id === id)!)
    .filter(Boolean);
  useEffect(() => {
    fetch("/api/agent")
      .then((r) => r.json())
      .then((d) => {
        setConnected(d.connected === true);
      })
      .catch(() => setConnected(false));
  }, []);
  const [contactStages, setContactStages] = usePersistentState<
    Record<string, string>
  >("kampo-contact-stages-v1", {});
  const c = contacts.find((c) => c.id === selected)!;
  const filtered = (batchOnly && batch ? batchContacts : contacts).filter(
    (c) =>
      (kind === "Todos" ||
        (kind === "Clientes" ? c.id.startsWith("c") : c.id.startsWith("p"))) &&
      (stage === "Todos" ||
        (stage === "Agente IA"
          ? agents[c.id] || demoDeal(c).ai
          : (contactStages[c.id] ?? initialStage(c)) === stage)) &&
      c.name.toLowerCase().includes(q.toLowerCase()),
  );
  return (
    <div className="crm-messages">
      <div className="page-title message-toolbar">
        <div>
          <h1>Mensajes</h1>
          <p className="muted">Compras y ventas · Bandeja de demostración</p>
        </div>
        <div className="flex items-center gap-3">
          <span className={"connection " + (connected ? "online" : "")}>
            {connected ? "Agente conectado" : "Agente sin conectar"}
          </span>
          <Link className="secondary" href="/crm/configuracion">
            <Settings2 size={17} /> Configuración
          </Link>
        </div>
      </div>
      <div className="crm-reminder-bar crm-two-step">
        <div>
          <strong>Simula el seguimiento de mañana</strong>
          <p>
            {tomorrow ? date(tomorrow) : "Preparando fecha…"} · Muestra de 20
            clientes · {Math.min(scheduled.length, 20)} con carga programada
            {scheduled.length < 20
              ? ", completada con clientes de muestra"
              : ""}
          </p>
        </div>
        <div className="crm-demo-actions">
          <button
            className="primary"
            disabled={!tomorrow || !!batch || !automation.message.trim()}
            onClick={sendReminders}
          >
            <span aria-hidden="true" className="crm-step-number">
              1
            </span>{" "}
            Enviar recordatorios venta
          </button>
          <button
            className="secondary"
            disabled={batch?.phase !== "ready"}
            onClick={tryAI}
          >
            <span aria-hidden="true" className="crm-step-number">
              2
            </span>
            <Bot size={16} /> Probar IA
          </button>
          <button className="text-link" onClick={resetDemo}>
            Reiniciar demo
          </button>
        </div>
        <div className="crm-batch-progress" role="status" aria-live="polite">
          <span>
            {!batch
              ? "Paso 1: carga 20 recordatorios en la bandeja."
              : batch.phase === "sending"
                ? `Cargando bandeja… ${batch.sentCount} de ${batch.ids.length} mensajes`
                : batch.phase === "ready"
                  ? `${batch.sentCount} recordatorios enviados. Paso 2: pulsa Probar IA para iniciar la conversación.`
                  : aiComplete
                    ? "La IA capturó las solicitudes. Pedidos listos para revisión."
                    : "La IA está atendiendo las respuestas de los clientes…"}
          </span>
          <progress
            aria-label="Recordatorios enviados"
            max={20}
            value={batch?.sentCount ?? 0}
          />
        </div>
      </div>
      <div
        className={
          "inbox " +
          (details ? "details-open " : "") +
          (mobile ? "show-conversation" : "")
        }
      >
        <section className="chat-list">
          <div className="chat-filters">
            {batch && (
              <div className="crm-batch-filter">
                <button
                  className={batchOnly ? "active" : ""}
                  onClick={() => {
                    setBatchOnly(true);
                    setKind("Clientes");
                    setStage("Todos");
                    setQ("");
                  }}
                >
                  Recordatorios <b>{batch.sentCount}</b>
                </button>
                <button
                  className={!batchOnly ? "active" : ""}
                  onClick={() => {
                    setBatchOnly(false);
                    setKind("Todos");
                  }}
                >
                  Ver todos
                </button>
              </div>
            )}
            <div className="search">
              <Search size={16} />
              <input
                aria-label="Buscar conversación"
                placeholder="Buscar conversación"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
            <div className="segmented">
              {["Todos", "Clientes", "Proveedores"].map((k) => (
                <button
                  key={k}
                  className={k === kind ? "active" : ""}
                  onClick={() => {
                    setKind(k);
                    setBatchOnly(false);
                    setStage("Todos");
                    const first = contacts.find(
                      (c) =>
                        k === "Todos" ||
                        (k === "Proveedores" ? isSupplier(c) : !isSupplier(c)),
                    );
                    if (first) setSelected(first.id);
                  }}
                >
                  {k}
                </button>
              ))}
            </div>
            <select
              aria-label="Estado de conversación"
              value={stage}
              onChange={(e) => setStage(e.target.value)}
            >
              {["Todos", ...stages, "Agente IA"].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>
          {filtered.map((c) => (
            <button
              key={c.id}
              className={
                "chat-contact " +
                (batchOnly && batch ? "batch-arrival " : "") +
                (isSupplier(c) ? "supplier-chat " : "client-chat ") +
                (selected === c.id ? "active" : "")
              }
              onClick={() => {
                setSelected(c.id);
                setMobile(true);
              }}
            >
              <span className="avatar">
                {c.name
                  .split(" ")
                  .map((s) => s[0])
                  .slice(0, 2)
                  .join("")}
              </span>
              <div>
                <strong>{c.name}</strong>
                <PartyBadge contact={c} />
                <p>
                  {reminders[c.id]?.batchId === batch?.id && !!batch
                    ? reminders[c.id].step === 4
                      ? "IA: pedido listo para revisión"
                      : reminders[c.id].step === 1 && !agents[c.id]
                        ? "Cliente respondió · IA pausada"
                        : reminders[c.id].step === 0
                          ? "Recordatorio enviado · Esperando Probar IA"
                          : "IA dando seguimiento"
                    : preview(c)}
                </p>
                <small>
                  {batchOnly && batch?.phase !== "ai"
                    ? "✓ Enviado · IA aún sin iniciar"
                    : agents[c.id]
                      ? "✦ Agente IA"
                      : `${demoDeal(c).ai ? "✦ IA · " : ""}${contactStages[c.id] ?? initialStage(c)}`}
                </small>
              </div>
              <time>{sentIds.includes(c.id) ? "Ahora" : "10:42"}</time>
            </button>
          ))}
          {!filtered.length && <p className="empty">Sin conversaciones</p>}
        </section>
        <Conversation
          key={c.id}
          resetting={resetting}
          contact={c}
          system={
            storedSystem === DEFAULT_PROMPT ? FRIENDLY_PROMPT : storedSystem
          }
          enabled={!!agents[c.id]}
          connected={connected}
          reminder={
            reminders[c.id]?.batchId === batch?.id && batch
              ? reminders[c.id]
              : undefined
          }
          simulationStarted={batch?.phase === "ai"}
          details={details}
          onDetails={() => setDetails((v) => !v)}
          onBack={() => setMobile(false)}
          toggle={() => setAgents((a) => ({ ...a, [c.id]: !a[c.id] }))}
        />
        {details && (
          <ContactPanel
            onClose={() => setDetails(false)}
            contact={c}
            stage={contactStages[c.id] ?? initialStage(c)}
            onStage={(value) =>
              setContactStages((previous) => ({ ...previous, [c.id]: value }))
            }
          />
        )}
      </div>
    </div>
  );
}

function Conversation({
  resetting,
  contact,
  system,
  enabled,
  connected,
  reminder,
  simulationStarted,
  details,
  onDetails,
  onBack,
  toggle,
}: {
  resetting: RefObject<boolean>;
  contact: Contact;
  system: string;
  enabled: boolean;
  connected: boolean;
  reminder?: Reminder;
  simulationStarted: boolean;
  details: boolean;
  onDetails: () => void;
  onBack: () => void;
  toggle: () => void;
}) {
  const store = useStore(),
    [input, setInput] = useState(""),
    [notice, setNotice] = useState(""),
    [showHistory, setShowHistory] = useState(false),
    [, setSaved] = usePersistentState<UIMessage[]>(
      "kampo-chat-" + contact.id,
      seed(contact),
    ),
    [created, setCreated] = usePersistentState<string[]>(
      "kampo-created-" + contact.id,
      [],
    );
  const { messages, sendMessage, setMessages, stop, status, error } = useChat({
    id: contact.id,
    messages: seed(contact),
    transport: new DefaultChatTransport({ api: "/api/agent" }),
  });
  useEffect(
    () => () => {
      void stop();
    },
    [stop],
  );
  const bottom = useRef<HTMLDivElement>(null),
    loaded = useRef(false);
  useEffect(() => {
    if (!loaded.current) {
      try {
        const raw = localStorage.getItem("kampo-chat-" + contact.id);
        if (raw) {
          const saved = JSON.parse(raw) as UIMessage[];
          if (Array.isArray(saved)) {
            const custom = saved.filter(
              (m) =>
                !m.id.startsWith("demo-v2-") &&
                m.id !== contact.id + "a" &&
                m.id !== contact.id + "b",
            );
            setMessages([...seed(contact), ...custom]);
          }
        }
      } catch {}
      loaded.current = true;
    }
  }, [contact, setMessages]);
  useEffect(() => {
    bottom.current?.scrollIntoView({ block: "nearest" });
  }, [messages, reminder?.step]);
  const busy = status === "streaming" || status === "submitted";
  useEffect(() => {
    if (!resetting.current && loaded.current && status === "ready")
      setSaved(messages);
  }, [messages, status, setSaved, resetting]);
  const isCreated = (id: string) =>
    created.includes(id) || store.orders.some((o) => o.id === "IA-" + id);
  function create(d: DetectedOrder, id: string) {
    if (isCreated(id)) return;
    store.setOrders((o) => [
      ...o,
      {
        id: "IA-" + id,
        client: d.cliente,
        product: d.producto,
        kg: d.kg,
        price: d.precio_kg,
        date: d.fecha_carga,
        status:
          id.startsWith("demo-v2-") || id.startsWith("reminder-")
            ? "Por confirmar"
            : "Pendiente de carga",
        size: d.tamano,
        freight: d.flete,
        destination: d.destino,
        bags: d.bultos,
      },
    ]);
    setCreated((c) => [...c, id]);
  }
  return (
    <section
      className={
        "conversation " +
        (isSupplier(contact) ? "supplier-conversation" : "client-conversation")
      }
    >
      <header>
        <button
          className="back-chat"
          aria-label="Volver a conversaciones"
          onClick={onBack}
        >
          <ArrowLeft size={18} />
        </button>
        <span className="avatar">{contact.name.slice(0, 2).toUpperCase()}</span>
        <button
          className="crm-contact-heading"
          aria-expanded={details}
          aria-controls="crm-contact-details"
          onClick={onDetails}
        >
          <strong>{contact.name}</strong>
          <PartyBadge contact={contact} />
          <span>
            Ver datos <ChevronRight size={13} />
          </span>
        </button>
        <button
          className="crm-switch"
          role="switch"
          aria-checked={enabled}
          disabled={!!reminder && !simulationStarted}
          onClick={toggle}
        >
          <span className="switch-track" /> Agente IA responde
        </button>
      </header>
      <div className="bubbles">
        {reminder && (
          <button
            className="text-link crm-history-toggle"
            onClick={() => setShowHistory((v) => !v)}
          >
            {showHistory
              ? "Ocultar historial anterior"
              : "Ver historial anterior"}
          </button>
        )}
        <div className="chat-day">
          {reminder && !showHistory
            ? `Recordatorio para ${date(reminder.date)} · Demo`
            : "10 de noviembre · Demo"}
        </div>
        {[
          ...(reminder
            ? showHistory
              ? messages.filter(
                  (m) =>
                    !m.id.startsWith(`manual-reminder-${reminder.batchId}-`),
                )
              : []
            : messages),
          ...reminderMessages(contact, reminder),
          ...(reminder
            ? messages.filter((m) =>
                m.id.startsWith(`manual-reminder-${reminder.batchId}-`),
              )
            : []),
        ].map((m, messageIndex) => (
          <div
            className={
              "bubble " + (m.role === "assistant" ? "outgoing" : "incoming")
            }
            key={m.id}
          >
            {m.id.startsWith("reminder-") && (
              <span className="reminder-message-label">
                {reminder && date(reminder.date)} · Seguimiento de venta ·
                Simulación
              </span>
            )}
            {m.parts.map((part, i) => {
              if (part.type === "text") return <p key={i}>{part.text}</p>;
              if (part.type === "file" && part.mediaType.startsWith("image/"))
                return (
                  <a
                    key={i}
                    href={part.url}
                    target="_blank"
                    rel="noreferrer"
                    className="chat-photo"
                  >
                    <Image
                      src={part.url}
                      alt="Muestra ilustrativa de cebolla blanca, morada y amarilla en arpillas"
                      width={360}
                      height={240}
                      unoptimized
                    />
                    <span>Foto de muestra · Ilustración IA · Ampliar ↗</span>
                  </a>
                );
              if (
                !isSupplier(contact) &&
                part.type === "tool-registrarPedido" &&
                "state" in part &&
                part.state === "output-available" &&
                "output" in part
              ) {
                const parsed = orderSchema.safeParse(part.output);
                if (!parsed.success) return null;
                const d = parsed.data,
                  id = m.id + "-" + i;
                return (
                  <div className="order-detected" key={i}>
                    <strong>
                      <Bot size={15} /> Pedido capturado por IA
                    </strong>
                    <p>Por confirmar · Revisar precio, inventario y flete.</p>
                    <p>
                      {d.cliente} · {d.producto} {d.tamano}
                    </p>
                    <p>
                      {d.bultos} bultos · {d.kg} kg · {crmMoney(d.precio_kg)}
                      /kg
                    </p>
                    <p>
                      {d.destino} · Carga {date(d.fecha_carga)}
                    </p>
                    <p>Flete: {money(d.flete)}</p>
                    {d.kg > 5000 && (
                      <p>Precio sujeto a autorización de Jorge.</p>
                    )}
                    <button
                      className="primary"
                      disabled={isCreated(id)}
                      onClick={() => create(d, id)}
                    >
                      {isCreated(id)
                        ? "Pedido creado"
                        : "Crear pedido por confirmar"}
                    </button>
                  </div>
                );
              }
              return null;
            })}
            <small>
              {m.role === "assistant"
                ? m.id.startsWith("manual-") ||
                  m.id.includes("-manual-") ||
                  m.id === contact.id + "b"
                  ? "Kampo GT · "
                  : "Agente IA · "
                : roleLabel(contact) + " · "}
              {m.id.startsWith("reminder-")
                ? "Demo"
                : `${10 + Math.floor((12 + messageIndex * 2) / 60)}:${String((12 + messageIndex * 2) % 60).padStart(2, "0")}`}{" "}
              {m.role === "assistant" && <CheckCheck size={13} />}
            </small>
          </div>
        ))}
        {reminder && reminder.step < 4 && (
          <p className="crm-simulation-status" role="status">
            {!simulationStarted
              ? "Recordatorio enviado. Pulsa «Probar IA» para simular la respuesta del cliente y la atención del agente."
              : reminder.step === 0 || reminder.step === 2
                ? "El cliente está escribiendo… (simulación)"
                : enabled
                  ? "El agente IA está preparando su respuesta… (simulación)"
                  : "El cliente respondió. Activa «Agente IA responde» para continuar la simulación."}
          </p>
        )}
        {busy && <p className="muted">El agente está respondiendo…</p>}
        {(notice || error) && (
          <p role="alert" className="chat-notice">
            {notice ||
              "No se pudo obtener la respuesta. Revisa la conexión del agente."}
          </p>
        )}
        <div ref={bottom} />
      </div>
      <form
        className="composer"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!input.trim() || busy) return;
          setNotice("");
          if (enabled && !reminder && !connected) {
            setNotice(
              "Agente sin conectar. Agrega ANTHROPIC_API_KEY en el servidor para activar las respuestas.",
            );
            return;
          }
          const text = input;
          setInput("");
          if (enabled && !reminder)
            await sendMessage(
              { text },
              {
                body: {
                  system:
                    system +
                    `\nContacto actual: ${contact.name}. Rol: ${roleLabel(contact)}. ` +
                    (isSupplier(contact)
                      ? "Actúa como comprador de Kampo GT. Recaba cotización, origen, tamaños, kilos, precio y flete. No uses registrarPedido: es exclusiva para ventas a clientes."
                      : "Actúa como vendedor de Kampo GT."),
                },
              },
            );
          else {
            const next: UIMessage[] = [
              ...messages,
              {
                id:
                  (reminder
                    ? `manual-reminder-${reminder.batchId}-`
                    : "manual-") + crypto.randomUUID(),
                role: "assistant",
                parts: [{ type: "text", text }],
              },
            ];
            setMessages(next);
            setSaved(next);
          }
        }}
      >
        <input
          aria-label="Mensaje"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={
            enabled && !reminder
              ? `Escribe como ${roleLabel(contact).toLowerCase()} para probar el agente…`
              : "Escribe un mensaje de demostración…"
          }
        />
        <button
          className="primary"
          aria-label="Enviar mensaje"
          disabled={busy || !input.trim()}
        >
          <Send size={18} />
        </button>
      </form>
      <p className="composer-note">
        {enabled && !reminder
          ? `Simulación como ${roleLabel(contact).toLowerCase()} · Respuestas del agente IA`
          : "Simulación local · No se envía a WhatsApp"}
      </p>
    </section>
  );
}
function ContactPanel({
  contact,
  stage,
  onStage,
  onClose,
}: {
  onClose: () => void;
  contact: Contact;
  stage: string;
  onStage: (value: string) => void;
}) {
  const store = useStore();
  const [collecting, setCollecting] = useState(false);
  const [schedule] = usePersistentState<ClientSchedule>(
    "kampo-client-schedule-v1",
    {},
  );
  const pending =
    store.sales
      .filter((sale) => sale.client === contact.id)
      .reduce(
        (sum, sale) => sum + Math.max(0, saleTotal(sale) - salePaid(sale)),
        0,
      ) +
    store.orders
      .filter((order) => !order.saleId && order.client === contact.name)
      .reduce(
        (sum, order) =>
          sum + Math.max(0, order.kg * order.price - (order.paid ?? 0)),
        0,
      );
  const labels = purchaseLabels(store.shipments);
  const balance = store.movements
    .filter((m) => m.contact === contact.id)
    .reduce((a, m) => a + m.charge - m.payment, 0);
  const shipments = store.shipments;
  const recent = isSupplier(contact)
    ? shipments
        .filter((s) => s.supplier === contact.id)
        .slice(-3)
        .map((s) => s.id)
    : Array.from(
        new Set(
          store.sales
            .filter((s) => s.client === contact.id)
            .map((s) => s.shipment),
        ),
      ).slice(-3);
  return (
    <aside
      className="contact-panel"
      id="crm-contact-details"
      aria-label="Datos del contacto"
    >
      <button
        className="secondary crm-details-close"
        aria-label="Cerrar datos del contacto"
        onClick={onClose}
      >
        <X size={16} /> Cerrar datos
      </button>
      <div className="avatar large">
        {contact.name
          .split(" ")
          .map((s) => s[0])
          .slice(0, 2)
          .join("")}
      </div>
      <h3>{contact.name}</h3>
      <div className="contact-role">
        <PartyBadge contact={contact} />
      </div>
      <p className="muted">{contact.city}</p>
      <p className="muted text-xs">
        {(schedule[contact.id]?.phone ?? contact.phone) ||
          "Sin teléfono registrado"}
      </p>
      <DealSummary contact={contact} />
      <hr />
      <p className="label-caps">
        {isSupplier(contact) ? "Origen de la compra" : "Días de carga"}
      </p>
      {isSupplier(contact) && <p className="text-sm mt-3">{contact.city}</p>}
      <div className="day-pills" hidden={isSupplier(contact)}>
        {["L", "M", "M", "J", "V", "S", "D"].map((d, i) => (
          <span
            key={i}
            className={
              (schedule[contact.id]?.days ?? contact.days).includes(i)
                ? "active"
                : ""
            }
          >
            {d}
          </span>
        ))}
      </div>
      <p className="label-caps mt-6">
        {isSupplier(contact)
          ? "Saldo por pagar al proveedor"
          : "Saldo por cobrar al cliente"}
      </p>
      <strong className="text-2xl">
        {money(isSupplier(contact) ? balance : pending)}
      </strong>
      <hr />
      <label className="field">
        Estado de la conversación
        <select
          aria-label="Estado del contacto"
          value={stage}
          onChange={(event) => onStage(event.target.value)}
        >
          {stages.map((value) => (
            <option key={value}>{value}</option>
          ))}
        </select>
      </label>
      {!isSupplier(contact) && (
        <div className="crm-pending">
          <p className="label-caps">Cobranza de ventas y pedidos</p>
          <button
            className="secondary"
            disabled={pending <= 0}
            onClick={() => setCollecting(true)}
          >
            Cobrar pendientes
          </button>
        </div>
      )}
      {collecting && (
        <CollectionEditor
          clientId={contact.id}
          onClose={() => setCollecting(false)}
          onSaved={() => setCollecting(false)}
        />
      )}
      <p className="label-caps">Últimas compras vinculadas</p>
      {recent.map((id) => (
        <div className="recent-shipment" key={id}>
          <strong>{labels.get(id) ?? id}</strong>
          <small>{date(shipments.find((s) => s.id === id)!.date)}</small>
        </div>
      ))}
      {!recent.length && (
        <p className="muted text-sm">Sin embarques registrados</p>
      )}
    </aside>
  );
}

function DealSummary({ contact }: { contact: Contact }) {
  const d = demoDeal(contact);
  return (
    <div className="crm-deal-summary">
      <strong>
        <Bot size={16} /> {d.ai ? "Resumen del agente" : "Resumen comercial"}
      </strong>
      <small>Conversación demo · Por confirmar</small>
      <p>
        {d.supplier ? "Oferta de compra" : "Solicitud de venta"} · {d.product}
      </p>
      <dl>
        <div>
          <dt>Volumen</dt>
          <dd>{d.kg.toLocaleString("es-MX")} kg</dd>
        </div>
        <div>
          <dt>Precio negociado</dt>
          <dd>{d.price.toFixed(2)} MXN/kg</dd>
        </div>
        <div>
          <dt>Producto</dt>
          <dd>{money(d.total)}</dd>
        </div>
        <div>
          <dt>Flete</dt>
          <dd>{money(d.freight)}</dd>
        </div>
        <div>
          <dt>Total con flete</dt>
          <dd>{money(d.total + d.freight)}</dd>
        </div>
      </dl>
      <p className="crm-next-step">
        {d.supplier
          ? `Costo puesto: ${((d.total + d.freight) / d.kg).toFixed(2)} MXN/kg. Comparar con otras ofertas antes de comprar.`
          : "Revisar existencia y autorizar precio antes de confirmar al cliente."}
      </p>
      <small>
        Anticipo {d.supplier ? "solicitado" : "propuesto"}:{" "}
        {crmMoney(d.total / 2)}. Sin pago registrado.
      </small>
    </div>
  );
}
