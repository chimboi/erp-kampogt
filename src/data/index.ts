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
  ][i],
  balance: 280000 - i * 31000,
}));
export type Sale = {
  time?: string;
  id: string;
  shipment: string;
  client: string;
  date: string;
  product: "Blanca" | "Morada";
  kg: number;
  price: number;
  cash: boolean;
};
export type Shipment = {
  id: string;
  name: string;
  supplier: string;
  origin: string;
  date: string;
  product: "Blanca" | "Morada";
  kg: number;
  purchase: number;
  freight: number;
  unloading: number;
  scale: number;
  handling: number;
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
export const cost = (s: Shipment) =>
  s.kg * s.purchase + s.freight + s.unloading + s.scale + s.handling;
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
  id: string;
  client: string;
  product: "Blanca" | "Morada";
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
  product: s.product,
  kg: s.kg / 4,
  price: s.purchase + 2.8,
  date: s.date,
  status: statuses[i % 5],
}));
export type Movement = {
  id: string;
  contact: string;
  date: string;
  charge: number;
  payment: number;
  method: string;
  note: string;
};
export const seedMovements: Movement[] = [...clients, ...suppliers].flatMap(
  (c) => [
    {
      id: c.id + "-0",
      contact: c.id,
      date: "2026-10-01",
      charge: Math.round(c.balance * 1.3),
      payment: 0,
      method: "Crédito",
      note: "Saldo inicial de demostración",
    },
    {
      id: c.id + "-1",
      contact: c.id,
      date: "2026-11-04",
      charge: 0,
      payment: Math.round(c.balance * 1.3) - c.balance,
      method: "Transferencia",
      note: "Abono de demostración",
    },
  ],
);
