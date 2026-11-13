import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import ts from "typescript";
const file = new URL("../src/data/index.ts", import.meta.url);
const js = ts.transpileModule(readFileSync(file, "utf8"), {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2020,
    esModuleInterop: true,
  },
}).outputText;
const exports = {};
new Function("require", "exports", js)(createRequire(file), exports);
const { shipments, sales, clients, suppliers, seedMovements, saleTotal } =
  exports;
assert.equal(shipments.length, 66 + 41 * 5);
for (const shipment of shipments) {
  const rows = sales.filter((s) => s.shipment === shipment.id);
  assert.equal(
    rows.reduce((sum, s) => sum + s.kg, 0),
    shipment.kg,
  );
  assert(
    rows.every(
      (s) => s.product === shipment.product && s.date === shipment.date,
    ),
  );
}
for (const contact of [...clients, ...suppliers])
  assert.equal(
    seedMovements
      .filter((m) => m.contact === contact.id)
      .reduce((sum, m) => sum + m.charge - m.payment, 0),
    contact.balance,
  );
for (let month = 1; month <= 11; month++) {
  const prefix = `2026-${String(month).padStart(2, "0")}`;
  const cash = sales
    .filter((s) => s.date.startsWith(prefix))
    .reduce((sum, s) => sum + saleTotal(s), 0);
  const shipmentsTotal = shipments
    .filter((s) => s.date.startsWith(prefix))
    .reduce(
      (sum, s) =>
        sum +
        sales
          .filter((v) => v.shipment === s.id)
          .reduce((n, v) => n + saleTotal(v), 0),
      0,
    );
  assert.equal(
    Math.round(cash * 100),
    Math.round(shipmentsTotal * 100),
    `Reconciliation ${prefix}`,
  );
}
assert.equal(new Set(sales.map((s) => s.id)).size, sales.length);
assert(sales.every((s) => clients.some((c) => c.id === s.client)));
console.log(
  "PASS: 271 embarques, kilos, saldos, identificadores y cuadre mensual ene–nov.",
);

const { cost, purchaseCost, expandLegacyHistory } = exports;
assert.equal(
  cost({
    ...shipments[0],
    purchaseTotal: 100,
    freight: 20,
    unloading: 30,
    scale: 40,
    scale2: 50,
    scale3: 60,
    handling: 70,
  }),
  370,
);
assert.equal(purchaseCost({ ...shipments[0], purchaseTotal: 0 }), 0);
const custom = {
  id: "user-abono",
  contact: "c0",
  date: "2026-11-10",
  charge: 0,
  payment: 1000,
  method: "Efectivo",
  note: "Abono usuario",
};
const old = [
  {
    id: "c0-0",
    contact: "c0",
    charge: Math.round(clients[0].balance * 1.3),
    payment: 0,
  },
  {
    id: "c0-1",
    contact: "c0",
    charge: 0,
    payment: Math.round(clients[0].balance * 1.3) - clients[0].balance,
  },
  custom,
];
const migrated = expandLegacyHistory(old);
assert.equal(migrated.length, 25);
assert(migrated.includes(custom));
assert.equal(
  migrated.reduce((a, m) => a + m.charge - m.payment, 0),
  clients[0].balance - 1000,
);
assert.deepEqual(expandLegacyHistory(migrated), migrated);
console.log(
  "PASS: siete gastos, compra cero y migración del historial sin perder abonos.",
);

