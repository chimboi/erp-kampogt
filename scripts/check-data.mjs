import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import ts from "typescript";
const file = new URL("../src/data/index.ts", import.meta.url);
const js = ts.transpileModule(readFileSync(file, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true },
}).outputText;
const exports = {};
new Function("require", "exports", js)(createRequire(file), exports);
const { shipments, sales, clients, suppliers, seedMovements, saleTotal } =
  exports;
assert.equal(shipments.length, 66);
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
  assert.equal(cash, shipmentsTotal, `Reconciliation ${prefix}`);
}
assert.equal(new Set(sales.map((s) => s.id)).size, sales.length);
assert(sales.every((s) => clients.some((c) => c.id === s.client)));
console.log(
  "PASS: 66 embarques, kilos, saldos, identificadores y cuadre mensual ene–nov.",
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
