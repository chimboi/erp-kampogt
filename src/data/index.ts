import loadingDays from "./loading-days.json";
export const TODAY = "2026-11-10";
export const money = (n: number) =>
  new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(n);
export const number = (n: number) =>
  new Intl.NumberFormat("es-MX", { maximumFractionDigits: 1 }).format(n);
export const date = (s: string) =>
  new Date(s + "T12:00:00").toLocaleDateString("es-MX", {
    day: "numeric",
    month: "short",
  });
export type Contact = {
  id: string;
  name: string;
  phone: string;
  days: number[];
  city: string;
  balance: number;
};
export const clients: Contact[] = [
  { name: "Abel Aguayo", phone: "", days: [1, 4], balance: 305792 },
  { name: "Abarrey", phone: "", days: [0, 3], balance: 248600 },
  { name: "Andrés Lomelí", phone: "", days: [2, 5], balance: 142800 },
  ...loadingDays.map((c, i) => ({
    ...c,
    balance: 18000 + ((i * 7919) % 112000),
  })),
].map((c, i) => ({
  ...c,
  id: "c" + i,
  city: ["Guadalajara", "Monterrey", "Culiacán", "Tepic", "La Paz", "León"][
    i % 6
  ],
}));
export const suppliers: Contact[] = [
  "Alberto Paez",
  "Antonio Huerta",
  "Gustavo Aguilar",
  "Santa Fe de Camargo",
  "Lalito Porras",
  "Hnos. Márquez",
  "Pelon",
  "Castro",
  "DDavid",
  "Mony",
].map((name, i) => ({
  id: "p" + i,
  name,
  phone: "",
  days: [],
  city: [
    "Salamanca",
    "Zacatecas",
    "Loreto, Zac.",
    "Camargo",
    "Delicias",
    "Aguascalientes",
  ][i % 6],
  balance: 280000 - i * 31000,
}));
export type Sale = {
  time?: string;
  id: string;
  shipment: string;
  client: string;
  date: string;
  product: "Blanca" | "Morada" | "Amarilla";
  kg: number;
  price: number;
  cash: boolean;
  paid?: number;
};
export type Shipment = {
  id: string;
  name: string;
  supplier: string;
  origin: string;
  date: string;
  product: "Blanca" | "Morada" | "Amarilla";
  kg: number;
  purchase: number;
  freight: number;
  unloading: number;
  scale: number;
  handling: number;
  scale2?: number;
  scale3?: number;
  purchaseTotal?: number;
};
export const shipments: Shipment[] = Array.from({ length: 66 }, (_, i) => {
  const month = Math.floor(i / 6) + 1,
    day = month === 11 ? [2, 4, 6, 8, 10, 10][i % 6] : 3 + (i % 6) * 4;
  return {
    id: "e" + i,
    name: `#${i + 1} ${["Mario", "Gela", "Moni", "Martín", "Lalo", "Omar"][i % 6]}`,
    supplier: suppliers[i % 6].id,
    origin: suppliers[i % 6].city,
    date: `2026-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
    product: i % 3 === 0 || i === 65 ? "Morada" : "Blanca",
    kg: 18000 + (i % 5) * 1000,
    purchase: i % 3 === 0 || i === 65 ? 6.2 : 3.1,
    freight: 16000 + (i % 4) * 1500,
    unloading: 1200,
    scale: 450,
    handling: 900,
  };
});
export const sales: Sale[] = shipments.flatMap((s, i) =>
  Array.from({ length: 4 }, (_, j) => ({
    id: `v${i}-${j}`,
    time: ["08:00", "10:00", "12:00", "14:00"][j],
    shipment: s.id,
    client: clients[(i + j) % Math.min(clients.length, 18)].id,
    date: s.date,
    product: s.product,
    kg: s.kg / 4,
    price: s.purchase + 2.2 + (j % 3) * 0.6,
    cash: j % 3 === 0,
  })),
);
export const saleTotal = (s: Sale) => Math.round(s.kg * s.price * 100) / 100;
export const purchaseCost = (s: Shipment) =>
  s.purchaseTotal ?? s.kg * s.purchase;
export const cost = (s: Shipment) =>
  purchaseCost(s) +
  s.freight +
  s.unloading +
  s.scale +
  (s.scale2 ?? 0) +
  (s.scale3 ?? 0) +
  s.handling;
export const clientName = (id: string) =>
  clients.find((c) => c.id === id)?.name ?? "Diversos";
export const shipmentName = (id: string) =>
  shipments.find((s) => s.id === id)?.name ?? id;
export const statuses = [
  "Pendiente de carga",
  "Cargado",
  "Recibido",
  "Pend. pago",
  "Pagado",
];
export type Order = {
  saleId?: string;
  supplier?: string;
  purchase?: number;
  paid?: number;
  time?: string;
  id: string;
  client: string;
  product: "Blanca" | "Morada" | "Amarilla";
  kg: number;
  price: number;
  date: string;
  status: string;
  size?: string;
  freight?: number;
  destination?: string;
  bags?: number;
};
export const orders: Order[] = shipments.slice(-12).map((s, i) => ({
  id: "PED-" + (1041 + i),
  client: clients[i % 12].name,
  supplier: s.supplier,
  purchase: s.purchase,
  paid: i % 5 === 4 ? (s.kg / 4) * (s.purchase + 2.8) : 0,
  product: s.product,
  kg: s.kg / 4,
  price: s.purchase + 2.8,
  date: s.date,
  status: statuses[i % 5],
}));
// Daily demo activity supplements the original records without replacing user edits.
for (let day = 0; day < 41; day++) {
  const date = new Date(Date.UTC(2026, 9, 1 + day)).toISOString().slice(0, 10);
  const count = 30 + ((day * 7) % 13);
  for (let group = 0; group < 4; group++) {
    const supplier = suppliers[6 + ((day + group) % 4)];
    const product = group % 2 ? "Morada" : "Blanca";
    const purchase = product === "Morada" ? 6.2 : 3.1;
    const shipmentId = `daily-${date}-${group}`;
    const rows: Sale[] = [];
    for (let j = group; j < count; j += 4) {
      const kg = 250 + ((day * 11 + j * 7) % 20) * 25;
      const price =
        Math.round((purchase + 2.2 + ((day + j) % 5) * 0.3) * 100) / 100;
      const total = Math.round(kg * price * 100) / 100;
      const paid =
        Math.round(total * [1, 0, 0.5, 0.75, 1][(day + j) % 5] * 100) / 100;
      const row: Sale = {
        id: `daily-sale-${date}-${j}`,
        shipment: shipmentId,
        client: clients[(day * 3 + j) % clients.length].id,
        date,
        time: `${String(7 + Math.floor(j / 4)).padStart(2, "0")}:${String((j % 4) * 15).padStart(2, "0")}`,
        product,
        kg,
        price,
        cash: paid === total,
        paid,
      };
      rows.push(row);
      orders.push({
        id: `PED-${date.replaceAll("-", "")}-${String(j + 1).padStart(2, "0")}`,
        saleId: row.id,
        supplier: supplier.id,
        purchase,
        paid,
        client: clientName(row.client),
        product,
        kg,
        price,
        date,
        time: row.time,
        status: paid === total ? "Pagado" : "Pend. pago",
      });
    }
    shipments.push({
      id: shipmentId,
      name: `#${date.slice(5)}-${group + 1} ${supplier.name}`,
      supplier: supplier.id,
      origin: supplier.city,
      date,
      product,
      kg: rows.reduce((sum, row) => sum + row.kg, 0),
      purchase,
      freight: 1800,
      unloading: 250,
      scale: 100,
      handling: 150,
    });
    sales.push(...rows);
  }
}
// Yellow-onion activity uses separate IDs so previously saved rows stay intact.
for (let day = 0; day < 41; day++) {
  const date = new Date(Date.UTC(2026, 9, 1 + day)).toISOString().slice(0, 10);
  const supplier = suppliers[6 + (day % 4)];
  const shipmentId = `daily-yellow-${date}`;
  const rows: Sale[] = Array.from({ length: 3 }, (_, j) => {
    const kg = 300 + ((day + j) % 6) * 50,
      price = 6.5 + (day % 3) * 0.25;
    const total = kg * price,
      paid = j === 0 ? total : j === 1 ? total / 2 : 0;
    const sale: Sale = {
      id: `daily-yellow-sale-${date}-${j}`,
      shipment: shipmentId,
      client: clients[(day + j * 5) % clients.length].id,
      date,
      time: `16:${j * 15 || "00"}`,
      product: "Amarilla",
      kg,
      price,
      paid,
      cash: paid === total,
    };
    orders.push({
      id: `PED-${date.replaceAll("-", "")}-${46 + j}`,
      saleId: sale.id,
      supplier: supplier.id,
      purchase: 4.1,
      paid,
      client: clientName(sale.client),
      product: sale.product,
      kg,
      price,
      date,
      time: sale.time,
      status: paid === total ? "Pagado" : "Pend. pago",
    });
    return sale;
  });
  shipments.push({
    id: shipmentId,
    name: `#${date.slice(5)}-A ${supplier.name}`,
    supplier: supplier.id,
    origin: supplier.city,
    date,
    product: "Amarilla",
    kg: rows.reduce((sum, row) => sum + row.kg, 0),
    purchase: 4.1,
    freight: 350,
    unloading: 100,
    scale: 50,
    handling: 50,
  });
  sales.push(...rows);
}
export const legacyDemoSales = sales.map((row) => ({ ...row }));
export const legacyDemoShipments = shipments.map((row) => ({ ...row }));
export const legacyDemoOrders = orders.map((row) => ({ ...row }));
// Commercial demo: each active day in Oct–Nov sells roughly $200k–$300k.
for (let day = 0; day < 41; day++) {
  const date = new Date(Date.UTC(2026, 9, 1 + day)).toISOString().slice(0, 10);
  const rows = sales.filter((row) => row.date === date);
  const factor =
    (200000 + ((day * 7919) % 100000)) /
    rows.reduce((sum, row) => sum + saleTotal(row), 0);
  for (const row of rows) {
    const fraction = row.cash ? 1 : (row.paid ?? 0) / saleTotal(row);
    row.kg = Math.round(row.kg * factor * 100) / 100;
    if (row.paid !== undefined)
      row.paid = Math.round(saleTotal(row) * fraction * 100) / 100;
  }
  for (const shipment of shipments.filter((row) => row.date === date))
    shipment.kg = sales
      .filter((row) => row.shipment === shipment.id)
      .reduce((sum, row) => sum + row.kg, 0);
  for (const order of orders.filter((row) => row.date === date)) {
    const sale = rows.find((row) => row.id === order.saleId);
    if (sale) {
      order.kg = sale.kg;
      order.paid = sale.paid;
    } else {
      order.kg = Math.round(order.kg * factor * 100) / 100;
      if (order.paid !== undefined)
        order.paid = Math.round(order.paid * factor * 100) / 100;
    }
  }
}
export const paymentStatus = (total: number, paid: number) =>
  paid >= total ? "Cobrado" : paid > 0 ? "Anticipo" : "Pendiente";