const { orders, mergeDemoRecords } = exports;
for (let day = 0; day < 41; day++) {
  const date = new Date(Date.UTC(2026, 9, 1 + day)).toISOString().slice(0, 10);
  const rows = orders.filter((row) => row.date === date);
  assert(
    rows.length >= 30 && rows.length <= 50,
    `${date}: ${rows.length} orders`,
  );
}
for (const order of orders.filter((row) => row.saleId)) {
  const sale = sales.find((row) => row.id === order.saleId);
  const shipment = shipments.find((row) => row.id === sale.shipment);
  assert.equal(order.kg * order.price, sale.kg * sale.price);
  assert.equal(order.supplier, shipment.supplier);
  assert(order.paid >= 0 && order.paid <= saleTotal(sale));
}
const savedOrder = { ...orders[0], status: "Cargado", kg: 123 };
const mergedOrders = mergeDemoRecords(
  [savedOrder, { id: "user-order" }],
  orders,
);
assert.equal(mergedOrders[0].kg, 123);
assert.equal(mergedOrders[0].status, "Cargado");
assert(mergedOrders.some((row) => row.id === "user-order"));
assert.deepEqual(mergeDemoRecords(mergedOrders, orders), mergedOrders);
console.log(
  "PASS: 30–50 pedidos diarios, proveedores, pagos y migración idempotente preservando cambios.",
);

const { shortOrderId, paymentStatus, salePaid } = exports;
assert.equal(
  new Set(orders.map((row) => shortOrderId(row.id))).size,
  orders.length,
);
assert(orders.every((row) => shortOrderId(row.id).length <= 7));
assert(sales.some((row) => row.product === "Amarilla"));
assert.equal(paymentStatus(100, 100), "Cobrado");
assert.equal(paymentStatus(100, 40), "Anticipo");
assert.equal(paymentStatus(100, 0), "Pendiente");
assert.equal(salePaid({ kg: 10, price: 10, cash: false, paid: 40 }), 40);
assert.equal(salePaid({ kg: 10, price: 10, cash: false, paid: 140 }), 100);
assert.equal(salePaid({ kg: 10, price: 10, cash: true }), 100);
console.log("PASS: IDs cortos únicos, cebolla amarilla y saldos de anticipos.");

const cashFile = new URL("../src/data/cash.ts", import.meta.url);
const cashJS = ts.transpileModule(readFileSync(cashFile, "utf8"), {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2020,
    esModuleInterop: true,
  },
}).outputText;
const cashExports = {};
new Function("require", "exports", cashJS)(
  (name) => (name === "./index" ? exports : createRequire(cashFile)(name)),
  cashExports,
);
const { cashSummary, cashRows, cashEntries, cashOpening } = cashExports;
const cashTestRows = cashRows(
  [
    {
      id: "test1",
      date: "2026-11-09",
      client: "c0",
      product: "Blanca",
      kg: 10,
      price: 10,
      cash: true,
    },
    {
      id: "test2",
      date: "2026-11-10",
      client: "c0",
      product: "Blanca",
      kg: 10,
      price: 10,
      cash: false,
      paid: 25,
    },
    {
      id: "credit",
      date: "2026-11-10",
      client: "c0",
      product: "Blanca",
      kg: 10,
      price: 10,
      cash: false,
    },
  ],
  [
    {
      id: "c",
      date: "2026-11-10",
      kind: "Cobro",
      amount: 40,
      originDate: "2026-11-08",
    },
    { id: "e", date: "2026-11-10", kind: "Gasto", amount: 15 },
  ],
);
const opening = { date: "2026-11-09", amount: 50 };
assert.deepEqual(
  cashSummary(
    cashTestRows,
    { start: "2026-11-10", end: "2026-11-10" },
    opening,
  ),
  {
    initial: 150,
    sales: 25,
    collections: 40,
    income: 65,
    expenses: 15,
    net: 50,
    final: 200,
    credit: 175,
  },
);
assert.equal(
  cashSummary(cashTestRows, { start: "2026-11-11", end: "2026-11-11" }, opening)
    .initial,
  200,
);
assert.equal(
  cashSummary(cashTestRows, { start: "2026-11-09", end: "2026-11-11" }, opening)
    .final,
  200,
);
const ledger = cashRows(sales, cashEntries);
let prior = cashSummary(ledger, {
  start: cashOpening.date,
  end: "2026-09-30",
}).final;
for (let day = 0; day < 41; day++) {
  const date = new Date(Date.UTC(2026, 9, 1 + day)).toISOString().slice(0, 10);
  const summary = cashSummary(ledger, { start: date, end: date });
  assert.equal(summary.initial, prior);
  assert.equal(
    Math.round(summary.final * 100),
    Math.round(
      (summary.initial +
        summary.sales +
        summary.collections -
        summary.expenses) *
        100,
    ),
  );
  prior = summary.final;
}
assert.equal(
  prior,
  cashSummary(ledger, { start: "2026-10-01", end: "2026-11-10" }).final,
);
assert(
  cashEntries
    .filter((row) => row.kind === "Cobro")
    .every((row) => row.originDate < row.date),
);
console.log(
  "PASS: corte diario, anticipos sin duplicar crédito, cobros por fecha de recepción, arrastre de saldos y cuadre por rango.",
);

