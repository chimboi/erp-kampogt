import type { UIMessage } from "ai";
import { clients, suppliers, money, TODAY, type Contact } from "@/data";

// A stable activity order: 1 client, 2 suppliers, 3 clients, 1 supplier.
export const inboxContacts: Contact[] = [];
let ci = 0,
  pi = 0;
while (ci < clients.length || pi < suppliers.length) {
  for (const [kind, count] of [
    ["c", 1],
    ["p", 2],
    ["c", 3],
    ["p", 1],
  ] as const) {
    for (let n = 0; n < count; n++) {
      const contact = kind === "c" ? clients[ci++] : suppliers[pi++];
      if (contact) inboxContacts.push(contact);
    }
  }
}
export function demoDeal(c: Contact) {
  const index = Number(c.id.slice(1));
  const supplier = c.id.startsWith("p");
  const product = (["Morada", "Blanca", "Amarilla"] as const)[index % 3];
  const kg = [750, 1200, 500, 900, 1500][index % 5];
  const price = (supplier ? [6.8, 5.2, 6.1] : [10.5, 8.5, 9.2])[index % 3];
  const freight = [650, 900, 450, 700, 1100][index % 5];
  const ai = index % 3 !== 2;
  return {
    supplier,
    product,
    kg,
    price,
    freight,
    ai,
    total: kg * price,
    index,
  };
}
const priceText = (n: number) =>
  n.toLocaleString("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 2,
  });
export function demoPreview(c: Contact) {
  const d = demoDeal(c);
  return d.supplier
    ? `${d.kg} kg de ${d.product.toLowerCase()} a ${priceText(d.price)}/kg · flete ${money(d.freight)}`
    : `${d.kg} kg de ${d.product.toLowerCase()} · ${d.ai ? "Pedido capturado por IA" : "Precio por confirmar"}`;
}
export function demoMessages(c: Contact): UIMessage[] {
  const d = demoDeal(c);
  const who = d.ai ? "ai" : "manual";
  const entries: ["user" | "assistant", string][] = d.supplier
    ? [
        [
          "user",
          `Buen día, Jorge. Tengo ${d.kg} kg de cebolla ${d.product.toLowerCase()} mediana en ${c.city}. Te la ofrezco a ${priceText(d.price + 0.5)}/kg, en arpillas de 25 kg.`,
        ],
        [
          "assistant",
          `${d.ai ? "Hola, soy el asistente de Kampo GT. " : "Buen día. "}¿Está seca y pareja? Mándame foto de la selección y cotízame el flete a nuestra bodega de Guadalajara.`,
        ],
        [
          "user",
          "Sí, viene seca, sin brote. Esta es una muestra de las variedades que estamos trabajando.",
        ],
        [
          "assistant",
          `Para los ${d.kg} kg, ¿nos mejoras a ${priceText(d.price)}/kg? Necesitamos revisar el costo puesto en bodega antes de autorizar.`,
        ],
        [
          "user",
          `Llevándote el lote completo sí te respeto ${priceText(d.price)}/kg. El flete sale en ${money(d.freight)}, descarga por cuenta de ustedes.`,
        ],
        [
          "assistant",
          `Entonces son ${money(d.total)} de cebolla + ${money(d.freight)} de flete = ${money(d.total + d.freight)} puesto en Guadalajara. ¿Cuándo puedes cargar y cómo sería el pago?`,
        ],
        [
          "user",
          "Puedo cargar mañana a las 7. Pido 50% de la cebolla para apartar y el resto al recibir. El flete se paga al chofer.",
        ],
        [
          "assistant",
          `Recibido: anticipo solicitado de ${priceText(d.total / 2)}. Dejo la cotización para revisión de Jorge; todavía no está autorizada la compra ni el pago.`,
        ],
        [
          "user",
          "Va, avísame para apartar el camión. Te paso peso y remisión al cargar.",
        ],
      ]
    : [
        [
          "user",
          `Buen día. Necesito ${d.kg} kg de cebolla ${d.product.toLowerCase()} mediana para ${c.city}. ¿A cómo la tienes y cuánto sale el flete?`,
        ],
        [
          "assistant",
          `${d.ai ? "Hola, soy el asistente de Kampo GT. Te ayudo a tomar el pedido. " : "Buen día, te atiende Jorge. "}La cotización es ${priceText(d.price + 0.5)}/kg. ¿La quieres en arpillas de 25 kg y para cargar mañana?`,
        ],
        [
          "user",
          "Sí, de 25 kg. Mándame foto para ver el tamaño; la necesito seca y pareja.",
        ],
        [
          "assistant",
          "Te comparto una muestra de nuestra selección. Confirmamos el lote y el peso antes de cargar.",
        ],
        [
          "user",
          `Se ve bien. Si te llevo los ${d.kg} kg, ¿me la dejas a ${priceText(d.price)}/kg? Inclúyeme el flete por separado.`,
        ],
        [
          "assistant",
          `Anoto tu propuesta de ${priceText(d.price)}/kg: ${money(d.total)} de producto. Flete cotizado a ${c.city}: ${money(d.freight)}. Total con flete: ${money(d.total + d.freight)}; el precio final lo autoriza Jorge.`,
        ],
        [
          "user",
          `De acuerdo. Serían ${d.kg / 25} arpillas. Recibimos mañana de 8 a 12; puedo dar ${priceText(d.total / 2)} de anticipo del producto y liquidar al recibir.`,
        ],
        [
          "assistant",
          `Capturé ${d.kg} kg de ${d.product.toLowerCase()}, destino ${c.city}, carga mañana. Anticipo propuesto: ${priceText(d.total / 2)}; aún no hay pago recibido. Jorge revisará precio, existencia y transporte antes de confirmar.`,
        ],
        [
          "user",
          "Perfecto, quedo pendiente de la confirmación para hacer la transferencia.",
        ],
      ];
  return entries.map(([role, text], i) => ({
    id: `demo-v2-${c.id}-${role === "assistant" ? who : "contact"}-${i}`,
    role,
    parts: [
      { type: "text", text },
      ...((d.supplier ? i === 2 : i === 3)
        ? [
            {
              type: "file" as const,
              mediaType: "image/jpeg",
              url: "/crm/cebollas-demo.jpg",
              filename: "Muestra de cebollas · imagen ilustrativa IA",
            },
          ]
        : []),
      ...(!d.supplier && d.ai && i === 7
        ? [
            {
              type: "tool-registrarPedido" as const,
              toolCallId: `demo-${c.id}`,
              state: "output-available" as const,
              input: {},
              output: {
                cliente: c.name,
                producto: d.product,
                tamano: "MED",
                bultos: d.kg / 25,
                kg: d.kg,
                precio_kg: d.price,
                destino: c.city,
                fecha_carga: new Date(
                  new Date(TODAY + "T12:00:00Z").getTime() + 86400000,
                )
                  .toISOString()
                  .slice(0, 10),
                flete: d.freight,
              },
            },
          ]
        : []),
    ],
  }));
}