export const salePaid = (sale: Sale) =>
  Math.min(
    saleTotal(sale),
    Math.max(0, sale.cash ? saleTotal(sale) : (sale.paid ?? 0)),
  );
export function shortOrderId(id: string) {
  const match = /^PED-(\d{4})(\d{2})(\d{2})-(\d+)$/.exec(id);
  if (match) {
    const day = Math.round(
      (Date.UTC(+match[1], +match[2] - 1, +match[3]) - Date.UTC(2026, 0, 1)) /
        86400000,
    );
    return `P-${2000 + day * 50 + Number(match[4])}`;
  }
  return id.replace(/^PED-/, "P-");
}
export function mergeDemoRecords<T extends { id: string }>(
  saved: T[],
  seed: T[],
  legacy: T[] = [],
): T[] {
  const ids = new Set(saved.map((row) => row.id));
  const defaults = new Map(seed.map((row) => [row.id, row]));
  const originals = new Map(legacy.map((row) => [row.id, row]));
  return [
    ...saved.map((row) => {
      const original = originals.get(row.id);
      const unchanged =
        original &&
        Object.entries(original).every(
          ([key, value]) =>
            !(key in row) ||
            JSON.stringify((row as Record<string, unknown>)[key]) ===
              JSON.stringify(value),
        );
      return unchanged
        ? { ...row, ...(defaults.get(row.id) ?? {}) }
        : { ...defaults.get(row.id), ...row };
    }),
    ...seed.filter(
      (row) =>
        (row.id.startsWith("daily-") || /^PED-2026/.test(row.id)) &&
        !ids.has(row.id),
    ),
  ];
}
export type Movement = {
  id: string;
  contact: string;
  date: string;
  charge: number;
  payment: number;
  method: string;
  note: string;
};
// Six months of illustrative invoices and payments; closing balances remain unchanged.
export const seedMovements: Movement[] = [...clients, ...suppliers].flatMap(
  (c, index) =>
    Array.from({ length: 12 }, (_, i) => {
      const month = String(6 + Math.floor(i / 2)).padStart(2, "0");
      const day = i % 2 ? "06" : "02";
      const payment = 8000 + ((index + i) % 5) * 2500;
      const principal =
        i === 11
          ? c.balance - Math.floor(c.balance / 12) * 11
          : Math.floor(c.balance / 12);
      return [
        {
          id: `${c.id}-hist-${i}-charge`,
          contact: c.id,
          date: `2026-${month}-${day}`,
          charge: principal + payment,
          payment: 0,
          method: "Crédito",
          note: `${c.id.startsWith("p") ? "Compra" : "Venta"} de cebolla ${i % 2 ? "morada" : "blanca"} · Remisión DEMO-${1100 + index * 12 + i}`,
        },
        {
          id: `${c.id}-hist-${i}-payment`,
          contact: c.id,
          date: `2026-${month}-${i % 2 ? "09" : "04"}`,
          charge: 0,
          payment,
          method: i % 3 ? "Transferencia" : "Efectivo",
          note: `Abono a remisión DEMO-${1100 + index * 12 + i}`,
        },
      ];
    }).flat(),
);
export function expandLegacyHistory(movements: Movement[]): Movement[] {
  const legacy = new Set(
    [...clients, ...suppliers]
      .filter(
        (c) =>
          movements.some((m) => m.id === c.id + "-0") &&
          movements.some((m) => m.id === c.id + "-1"),
      )
      .map((c) => c.id),
  );
  if (!legacy.size) return movements;
  return [
    ...movements.filter(
      (m) =>
        !legacy.has(m.contact) ||
        (m.id !== m.contact + "-0" && m.id !== m.contact + "-1"),
    ),
    ...seedMovements.filter((m) => legacy.has(m.contact)),
  ];
}

// Purchase labels are assigned in stored order, independent of table sorting/date filters.
export function purchaseLabels(rows: Shipment[]): Map<string, string> {
  const counts = new Map<string, number>();
  return new Map(
    rows.map((row) => {
      const next = (counts.get(row.supplier) ?? 0) + 1;
      counts.set(row.supplier, next);
      const name =
        suppliers.find((supplier) => supplier.id === row.supplier)?.name ??
        row.supplier;
      return [row.id, `${name.replace(/\s+/g, "-")}-${next}`];
    }),
  );
}