const aliases = exports.purchaseLabels(shipments);
assert.equal(new Set(aliases.values()).size, shipments.length);
assert.equal(
  aliases.get(shipments.find((row) => row.supplier === "p6").id),
  "Pelon-1",
);
const enrichedSale = cashRows([sales[0]], [], shipments)[0];
assert.equal(enrichedSale.kg, sales[0].kg);
assert.equal(enrichedSale.price, sales[0].price);
assert.equal(enrichedSale.purchase, aliases.get(sales[0].shipment));
assert.equal(enrichedSale.status, "Cobrado");
assert.equal(
  cashRows([{ ...sales[0], cash: false, paid: 0 }], [], shipments)[0].status,
  "Pendiente",
);
assert.equal(
  cashRows([{ ...sales[0], cash: false, paid: 10 }], [], shipments)[0].status,
  "Anticipo",
);
console.log(
  "PASS: compra/proveedor, etiquetas únicas y campos/estados de ventas en caja.",
);

assert(cashExports.isCost("Pago a proveedores"));
assert(cashExports.isCost("Compras"));
assert(cashExports.isCost("Tarimas"));
assert(cashExports.isCost("Fletes"));
for (const category of ["Nómina", "Renta", "Servicios"])
  assert(!cashExports.isCost(category));
const testPurchase = {
  ...shipments[0],
  id: "purchase-test",
  date: "2026-11-10",
  kg: 1000,
  purchase: 4,
  purchaseTotal: 4000,
};
const testPayment = {
  id: "payment-test",
  kind: "Gasto",
  category: "Compras",
  purchaseId: testPurchase.id,
  date: "2026-11-10",
  amount: 1000,
};
const costRows = cashExports.purchaseCostRows([testPurchase], [testPayment]);
assert.equal(costRows.length, 1);
assert.equal(costRows[0].total, 4000);
assert.equal(costRows[0].status, "Anticipo");
assert.equal(
  cashSummary(cashRows([], [testPayment], [testPurchase]), {
    start: "2026-11-10",
    end: "2026-11-10",
  }).expenses,
  1000,
);
assert.equal(cashExports.purchaseCostRows([testPurchase], [])[0].amount, 0);
console.log(
  "PASS: clasificación comercial, compra enlazada sin duplicados y caja solo por lo pagado.",
);

