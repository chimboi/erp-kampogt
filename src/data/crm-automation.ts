import { emptyCatalog, type CatalogState } from "./catalog";
import type { UIMessage } from "ai";
import { clients, type Contact } from "@/data";
import { demoDeal } from "./crm-demo";

export const DEFAULT_AUTOMATION = {
  enabled: true,
  time: "16:00",
  days: [0, 1, 2, 3, 4, 5],
  audience: "loading" as "loading" | "all",
  autoReply: false,
  message:
    "Hola {nombre}, estamos organizando las entregas de mañana, {fecha}. ¿Cuántos kilos de cebolla vas a necesitar? Dinos variedad, destino y horario para preparar tu pedido. — Kampo GT",
};
export type Automation = typeof DEFAULT_AUTOMATION;
export type ClientSchedule = Record<string, { days: number[]; phone: string }>;
export type ReminderBatch = {
  id: string;
  date: string;
  ids: string[];
  sentCount: number;
  phase: "sending" | "ready" | "ai" | "done";
};
export const WEEKDAYS = [
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
  "Domingo",
];
export type Reminder = {
  batchId?: string;
  date: string;
  sentAt: string;
  text: string;
  step: number;
};
export function tomorrowDate() {
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Mexico_City",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  return new Date(new Date(today + "T12:00:00Z").getTime() + 86400000)
    .toISOString()
    .slice(0, 10);
}
export function reminderClients(
  date: string,
  audience: Automation["audience"],
  schedule: ClientSchedule = {},
) {
  if (!date) return [];
  const day = (new Date(date + "T12:00:00Z").getUTCDay() + 6) % 7;
  return clients.filter(
    (c) => audience === "all" || (schedule[c.id]?.days ?? c.days).includes(day),
  );
}
export function reminderText(template: string, c: Contact, date: string) {
  if (!date)
    return template
      .replaceAll("{nombre}", c.name)
      .replaceAll("{fecha}", "mañana");
  return template.replaceAll("{nombre}", c.name).replaceAll(
    "{fecha}",
    new Date(date + "T12:00:00Z").toLocaleDateString("es-MX", {
      day: "numeric",
      month: "long",
      timeZone: "UTC",
    }),
  );
}
export function reminderMessages(
  c: Contact,
  r?: Reminder,
  catalog: CatalogState = emptyCatalog,
): UIMessage[] {
  if (!r) return [];
  const d = demoDeal(c, catalog);
  const texts = [
    r.text,
    `Gracias por avisar. Para mañana necesito ${d.kg} kg de ${d.product.toLowerCase()}, en arpillas de 25 kg. ¿A cómo me la dejas y cuánto sale el flete a ${c.city}?`,
    `Soy el asistente de Kampo GT. Tomo tu solicitud de ${d.kg} kg de ${d.product.toLowerCase()}. Como referencia demo: $${d.price.toFixed(2)}/kg y $${d.freight} de flete. Jorge confirmará precio y disponibilidad. ¿Recibes de 8 a 12 y en el destino habitual?`,
    "Sí, de 8 a 12 en la misma bodega. Confírmame el total para organizar el anticipo.",
    `Dejo tu solicitud lista para revisar: ${d.kg / 25} arpillas, ${d.kg} kg, $${d.total.toFixed(2)} de producto y $${d.freight.toFixed(2)} de flete. Total propuesto: $${(d.total + d.freight).toFixed(2)}. Carga ${r.date}. Falta autorización de Jorge; todavía no hay pago recibido.`,
  ];
  return texts.slice(0, r.step + 1).map((text, i) => ({
    id: `reminder-${r.batchId ?? r.date}-${c.id}-${i === 0 ? "manual" : "auto"}-${i}`,
    role: i % 2 === 0 ? "assistant" : "user",
    parts: [
      { type: "text", text },
      ...(i === 4
        ? [
            {
              type: "tool-registrarPedido" as const,
              toolCallId: `reminder-${r.date}-${c.id}`,
              state: "output-available" as const,
              input: {},
              output: {
                cliente: c.name,
                producto: d.product,
                tamano: "MED",
                kg: d.kg,
                bultos: d.kg / 25,
                precio_kg: d.price,
                flete: d.freight,
                destino: c.city,
                fecha_carga: r.date,
              },
            },
          ]
        : []),
    ],
  }));
}
