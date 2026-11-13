"use client";
import { useState } from "react";
import { Card, Badge, Empty } from "./ui";
import { usePeriod, within } from "./period-picker";
import { Trend, Donut, ClientBars, chartColors } from "./charts";
import { DataTable, type Column } from "./data-table";
import { PaymentCell } from "./payment-cell";
import { useStore } from "@/lib/store";
import {
  saleTotal,
  money,
  number,
  date,
  salePaid,
  paymentStatus,
  shortOrderId,
  purchaseLabels,
  suppliers,
  clientName,
  TODAY,
} from "@/data";
export default function DashboardReport({
  p,
}: {
  p: ReturnType<typeof usePeriod>;
}) {
  const store = useStore(),
    [unit, setUnit] = useState("$");
  const shipments = store.shipments;
  const s = store.sales.filter((s) => within(s.date, p.period)),
    o = store.orders.filter((o) => within(o.date, p.period));
  const [supplierMode, setSupplierMode] = useState("$Ingresos");
  const shipmentMap = new Map(shipments.map((row) => [row.id, row]));
  const labels = purchaseLabels(shipments);
  const saleMap = new Map(store.sales.map((row) => [row.id, row]));
  const aggregate = (kind: "supplier" | "client") => {
    const totals = new Map<string, number>();
    for (const sale of s) {
      const name =
        kind === "client"
          ? clientName(sale.client)
          : (suppliers.find(
              (row) => row.id === shipmentMap.get(sale.shipment)?.supplier,
            )?.name ?? "Sin proveedor");
      totals.set(
        name,
        (totals.get(name) ?? 0) + (unit === "$" ? saleTotal(sale) : sale.kg),
      );
    }
    return [...totals]
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  };
  const supplierTotals = new Map<
    string,
    { name: string; value: number; count: number }
  >();
  for (const sale of store.sales.filter((row) => within(row.date, p.period))) {
    const supplierId = shipmentMap.get(sale.shipment)?.supplier ?? "unknown";
    const entry = supplierTotals.get(supplierId) ?? {
      name:
        suppliers.find((row) => row.id === supplierId)?.name ?? "Sin proveedor",
      value: 0,
      count: 0,
    };
    entry.value += saleTotal(sale);
    entry.count += 1;
    supplierTotals.set(supplierId, entry);
  }
  const supplierChart = [...supplierTotals.values()].sort((a, b) =>
    supplierMode === "$Ingresos" ? b.value - a.value : b.count - a.count,
  );
  const clientChart = aggregate("client").slice(0, 7);
  // Day/week selections retain the daily context of their anchor month.
  const historyPeriod =
    p.mode === "Día" || p.mode === "Semana"
      ? {
          start: p.anchor.slice(0, 7) + "-01",
          end: new Date(
            Date.UTC(
              Number(p.anchor.slice(0, 4)),
              Number(p.anchor.slice(5, 7)),
              0,
            ),
          )
            .toISOString()
            .slice(0, 10),
        }
      : p.period;
  const daily = new Map<
    string,
    { Blanca: number; Morada: number; Amarilla: number }
  >();
  for (const sale of store.sales.filter((row) =>
    within(row.date, historyPeriod),
  )) {
    const totals = daily.get(sale.date) ?? {
      Blanca: 0,
      Morada: 0,
      Amarilla: 0,
    };
    totals[sale.product] += unit === "$" ? saleTotal(sale) : sale.kg;
    daily.set(sale.date, totals);
  }
  const chart = [];
  for (
    let day = historyPeriod.start;
    day <= historyPeriod.end && day <= TODAY;
  ) {
    chart.push({
      name: date(day),
      ...(daily.get(day) ?? { Blanca: 0, Morada: 0, Amarilla: 0 }),
    });
    day = new Date(new Date(day + "T12:00:00Z").getTime() + 86400000)
      .toISOString()
      .slice(0, 10);
  }
  const orderRows = o.map((order) => {
    const sale = order.saleId ? saleMap.get(order.saleId) : undefined;
    const shipment = sale ? shipmentMap.get(sale.shipment) : undefined;
    const supplier = suppliers.find(
      (row) => row.id === (shipment?.supplier ?? order.supplier),
    );
    const kg = sale?.kg ?? order.kg,
      price = sale?.price ?? order.price;
    const total = Math.round(kg * price * 100) / 100;
    const paid = sale
      ? salePaid(sale)
      : Math.min(
          total,
          Math.max(0, order.paid ?? (order.status === "Pagado" ? total : 0)),
        );
    return {
      order,
      id: shortOrderId(order.id),
      timestamp: `${order.date} ${order.time ?? "00:00"}`,
      dateLabel: `${date(order.date)} · ${order.time ?? "—"}`,
      client: sale ? clientName(sale.client) : order.client,
      supplier: supplier?.name ?? "Sin asignar",
      purchaseLabel: sale ? (labels.get(sale.shipment) ?? sale.shipment) : "—",
      product: sale?.product ?? order.product,
      kg,
      price,
      purchase: shipment?.purchase ?? order.purchase,
      total,
      paid,
      remaining: Math.max(0, total - paid),
      status: paymentStatus(total, paid),
    };
  });
  const columns: Column<(typeof orderRows)[number]>[] = [
    {
      id: "id",
      label: "ID",
      value: (row) => row.id,
      render: (row) => (
        <span title={row.order.id} className="font-semibold">
          {row.id}
        </span>
      ),
    },
    {
      id: "date",
      label: "Fecha y hora",
      value: (row) => row.timestamp,
      filterValue: (row) => `${row.timestamp} ${row.dateLabel}`,
      render: (row) => <span className="nowrap">{row.dateLabel}</span>,
    },
    { id: "client", label: "Cliente", value: (row) => row.client },
    { id: "supplier", label: "Proveedor", value: (row) => row.supplier },
    { id: "purchase", label: "Compra", value: (row) => row.purchaseLabel },
    {
      id: "product",
      label: "Producto",
      value: (row) => row.product,
      render: (row) => <Badge>{row.product}</Badge>,
    },
    {
      id: "kg",
      label: "Kg",
      value: (row) => row.kg,
      render: (row) => number(row.kg),
    },
    {
      id: "price",
      label: "Precio/kg",
      value: (row) => row.price,
      render: (row) => `$${row.price.toFixed(2)}`,
    },
    {
      id: "cost",
      label: "Costo/kg",
      value: (row) => row.purchase ?? -1,
      render: (row) =>
        row.purchase === undefined ? "—" : `$${row.purchase.toFixed(2)}`,
    },
    {
      id: "total",
      label: "Venta",
      value: (row) => row.total,
      render: (row) => money(row.total),
    },
    {
      id: "remaining",
      label: "Por pagar",
      value: (row) => row.remaining,
      render: (row) => money(row.remaining),
    },
    {
      id: "status",
      label: "Estatus",
      value: (row) => row.status,
      render: (row) => (
        <PaymentCell
          disabled={store.cashEntries.some(
            (entry) =>
              entry.kind === "Cobro" &&
              ((entry.saleId && entry.saleId === row.order.saleId) ||
                entry.orderId === row.order.id),
          )}
          id={row.id}
          total={row.total}
          paid={row.paid}
          onSave={(paid) => {
            store.setOrders((all) =>
              all.map((order) =>
                order.id === row.order.id ? { ...order, paid } : order,
              ),
            );
            if (row.order.saleId)
              store.setSales((all) =>
                all.map((sale) =>
                  sale.id === row.order.saleId
                    ? { ...sale, paid, cash: paid === row.total }
                    : sale,
                ),
              );
          }}
        />
      ),
    },
  ];
  return (
    <>
      <Card>
        <div className="section-heading">
          <div>
            <h2>Histórico de ventas</h2>
            <span className="muted">
              Por día · {date(historyPeriod.start)} — {date(historyPeriod.end)}
            </span>
          </div>
          <div className="segmented">
            {["$", "Kilos"].map((u) => (
              <button
                key={u}
                className={unit === u ? "active" : ""}
                onClick={() => setUnit(u)}
              >
                {u}
              </button>
            ))}
          </div>
        </div>
        {daily.size ? (
          <Trend
            data={chart}
            keys={["Blanca", "Morada", "Amarilla"]}
            dotEvery={4}
            currency={unit === "$"}
          />
        ) : (
          <Empty />
        )}
      </Card>
      <div className="dashboard-charts">
        <Card>
          <div className="supplier-heading">
            <h2>Ventas por proveedor</h2>
            <div className="segmented" aria-label="Métrica de proveedores">
              {["$Ingresos", "#ventas"].map((mode) => (
                <button
                  key={mode}
                  className={supplierMode === mode ? "active" : ""}
                  onClick={() => setSupplierMode(mode)}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>
          <span className="muted">
            {date(p.period.start)} — {date(p.period.end)} ·{" "}
            {supplierMode === "$Ingresos" ? "MXN" : "Ventas"}
          </span>
          {supplierChart.length ? (
            <>
              <Donut
                data={supplierChart.map((row) => ({
                  name: row.name,
                  value: supplierMode === "$Ingresos" ? row.value : row.count,
                }))}
                currency={supplierMode === "$Ingresos"}
                showLegend={false}
              />
              <div className="supplier-amounts">
                {supplierChart.map((supplier, index) => (
                  <div key={supplier.name}>
                    <span>
                      <i
                        className="supplier-color"
                        style={{
                          background: chartColors[index % chartColors.length],
                        }}
                      />
                      {supplier.name}
                      <small>{supplier.count} ventas</small>
                    </span>
                    <strong>
                      {supplierMode === "$Ingresos"
                        ? money(supplier.value)
                        : `${number(supplier.count)} ventas`}
                    </strong>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <Empty />
          )}
        </Card>
        <Card>
          <h2>Ventas por cliente</h2>
          <span className="muted">
            Los 7 clientes con más ventas del periodo
          </span>
          {clientChart.length ? (
            <ClientBars data={clientChart} currency={unit === "$"} />
          ) : (
            <Empty />
          )}
        </Card>
      </div>
      <Card>
        <div className="section-heading">
          <h2>Últimos pedidos</h2>
          <span className="muted">{o.length} pedidos</span>
        </div>
        <DataTable
          key={`${p.period.start}-${p.period.end}`}
          rows={orderRows}
          columns={columns}
          rowId={(row) => row.order.id}
          initialSort={{ id: "date", direction: "desc" }}
        />
      </Card>
    </>
  );
}