for (let day = 0; day < 41; day++) {
  const date = new Date(Date.UTC(2026, 9, 1 + day)).toISOString().slice(0, 10);
  const total = sales
    .filter((row) => row.date === date)
    .reduce((sum, row) => sum + saleTotal(row), 0);
  assert(total >= 180000 && total <= 320000);
  const summary = cashSummary(cashRows(sales, cashEntries), {
    start: date,
    end: date,
  });
  assert(summary.initial >= 180000 && summary.initial <= 320000);
  assert(summary.final >= 180000 && summary.final <= 320000);
}
const legacySale = exports.legacyDemoSales.find((row) =>
  row.id.startsWith("daily-sale-"),
);
const refreshed = mergeDemoRecords(
  [legacySale],
  sales,
  exports.legacyDemoSales,
);
assert.deepEqual(
  refreshed[0],
  sales.find((row) => row.id === legacySale.id),
);
const changedSale = { ...legacySale, kg: 123.45 };
assert.equal(
  mergeDemoRecords([changedSale], sales, exports.legacyDemoSales)[0].kg,
  123.45,
);
const historicalSale = {
  ...sales[0],
  id: "late-receipt-sale",
  date: "2026-10-02",
  kg: 100,
  price: 10,
  cash: false,
  paid: 100,
};
const linkedReceipt = {
  id: "late-receipt",
  kind: "Cobro",
  category: "Cobro de venta",
  saleId: historicalSale.id,
  date: "2026-11-10",
  amount: 400,
};
const collectedSales = cashExports.applyCollections(
  [historicalSale],
  [linkedReceipt],
);
assert.equal(salePaid(collectedSales[0]), 500);
const linkedRows = cashRows(collectedSales, [linkedReceipt]);
const oct = cashSummary(
  linkedRows,
  { start: "2026-10-01", end: "2026-10-31" },
  { date: "2026-01-01", amount: 0 },
);
const nov = cashSummary(
  linkedRows,
  { start: "2026-11-01", end: "2026-11-30" },
  { date: "2026-01-01", amount: 0 },
);
assert.equal(oct.income, 100);
assert.equal(nov.collections, 400);
assert.equal(nov.final, 500);
console.log(
  "PASS: ventas y saldos demo $180k–$320k, migración preserva ediciones, cobros históricos sin duplicar caja.",
);

// Profitability must allocate costs across sales without charging the full purchase twice.
{
  const shipment = {
    ...shipments[0],
    kg: 100,
    purchaseTotal: 500,
    freight: 100,
    unloading: 0,
    scale: 0,
    scale2: 0,
    scale3: 0,
    handling: 0,
  };
  const sale = { ...sales[0], kg: 25, price: 10 };
  const result = exports.saleProfitability(sale, shipment);
  assert.deepEqual(result, {
    revenue: 250,
    purchasePrice: 5,
    expense: 150,
    profit: 100,
    margin: 40,
  });
  assert.equal(
    exports.saleProfitability({ ...sale, date: "2027-01-01" }, shipment)
      .expense,
    150,
  );
  assert.equal(
    exports.saleProfitability({ ...sale, kg: 75 }, shipment).expense +
      result.expense,
    exports.cost(shipment),
  );
  assert.equal(exports.saleProfitability(sale).profit, null);
  assert.equal(
    exports.saleProfitability(sale, { ...shipment, kg: 0 }).margin,
    null,
  );
  assert.equal(
    exports.saleProfitability({ ...sale, price: 4 }, shipment).profit,
    -50,
  );
  assert.equal(
    exports.saleProfitability({ ...sale, price: 0 }, shipment).margin,
    0,
  );
}

