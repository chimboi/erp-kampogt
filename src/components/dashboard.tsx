"use client";
import { useState } from "react";
import { Card, Kpi, Badge, Table, Empty } from "./ui";
import { PeriodPicker, usePeriod, within } from "./period-picker";
import { Trend } from "./charts";
import { useStore } from "@/lib/store";
import {
  shipments,
  cost,
  saleTotal,
  money,
  number,
  date,
  statuses,
} from "@/data";
export default function Dashboard() {
  const p = usePeriod("Día"),
    store = useStore(),
    [unit, setUnit] = useState("$");
  const s = store.sales.filter((s) => within(s.date, p.period)),
    o = store.orders.filter((o) => within(o.date, p.period));
  const revenue = s.reduce((a, s) => a + saleTotal(s), 0),
    expense = shipments
      .filter((s) => within(s.date, p.period))
      .reduce((a, s) => a + cost(s), 0);
  const singleDay = p.period.start === p.period.end;
  const bucket = (sale: (typeof s)[number]) =>
    singleDay ? (sale.time ?? "15:00") : sale.date;
  const days = Array.from(new Set(s.map(bucket))).sort();
  const chart = days.map((d) => ({
    name: singleDay ? d : date(d),
    ...Object.fromEntries(
      ["Blanca", "Morada"].map((product) => [
        product,
        s
          .filter((s) => bucket(s) === d && s.product === product)
          .reduce((a, s) => a + (unit === "$" ? saleTotal(s) : s.kg), 0),
      ]),
    ),
  }));
  const span =
    new Date(p.period.end).getTime() -
    new Date(p.period.start).getTime() +
    86400000;
  const prev = {
    start: new Date(new Date(p.period.start).getTime() - span)
      .toISOString()
      .slice(0, 10),
    end: new Date(new Date(p.period.start).getTime() - 86400000)
      .toISOString()
      .slice(0, 10),
  };
  const prevRevenue = store.sales
    .filter((s) => within(s.date, prev))
    .reduce((a, s) => a + saleTotal(s), 0);
  return (
    <>
      <div className="page-title">
        <h1>Inicio</h1>
        <span className="muted">
          Buen día, Jorge <span className="wave">☀</span>
        </span>
      </div>
      <PeriodPicker state={p} />
      <div className="kpis">
        <Kpi
          label="Pedidos"
          value={number(o.length)}
          detail={`${o.filter((o) => o.status === "Pendiente de carga").length} pendientes de carga`}
        />
        <Kpi
          label="Ingresos"
          value={money(revenue)}
          detail={
            prevRevenue
              ? `${((revenue / prevRevenue - 1) * 100).toFixed(1)}% vs. periodo anterior`
              : "Sin ingresos en el periodo anterior"
          }
        />
        <Kpi
          label="Costos"
          value={money(expense)}
          detail="Compra + gastos de los embarques"
        />
        <Kpi
          label="Resultado"
          value={money(revenue - expense)}
          detail={`${revenue ? (((revenue - expense) / revenue) * 100).toFixed(1) : 0}% de margen`}
        />
      </div>
      <Card>
        <div className="section-heading">
          <h2>Ventas por producto</h2>
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
        {chart.length ? <Trend data={chart} /> : <Empty />}
      </Card>
      <Card>
        <div className="section-heading">
          <h2>Últimos pedidos</h2>
          <span className="muted">{o.length} pedidos</span>
        </div>
        <Table
          heads={[
            "Pedido",
            "Cliente",
            "Producto",
            "Carga",
            "Kilos",
            "Importe",
            "Estatus",
          ]}
        >
          {o
            .slice()
            .reverse()
            .map((o) => (
              <tr key={o.id}>
                <td className="font-semibold">{o.id}</td>
                <td>{o.client}</td>
                <td>
                  <Badge>{o.product}</Badge>
                </td>
                <td>{date(o.date)}</td>
                <td>{number(o.kg)}</td>
                <td>{money(o.kg * o.price)}</td>
                <td>
                  <select
                    aria-label={"Estatus " + o.id}
                    value={o.status}
                    onChange={(e) =>
                      store.setOrders((all) =>
                        all.map((x) =>
                          x.id === o.id ? { ...x, status: e.target.value } : x,
                        ),
                      )
                    }
                  >
                    {statuses.map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
        </Table>
        {!o.length && <Empty />}
      </Card>
    </>
  );
}
