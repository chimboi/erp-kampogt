import {
  purchaseCost,
  saleProfitability,
  saleTotal,
  type Sale,
  type Shipment,
} from "./index";
import { isCost, cashRows, cashSummary, type CashEntry } from "./cash";
export type ReportPeriod = { start: string; end: string };
export type ReportInput = {
  sales: Sale[];
  shipments: Shipment[];
  cashEntries: CashEntry[];
};
export type Breakdown = { name: string; value: number };
const inside = (date: string, period: ReportPeriod) =>
  date >= period.start && date <= period.end;
const round = (value: number) => Math.round(value * 100) / 100;
export function incomeStatement(input: ReportInput, period: ReportPeriod) {
  const purchases = new Map(input.shipments.map((row) => [row.id, row]));
  const income = new Map<string, number>(),
    costs = new Map<string, number>(),
    expenses = new Map<string, number>();
  const add = (map: Map<string, number>, key: string, amount: number) =>
    map.set(key, (map.get(key) ?? 0) + amount);
  let missingCosts = 0;
  for (const sale of input.sales.filter((row) => inside(row.date, period))) {
    add(income, sale.product, saleTotal(sale));
    const purchase = purchases.get(sale.shipment);
    if (!purchase || purchase.kg <= 0) {
      missingCosts++;
      continue;
    }
    const ratio = sale.kg / purchase.kg;
    const buying = round(purchaseCost(purchase) * ratio);
    const freight = round(purchase.freight * ratio);
    const unloading = round(purchase.unloading * ratio);
    const scales = round(
      (purchase.scale + (purchase.scale2 ?? 0) + (purchase.scale3 ?? 0)) *
        ratio,
    );
    const total = saleProfitability(sale, purchase).expense!;
    add(costs, "Compra de producto vendido", buying);
    add(costs, "Flete de compras", freight);
    add(costs, "Descarga", unloading);
    add(costs, "Básculas", scales);
    add(
      costs,
      "Maniobra",
      round(total - buying - freight - unloading - scales),
    );
  }
  for (const entry of input.cashEntries) {
    if (entry.kind !== "Gasto" || !inside(entry.date, period)) continue;
    // Supplier settlements pay inventory; sold inventory is already allocated above.
    if (entry.category === "Compras" || entry.category === "Pago a proveedores")
      continue;
    add(
      isCost(entry.category) ? costs : expenses,
      entry.category,
      entry.total ?? entry.amount,
    );
  }
  const list = (map: Map<string, number>): Breakdown[] =>
    [...map]
      .map(([name, value]) => ({ name, value: round(value) }))
      .sort((a, b) => b.value - a.value);
  const sum = (map: Map<string, number>) =>
    round([...map.values()].reduce((a, b) => a + b, 0));
  const revenue = sum(income),
    cost = sum(costs),
    expense = sum(expenses);
  return {
    income: list(income),
    costs: list(costs),
    expenses: list(expenses),
    revenue,
    cost,
    expense,
    gross: round(revenue - cost),
    operating: round(revenue - cost - expense),
    net: round(revenue - cost - expense),
    missingCosts,
  };
}
export function previousPeriod(
  period: ReportPeriod,
  mode: string,
): ReportPeriod {
  const start = new Date(period.start + "T12:00:00Z");
  const end = new Date(period.end + "T12:00:00Z");
  if (mode === "Mes") {
    start.setUTCMonth(start.getUTCMonth() - 1, 1);
    end.setTime(start.getTime());
    end.setUTCMonth(end.getUTCMonth() + 1, 0);
  } else if (mode === "Año") {
    start.setUTCFullYear(start.getUTCFullYear() - 1, 0, 1);
    end.setUTCFullYear(end.getUTCFullYear() - 1, 11, 31);
  } else {
    const days = Math.round((end.getTime() - start.getTime()) / 86400000) + 1;
    start.setUTCDate(start.getUTCDate() - days);
    end.setUTCDate(end.getUTCDate() - days);
  }
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
}

// Bridge recorded profit to cash: reverse uncollected sales and unpaid costs.
export function indirectCashFlow(input: ReportInput, period: ReportPeriod) {
  const result = incomeStatement(input, period);
  const cash = cashSummary(
    cashRows(input.sales, input.cashEntries, input.shipments),
    period,
  );
  const collections = round(cash.income - result.revenue);
  const payments = round(result.cost + result.expense - cash.expenses);
  const operation = round(collections + payments);
  // The current ledger contains no investment, capital or tax records.
  const investment = 0,
    capital = 0,
    iva = 0,
    isr = 0;
  return {
    initial: cash.initial,
    profit: result.net,
    collections,
    payments,
    operation,
    investment,
    capital,
    iva,
    isr,
    period: round(result.net + operation + investment + capital),
    final: cash.final,
    complete: result.missingCosts === 0,
  };
}