// Report totals reconcile across views and do not count supplier payments as costs twice.
{
  const reportFile = new URL("../src/data/reports.ts", import.meta.url);
  const reportJS = ts.transpileModule(readFileSync(reportFile, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
    },
  }).outputText;
  const reports = {};
  new Function("require", "exports", reportJS)(
    (name) =>
      name === "./index"
        ? exports
        : name === "./cash"
          ? cashExports
          : createRequire(reportFile)(name),
    reports,
  );
  const shipment = {
    ...shipments[0],
    id: "report-purchase",
    date: "2026-10-01",
    kg: 100,
    purchaseTotal: 500,
    freight: 100,
    unloading: 0,
    scale: 0,
    scale2: 0,
    scale3: 0,
    handling: 0,
  };
  const sale = {
    ...sales[0],
    shipment: shipment.id,
    date: "2026-11-10",
    kg: 25,
    price: 10,
    cash: false,
    paid: 0,
  };
  const entry = {
    id: "report-expense",
    date: "2026-11-10",
    time: "12:00",
    kind: "Gasto",
    category: "Nómina",
    contact: "Equipo",
    description: "Prueba",
    amount: 20,
  };
  const input = {
    sales: [sale],
    shipments: [shipment],
    cashEntries: [
      entry,
      {
        ...entry,
        id: "settlement",
        category: "Pago a proveedores",
        amount: 600,
      },
      { ...entry, id: "pallet", category: "Tarimas", amount: 10 },
    ],
  };
  const range = { start: "2026-11-01", end: "2026-11-30" };
  const result = reports.incomeStatement(input, range);
  assert.equal(result.revenue, 250);
  assert.equal(result.cost, 160);
  assert.equal(result.expense, 20);
  assert.equal(result.gross, 90);
  assert.equal(result.operating, 70);
  assert.equal(result.net, 70);
  for (const [key, total] of [
    ["income", result.revenue],
    ["costs", result.cost],
    ["expenses", result.expense],
  ])
    assert.equal(
      result[key].reduce((sum, row) => sum + row.value, 0),
      total,
    );
  assert.equal(
    reports.incomeStatement({ ...input, shipments: [] }, range).missingCosts,
    1,
  );
  assert.equal(
    reports.incomeStatement(input, { start: "2027-01-01", end: "2027-01-31" })
      .net,
    0,
  );
  assert.deepEqual(
    reports.previousPeriod({ start: "2024-03-01", end: "2024-03-31" }, "Mes"),
    { start: "2024-02-01", end: "2024-02-29" },
  );
  assert.deepEqual(
    reports.previousPeriod({ start: "2026-11-10", end: "2026-11-12" }, "Rango"),
    { start: "2026-11-07", end: "2026-11-09" },
  );
  const flow = cashSummary(
    cashRows(input.sales, input.cashEntries, input.shipments),
    range,
    { date: "2026-01-01", amount: 1000 },
  );
  assert.equal(flow.income, 0); // A credit sale earns revenue but has no cash receipt.
  assert.equal(flow.expenses, 630);
  assert.equal(flow.final, 370);
  assert.equal(flow.initial + flow.net, flow.final);
  const indirect = reports.indirectCashFlow(input, range);
  assert.equal(indirect.profit, result.net);
  assert.equal(indirect.collections, -250);
  assert.equal(indirect.payments, -450);
  assert.equal(indirect.operation, -700);
  assert.equal(indirect.period, -630);
  assert.equal(indirect.initial + indirect.period, indirect.final);
  const cashSaleInput = {
    ...input,
    sales: [{ ...sale, paid: 250, cash: true }],
  };
  const cashSaleFlow = reports.indirectCashFlow(cashSaleInput, range);
  assert.equal(cashSaleFlow.profit, indirect.profit);
  assert.equal(cashSaleFlow.collections, 0);
  assert.equal(cashSaleFlow.period, -380);
  for (const period of [
    range,
    { start: "2026-10-01", end: "2026-11-30" },
    { start: "2026-11-11", end: "2026-11-12" },
  ]) {
    const reconciled = reports.indirectCashFlow(input, period);
    const direct = cashSummary(
      cashRows(input.sales, input.cashEntries, input.shipments),
      period,
    );
    assert.equal(reconciled.period, direct.net);
    assert.equal(reconciled.final, direct.final);
    assert.equal(
      reconciled.profit +
        reconciled.operation +
        reconciled.investment +
        reconciled.capital,
      reconciled.period,
    );
  }
  assert.equal(
    reports.indirectCashFlow({ ...input, shipments: [] }, range).complete,
    false,
  );
  console.log(
    "PASS: reportes, costos proporcionales, pagos sin duplicados, comparativos y efectivo sin crédito.",
  );
}

