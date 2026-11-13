import {
  sales,
  shipments,
  purchaseLabels,
  type Shipment,
  purchaseCost,
  salePaid,
  saleTotal,
  clientName,
  clients,
  suppliers,
  type Sale,
} from "./index";
export const cashMoney = (value: number) =>
  new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
export const costCategories = [
  "Compras",
  "Tarimas",
  "Fletes",
  "Otros costos",
] as const;
export const operatingCategories = [
  "Nómina",
  "Renta",
  "Servicios",
  "Comidas",
  "Otros",
] as const;
export const isCost = (category: string) =>
  [...costCategories, "Pago a proveedores"].some((value) => value === category);
export const expenseCategories = [
  "Pago a proveedores",
  "Tarimas",
  "Nómina",
  "Comidas",
  "Otros",
] as const;
export type CashAccount = "Efectivo" | "Banorte";
export const cashAccounts: CashAccount[] = ["Efectivo", "Banorte"];
export function cashAccount(row: { account?: CashAccount }) {
  return row.account ?? "Efectivo";
}
export type CashEntry = {
  account?: CashAccount;
  id: string;
  date: string;
  time: string;
  kind: "Cobro" | "Gasto";
  category: string;
  contact: string;
  description: string;
  amount: number;
  originDate?: string;
  clientId?: string;
  purchaseId?: string;
  total?: number;
  saleId?: string;
  orderId?: string;
};
export type CashRow = Omit<CashEntry, "kind"> & {
  kind: "Venta" | "Cobro" | "Gasto";
  saleId?: string;
  total?: number;
  credit?: number;
  kg?: number;
  price?: number;
  purchase?: string;
  supplier?: string;
  status?: string;
};
export const cashOpening = { date: "2026-01-01", amount: 220000 };
export const cashEntries: CashEntry[] = Array.from({ length: 41 }, (_, day) => {
  const date = new Date(Date.UTC(2026, 9, day + 1)).toISOString().slice(0, 10);
  const originDate = new Date(Date.UTC(2026, 9, day - 2))
    .toISOString()
    .slice(0, 10);
  const entries: CashEntry[] = expenseCategories
    .filter((category) => category !== "Nómina" || day % 7 === 5)
    .map((category, i) => ({
      id: `cash-expense-${date}-${i}`,
      date,
      time: `${12 + i}:30`,
      kind: "Gasto",
      category,
      contact:
        category === "Pago a proveedores"
          ? suppliers[6 + (day % 4)].name
          : "Operación",
      description:
        category === "Pago a proveedores"
          ? "Abono por compra de cebolla"
          : category === "Tarimas"
            ? "Tarimas para carga"
            : category === "Nómina"
              ? "Pago semanal del equipo"
              : category === "Comidas"
                ? "Comida del equipo"
                : "Gastos de operación",
      amount:
        category === "Pago a proveedores"
          ? 18000 + (day % 5) * 2500
          : category === "Tarimas"
            ? 1200 + (day % 3) * 150
            : category === "Nómina"
              ? 18500
              : category === "Comidas"
                ? 650
                : 350 + (day % 4) * 100,
    }));
  for (let j = 0; j < 3; j++) {
    const client = clients[(day + j * 3) % clients.length];
    entries.push({
      id: `cash-collection-${date}-${j}`,
      date,
      time: `${9 + j}:15`,
      kind: "Cobro",
      category: "Cobro de días anteriores",
      contact: client.name,
      clientId: client.id,
      description: "Abono a saldo anterior",
      amount: 1250 + ((day + j) % 7) * 450,
      originDate,
    });
  }
  return entries;
}).flat();
// Explicit supplier settlements keep the demo cash close within $180k–$320k.
let demoBalance = cashOpening.amount;
for (const [index, day] of [
  ...new Set([
    ...sales.map((row) => row.date),
    ...cashEntries.map((row) => row.date),
  ]),
]
  .sort()
  .entries()) {
  const receipts =
    sales
      .filter((row) => row.date === day)
      .reduce((sum, row) => sum + salePaid(row), 0) +
    cashEntries
      .filter((row) => row.date === day && row.kind === "Cobro")
      .reduce((sum, row) => sum + row.amount, 0);
  const expenses = cashEntries
    .filter((row) => row.date === day && row.kind === "Gasto")
    .reduce((sum, row) => sum + row.amount, 0);
  const target = 220000 + ((index * 3217) % 45000);
  const amount =
    Math.round((demoBalance + receipts - expenses - target) * 100) / 100;
  if (amount > 0)
    cashEntries.push({
      id: `cash-settlement-${day}`,
      date: day,
      time: "17:00",
      kind: "Gasto",
      category: "Pago a proveedores",
      contact: suppliers[6 + (index % 4)].name,
      description: "Liquidación de compras anteriores",
      amount,
    });
  demoBalance =
    Math.round(
      (demoBalance + receipts - expenses - Math.max(0, amount)) * 100,
    ) / 100;
}
export const collectedFor = (
  entries: CashEntry[],
  key: "saleId" | "orderId",
  id: string,
  through = "9999-12-31",
) =>
  entries
    .filter(
      (entry) =>
        entry.kind === "Cobro" && entry[key] === id && entry.date <= through,
    )
    .reduce((sum, entry) => sum + entry.amount, 0);
