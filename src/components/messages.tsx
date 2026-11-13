"use client";
import { useEffect, useState, useRef } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import {
  Search,
  Settings2,
  Send,
  Bot,
  CheckCheck,
  ArrowLeft,
} from "lucide-react";
import {
  clients,
  suppliers,
  money,
  date,
  purchaseLabels,
  salePaid,
  saleTotal,
  type Contact,
} from "@/data";
import { usePersistentState, useStore } from "@/lib/store";
import { DEFAULT_PROMPT } from "@/lib/agent/system-prompt";
import { orderSchema, type DetectedOrder } from "@/lib/agent/schema";
import { Badge, Modal } from "./ui";
import CollectionEditor from "./collection-editor";
const contacts = [...clients, ...suppliers];
const stages = ["Cotizando", "Pedido en curso", "Esperando pago", "Cerrado"];
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
const previews = [
  "Buen día, ¿a cómo traes la morada?",
  "¿Me apartas 20 bultos de blanca?",
  "Ya quedó la transferencia, Jorge.",
  "Gracias, recibimos todo completo.",
  "¿Sale mañana el flete para Tepic?",
  "¿Qué precio tiene la blanca por bulto?",
];
const supplierPreviews = [
  "Tengo blanca a $2.90 en Salamanca. ¿Cuántos kilos necesitas?",
  "La morada está lista para cargar el jueves.",
  "Te comparto el precio de compra de esta semana.",
  "El camión salió. Te envío la remisión de compra.",
];
const preview = (c: Contact) =>
  isSupplier(c)
    ? supplierPreviews[
        suppliers.findIndex((p) => p.id === c.id) % supplierPreviews.length
      ]
    : previews[clients.findIndex((p) => p.id === c.id) % previews.length];