// An account changes allocation, never the business balance or receipt date.
const accountSales = [
  { ...sales[0], account: "Banorte", paid: 100, cash: false },
];
const accountEntries = [
  {
    id: "account-receipt",
    kind: "Cobro",
    category: "Cobro de venta",
    date: accountSales[0].date,
    time: "12:00",
    contact: "Demo",
    description: "Cobro",
    amount: 35,
    account: "Efectivo",
  },
  {
    id: "account-expense",
    kind: "Gasto",
    category: "Otros",
    date: accountSales[0].date,
    time: "12:00",
    contact: "Demo",
    description: "Pago",
    amount: 20,
    account: "Banorte",
  },
];
const accountRows = cashRows(accountSales, accountEntries);
const accountPeriod = {
  start: accountSales[0].date,
  end: accountSales[0].date,
};
const businessAccountSummary = cashSummary(accountRows, accountPeriod);
const cashAccountSummary = cashSummary(
  accountRows.filter((row) => cashExports.cashAccount(row) === "Efectivo"),
  accountPeriod,
);
const bankAccountSummary = cashSummary(
  accountRows.filter((row) => cashExports.cashAccount(row) === "Banorte"),
  accountPeriod,
  { ...cashOpening, amount: 0 },
);
for (const key of ["initial", "income", "expenses", "net", "final"])
  assert.equal(
    cashAccountSummary[key] + bankAccountSummary[key],
    businessAccountSummary[key],
    `Account reconciliation ${key}`,
  );
assert.equal(bankAccountSummary.sales, 100);
assert.equal(cashAccountSummary.collections, 35);
assert.equal(bankAccountSummary.expenses, 20);
assert.equal(cashExports.cashAccount({}), "Efectivo");
console.log(
  "PASS: cuentas Efectivo/Banorte concilian apertura, entradas, salidas y cierre.",
);

// Catalog prices: volume discounts, effective dates, history, and agent parity.
const catalogFile = new URL("../src/data/catalog.ts", import.meta.url);
const catalogJs = ts.transpileModule(readFileSync(catalogFile, "utf8"), {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2020,
  },
}).outputText;
const catalogExports = {};
new Function("require", "exports", catalogJs)(
  createRequire(catalogFile),
  catalogExports,
);
const {
  catalogProducts,
  catalogTiers,
  catalogPrice,
  catalogProductPrice,
  catalogFreightPrice,
  catalogAgentContext,
  emptyCatalog,
  readCatalog,
} = catalogExports;
const catalogDate = "2026-11-13";
for (const product of catalogProducts) {
  const prices = catalogTiers.map((_, i) =>
    catalogPrice(emptyCatalog, `product:${product}:${i}`, catalogDate),
  );
  assert(
    prices.every((price, i) => price > 0 && (i === 0 || price < prices[i - 1])),
    `${product} volume discounts`,
  );
  for (const [kg, tier] of [
    [49, 0],
    [50, 1],
    [200, 1],
    [201, 2],
    [499, 2],
    [500, 3],
    [700, 3],
    [701, 4],
  ])
    assert.equal(
      catalogProductPrice(emptyCatalog, product, kg, catalogDate),
      prices[tier],
      `${product} tier boundary ${kg}`,
    );
}
const editedCatalog = {
  changes: [
    {
      id: "catalog-test",
      key: "product:Blanca:4",
      date: catalogDate,
      timestamp: "2026-11-13T12:00:00Z",
      before: 15,
      price: 14,
    },
  ],
};
assert.equal(
  catalogProductPrice(editedCatalog, "Blanca", 1000, "2026-11-14"),
  14,
);
assert.notEqual(
  catalogProductPrice(editedCatalog, "Blanca", 1000, "2026-11-12"),
  14,
);
assert.equal(
  catalogFreightPrice(emptyCatalog, "León", catalogDate),
  catalogFreightPrice(emptyCatalog, "Guanajuato", catalogDate),
);
assert.equal(catalogFreightPrice(emptyCatalog, "Sin ruta", catalogDate), null);
assert(
  catalogAgentContext(editedCatalog, catalogDate).includes("701+ kg $14.00/kg"),
);
assert.deepEqual(
  readCatalog(),
  emptyCatalog,
  "Catalog is safe during server rendering",
);
console.log(
  "PASS: catálogo, rangos, vigencias, ediciones persistentes, rutas y precios del agente.",
);