export function applyCollections(
  allSales: Sale[],
  entries: CashEntry[],
): Sale[] {
  return allSales.map((sale) => {
    const collected = collectedFor(entries, "saleId", sale.id);
    if (!collected) return sale;
    const paid = Math.min(
      saleTotal(sale),
      Math.round((salePaid(sale) + collected) * 100) / 100,
    );
    return { ...sale, paid, cash: paid >= saleTotal(sale) };
  });
}
export function mergeCashDemo(saved: CashEntry[]) {
  const ids = new Set(saved.map((entry) => entry.id));
  return [
    ...saved,
    ...cashEntries.filter(
      (entry) => entry.id.startsWith("cash-settlement-") && !ids.has(entry.id),
    ),
  ];
}
export function cashRows(
  allSales: Sale[],
  entries: CashEntry[],
  purchases: Shipment[] = shipments,
): CashRow[] {
  const labels = purchaseLabels(purchases);
  const purchaseMap = new Map(purchases.map((row) => [row.id, row]));
  return [
    ...allSales.map((sale): CashRow => ({
      id: `receipt-${sale.id}`,
      saleId: sale.id,
      account: sale.account,
      kg: sale.kg,
      price: sale.price,
      purchase: labels.get(sale.shipment) ?? sale.shipment,
      supplier:
        suppliers.find(
          (supplier) =>
            supplier.id === purchaseMap.get(sale.shipment)?.supplier,
        )?.name ?? "Sin proveedor",
      status:
        salePaid(sale) >= saleTotal(sale)
          ? "Cobrado"
          : salePaid(sale) > 0
            ? "Anticipo"
            : "Pendiente",
      date: sale.date,
      time: sale.time ?? "12:00",
      kind: "Venta",
      category: sale.product,
      contact: clientName(sale.client),
      description: `${sale.kg.toLocaleString("es-MX")} kg de cebolla ${sale.product.toLowerCase()}`,
      amount: Math.max(
        0,
        Math.round(
          (salePaid(sale) - collectedFor(entries, "saleId", sale.id)) * 100,
        ) / 100,
      ),
      total: saleTotal(sale),
      credit: Math.max(0, saleTotal(sale) - salePaid(sale)),
    })),
    ...entries.map((entry) => ({
      ...entry,
      purchase: entry.purchaseId
        ? (labels.get(entry.purchaseId) ?? entry.purchaseId)
        : undefined,
    })),
  ];
}
const cents = (amount: number) => Math.round(amount * 100);
export function cashSummary(
  rows: CashRow[],
  period: { start: string; end: string },
  opening = cashOpening,
) {
  let before = 0,
    saleReceipts = 0,
    collections = 0,
    expenses = 0,
    credit = 0;
  for (const row of rows) {
    if (row.date < opening.date || row.date > period.end) continue;
    const amount = cents(row.amount);
    if (row.date < period.start) {
      before += row.kind === "Gasto" ? -amount : amount;
      continue;
    }
    if (row.kind === "Gasto") expenses += amount;
    else if (row.kind === "Cobro") collections += amount;
    else {
      saleReceipts += amount;
      credit += cents(row.credit ?? 0);
    }
  }
  const initial =
    period.end < opening.date ? 0 : cents(opening.amount) + before;
  const income = saleReceipts + collections,
    net = income - expenses;
  return {
    initial: initial / 100,
    sales: saleReceipts / 100,
    collections: collections / 100,
    income: income / 100,
    expenses: expenses / 100,
    net: net / 100,
    final: (initial + net) / 100,
    credit: credit / 100,
  };
}
// Exposed seed only for reproducible checks, never imported from the private workbook.
export const seedCashRows = () => cashRows(sales, cashEntries);

export function purchaseCostRows(
  purchases: Shipment[],
  entries: CashEntry[],
): CashRow[] {
  const labels = purchaseLabels(purchases);
  const linked = new Set(
    entries
      .filter((entry) => entry.category === "Compras" && entry.purchaseId)
      .map((entry) => entry.purchaseId),
  );
  const costs = cashRows(
    [],
    entries.filter((entry) => entry.kind === "Gasto" && isCost(entry.category)),
    purchases,
  );
  return [
    ...costs.map((row) => {
      const purchase = purchases.find(
        (purchase) => purchase.id === row.purchaseId,
      );
      return row.category === "Compras" && purchase
        ? {
            ...row,
            kg: purchase.kg,
            price: purchase.purchase,
            total: purchaseCost(purchase),
            status:
              row.amount >= purchaseCost(purchase)
                ? "Pagado"
                : row.amount > 0
                  ? "Anticipo"
                  : "Pendiente",
          }
        : row;
    }),
    ...purchases
      .filter((purchase) => !linked.has(purchase.id))
      .map((purchase): CashRow => ({
        id: `purchase-${purchase.id}`,
        purchaseId: purchase.id,
        kind: "Gasto",
        category: "Compras",
        date: purchase.date,
        time: "",
        contact:
          suppliers.find((supplier) => supplier.id === purchase.supplier)
            ?.name ?? purchase.supplier,
        description: purchase.product,
        purchase: labels.get(purchase.id),
        kg: purchase.kg,
        price: purchase.purchase,
        total: purchaseCost(purchase),
        amount: 0,
        status: "Sin pago vinculado",
      })),
  ];
}