const seed = (c: Contact): UIMessage[] => [
  {
    id: c.id + "a",
    role: "user",
    parts: [
      {
        type: "text",
        text: `Buen día, soy ${c.name}. ${preview(c)}`,
      },
    ],
  },
  {
    id: c.id + "b",
    role: "assistant",
    parts: [
      {
        type: "text",
        text: isSupplier(c)
          ? "Gracias. ¿Qué tamaños tienes disponibles y cuánto sale el flete a Guadalajara?"
          : "¡Buen día! Claro, déjame revisar disponibilidad y te confirmo.",
      },
    ],
  },
];
export default function Messages() {
  const [selected, setSelected] = useState(contacts[0].id),
    [kind, setKind] = useState("Todos"),
    [stage, setStage] = useState("Todos"),
    [q, setQ] = useState(""),
    [settings, setSettings] = useState(false),
    [mobile, setMobile] = useState(false),
    [connected, setConnected] = useState(false),
    [model, setModel] = useState("claude-sonnet-5-5");
  const [system, setSystem] = usePersistentState(
      "kampo-system-v1",
      DEFAULT_PROMPT,
    ),
    [agents, setAgents] = usePersistentState<Record<string, boolean>>(
      "kampo-agents-v1",
      {},
    );
  useEffect(() => {
    fetch("/api/agent")
      .then((r) => r.json())
      .then((d) => {
        setConnected(d.connected === true);
        if (d.model) setModel(d.model);
      })
      .catch(() => setConnected(false));
  }, []);
  const [contactStages, setContactStages] = usePersistentState<
    Record<string, string>
  >("kampo-contact-stages-v1", {});
  const c = contacts.find((c) => c.id === selected)!;
  const filtered = contacts.filter(
    (c, i) =>
      (kind === "Todos" ||
        (kind === "Clientes" ? c.id.startsWith("c") : c.id.startsWith("p"))) &&
      (stage === "Todos" ||
        (stage === "Agente IA"
          ? agents[c.id]
          : (contactStages[c.id] ?? stages[i % 4]) === stage)) &&
      c.name.toLowerCase().includes(q.toLowerCase()),
  );
  return (
    <>
      <div className="page-title message-toolbar">
        <div className="flex items-center gap-3">
          <span className={"connection " + (connected ? "online" : "")}>
            {connected ? "Agente conectado" : "Agente sin conectar"}
          </span>
          <button
            className="secondary"
            aria-label="Configurar agente"
            onClick={() => setSettings(true)}
          >
            <Settings2 size={17} />
          </button>
        </div>
      </div>
      <div className={"inbox " + (mobile ? "show-conversation" : "")}>
        <section className="chat-list">
          <div className="chat-filters">
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
                <p>{preview(c)}</p>
                <small>
                  {agents[c.id]
                    ? "✦ Agente IA"
                    : (contactStages[c.id] ?? stages[contacts.indexOf(c) % 4])}
                </small>
              </div>
              <time>10:42</time>
            </button>
          ))}
          {!filtered.length && <p className="empty">Sin conversaciones</p>}
        </section>
        <Conversation
          key={c.id}
          contact={c}
          system={system}
          enabled={!!agents[c.id]}
          connected={connected}
          onBack={() => setMobile(false)}
          toggle={() => setAgents((a) => ({ ...a, [c.id]: !a[c.id] }))}
        />
        <ContactPanel
          contact={c}
          stage={contactStages[c.id] ?? stages[contacts.indexOf(c) % 4]}
          onStage={(value) =>
            setContactStages((previous) => ({ ...previous, [c.id]: value }))
          }
        />
      </div>
      {settings && (
        <Modal title="Agente IA" onClose={() => setSettings(false)}>
          <label className="field">
            Instrucciones del agente
            <textarea
              rows={12}
              value={system}
              maxLength={12000}
              onChange={(e) => setSystem(e.target.value)}
            />
          </label>
          <div className="ledger-line">
            <span>Modelo</span>
            <Badge>{model}</Badge>
          </div>
          <button
            className="secondary"
            onClick={() => setSystem(DEFAULT_PROMPT)}
          >
            Restaurar instrucciones
          </button>
        </Modal>
      )}
    </>
  );
}
function Conversation({
  contact,
  system,
  enabled,
  connected,
  onBack,
  toggle,
}: {
  contact: Contact;
  system: string;
  enabled: boolean;
  connected: boolean;
  onBack: () => void;
  toggle: () => void;
}) {
  const store = useStore(),
    [input, setInput] = useState(""),
    [notice, setNotice] = useState(""),
    [, setSaved] = usePersistentState<UIMessage[]>(
      "kampo-chat-" + contact.id,
      seed(contact),
    ),
    [created, setCreated] = usePersistentState<string[]>(
      "kampo-created-" + contact.id,
      [],
    );
  const { messages, sendMessage, setMessages, status, error } = useChat({
    id: contact.id,
    messages: seed(contact),
    transport: new DefaultChatTransport({ api: "/api/agent" }),
  });
  const bottom = useRef<HTMLDivElement>(null),
    loaded = useRef(false);
  useEffect(() => {
    if (!loaded.current) {
      try {
        const raw = localStorage.getItem("kampo-chat-" + contact.id);
        if (raw) setMessages(JSON.parse(raw));
      } catch {}
      loaded.current = true;
    }
  }, [contact.id, setMessages]);
  useEffect(() => {
    bottom.current?.scrollIntoView({ block: "nearest" });
  }, [messages]);
  const busy = status === "streaming" || status === "submitted";
  useEffect(() => {
    if (loaded.current && status === "ready") setSaved(messages);
  }, [messages, status, setSaved]);
  function create(d: DetectedOrder, id: string) {
    if (created.includes(id)) return;
    store.setOrders((o) => [
      ...o,
      {
        id: "IA-" + id,
        client: d.cliente,
        product: d.producto,
        kg: d.kg,
        price: d.precio_kg,
        date: d.fecha_carga,
        status: "Pendiente de carga",
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
        <div>
          <strong>{contact.name}</strong>
          <PartyBadge contact={contact} />
        </div>
        <button
          className={"agent-toggle " + (enabled ? "on" : "")}
          role="switch"
          aria-checked={enabled}
          onClick={toggle}
        >
          <Bot size={16} /> Agente IA
        </button>
      </header>
      <div className="bubbles">
        <div className="chat-day">10 de noviembre · Demo</div>
        {messages.map((m) => (
          <div
            className={
              "bubble " + (m.role === "assistant" ? "outgoing" : "incoming")
            }
            key={m.id}
          >
            {m.parts.map((part, i) => {
              if (part.type === "text") return <p key={i}>{part.text}</p>;
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
                    <strong>Pedido detectado</strong>
                    <p>
                      {d.cliente} · {d.producto} {d.tamano}
                    </p>
                    <p>
                      {d.bultos} bultos · {d.kg} kg · {money(d.precio_kg)}/kg
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
                      disabled={created.includes(id)}
                      onClick={() => create(d, id)}
                    >
                      {created.includes(id) ? "Pedido creado" : "Crear pedido"}
                    </button>
                  </div>
                );
              }
              return null;
            })}
            <small>
              {m.role === "assistant"
                ? m.id.startsWith("manual-") || m.id === contact.id + "b"
                  ? "Kampo GT · "
                  : "Agente IA · "
                : roleLabel(contact) + " · "}
              10:42 {m.role === "assistant" && <CheckCheck size={13} />}
            </small>
          </div>
        ))}
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
          if (enabled && !connected) {
            setNotice(
              "Agente sin conectar. Agrega ANTHROPIC_API_KEY en el servidor para activar las respuestas.",
            );
            return;
          }
          const text = input;
          setInput("");
          if (enabled)
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
                id: "manual-" + crypto.randomUUID(),
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
            enabled
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
        {enabled
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
}: {
  contact: Contact;
  stage: string;
  onStage: (value: string) => void;
}) {
  const store = useStore();
  const [collecting, setCollecting] = useState(false);
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
    <aside className="contact-panel">
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
        {contact.phone || "Sin teléfono registrado"}
      </p>
      <hr />
      <p className="label-caps">
        {isSupplier(contact) ? "Origen de la compra" : "Días de carga"}
      </p>
      {isSupplier(contact) && <p className="text-sm mt-3">{contact.city}</p>}
      <div className="day-pills" hidden={isSupplier(contact)}>
        {["L", "M", "M", "J", "V", "S", "D"].map((d, i) => (
          <span key={i} className={contact.days.includes(i) ? "active" : ""}>
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
