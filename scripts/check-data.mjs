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
