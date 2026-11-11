"use client";
import { useState } from "react";
import { Card, Kpi, Table, Empty } from "./ui";
import { PeriodPicker, usePeriod, within } from "./period-picker";
import { Trend, Donut, Bars } from "./charts";
import { useStore } from "@/lib/store";
import {
  shipments,
  clients,
  clientName,
  shipmentName,
  saleTotal,
  cost,
  money,
  number,
} from "@/data";
export default function Indicators({
  view,
}: {
  view: "ventas" | "financieros" | "embarques";
}) {
  const p = usePeriod("Año"),
    store = useStore(),
    [group, setGroup] = useState("Producto");
  const sales = store.sales.filter((s) => within(s.date, p.period)),
    ships = shipments.filter((s) => within(s.date, p.period)),
    revenue = sales.reduce((a, s) => a + saleTotal(s), 0),
    purchase = ships.reduce((a, s) => a + s.kg * s.purchase, 0),
    expenses = ships.reduce((a, s) => a + cost(s) - s.kg * s.purchase, 0);
  const groups = Object.entries(
    sales.reduce<Record<string, number>>((a, s) => {
      const key =
        group === "Producto"
          ? s.product
          : group === "Cliente"
            ? clientName(s.client)
            : (clients.find((c) => c.id === s.client)?.city ?? "Mostrador");
      a[key] = (a[key] ?? 0) + saleTotal(s);
      return a;
    }, {}),
  ).sort((a, b) => b[1] - a[1]);
  const monthly = Array.from(
    new Set([
      ...sales.map((s) => s.date.slice(0, 7)),
      ...ships.map((s) => s.date.slice(0, 7)),
    ]),
  )
    .sort()
    .map((month) => ({
      name: new Date(month + "-15T12:00:00").toLocaleDateString("es-MX", {
        month: "short",
        year: "2-digit",
      }),
      Ingresos: sales
        .filter((s) => s.date.startsWith(month))
        .reduce((a, s) => a + saleTotal(s), 0),
      Costos: ships
        .filter((s) => s.date.startsWith(month))
        .reduce((a, s) => a + s.kg * s.purchase, 0),
      Gastos: ships
        .filter((s) => s.date.startsWith(month))
        .reduce((a, s) => a + cost(s) - s.kg * s.purchase, 0),
    }));
  const ranked = Array.from(new Set(sales.map((s) => s.client)))
    .map((id) => ({
      id,
      name: clientName(id),
      count: new Set(
        sales.filter((s) => s.client === id).map((s) => s.shipment),
      ).size,
      kg: sales.filter((s) => s.client === id).reduce((a, s) => a + s.kg, 0),
    }))
    .sort((a, b) => b.count - a.count || b.kg - a.kg);
  return (
    <>
      <div className="page-title">
        <h1>
          {view === "ventas"
            ? "Análisis de ingresos"
            : view === "financieros"
              ? "Estado de resultados"
              : "Embarques por cliente"}
        </h1>
      </div>
      <PeriodPicker state={p} />
      {view === "ventas" ? (
        <>
          <div className="segmented mb-5">
            {["Producto", "Cliente", "Plaza"].map((g) => (
              <button
                key={g}
                className={g === group ? "active" : ""}
                onClick={() => setGroup(g)}
              >
                {g}
              </button>
            ))}
          </div>
          <div className="revenue-banner">
            <div>
              <p className="label-caps">Ingresos totales</p>
              <strong>{money(revenue)}</strong>
            </div>
            <span>
              {number(sales.reduce((a, s) => a + s.kg, 0))} kg vendidos
            </span>
          </div>
          <div className="breakdown">
            {groups.map(([name, value]) => (
              <Card key={name}>
                <div className="flex justify-between">
                  <h3>{name}</h3>
                  <span className="muted">
                    {((value / revenue) * 100).toFixed(1)}%
                  </span>
                </div>
                <strong className="text-2xl">{money(value)}</strong>
                <div className="payment-bar">
                  <i
                    style={{
                      width: `${(value / revenue) * 100}%`,
                      background: name === "Morada" ? "#7b3fa0" : undefined,
                    }}
                  />
                </div>
              </Card>
            ))}
          </div>
          <div className="two-cols">
            <Card>
              <h2>Ingresos por mes</h2>
              {monthly.length ? (
                <Trend data={monthly} keys={["Ingresos"]} />
              ) : (
                <Empty />
              )}
            </Card>
            <Card>
              <h2>Distribución de ingresos</h2>
              {groups.length ? (
                <Donut
                  data={groups.map(([name, value]) => ({ name, value }))}
                />
              ) : (
                <Empty />
              )}
            </Card>
          </div>
        </>
      ) : view === "financieros" ? (
        <>
          <div className="kpis three">
            <Kpi label="Ingresos" value={money(revenue)} />
            <Kpi
              label="Costo de ventas"
              value={money(purchase)}
              detail="Compra de cebolla"
            />
            <Kpi
              label="Gastos de operación"
              value={money(expenses)}
              detail="Flete, descarga, báscula y maniobra"
            />
          </div>
          <div className="two-cols">
            <Card>
              <h2>Ingresos por mes</h2>
              <Trend data={monthly} keys={["Ingresos"]} />
            </Card>
            <Card>
              <h2>Costos y gastos</h2>
              <Bars data={monthly} />
            </Card>
          </div>
          <Card>
            <h2>Resultado del periodo</h2>
            {[
              ["Utilidad bruta", revenue - purchase],
              ["Utilidad operativa", revenue - purchase - expenses],
              ["Utilidad neta", revenue - purchase - expenses],
            ].map(([name, value]) => (
              <div className="total-line" key={String(name)}>
                <span>{name}</span>
                <div>
                  <strong>{money(Number(value))}</strong>
                  <small>
                    {revenue ? ((Number(value) / revenue) * 100).toFixed(1) : 0}
                    % sobre ingresos
                  </small>
                </div>
              </div>
            ))}
            <p className="muted text-xs mt-4">
              Demo sin impuestos ni gastos financieros.
            </p>
          </Card>
        </>
      ) : (
        <>
          <div className="kpis three">
            <Kpi label="Clientes atendidos" value={number(ranked.length)} />
            <Kpi
              label="Embarques"
              value={number(new Set(sales.map((s) => s.shipment)).size)}
            />
            <Kpi
              label="Kilos vendidos"
              value={number(sales.reduce((a, s) => a + s.kg, 0))}
            />
          </div>
          <Card>
            <h2>Ranking de clientes</h2>
            <Table
              heads={[
                "Posición",
                "Cliente",
                "Embarques",
                "Kilos",
                "Participación",
              ]}
            >
              {ranked.map((c, i) => (
                <tr key={c.id}>
                  <td>
                    <span className="rank">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                  </td>
                  <td className="font-semibold">{c.name}</td>
                  <td>{c.count}</td>
                  <td>{number(c.kg)}</td>
                  <td>
                    <div className="payment-bar">
                      <i
                        style={{
                          width: `${(c.kg / (ranked[0]?.kg || 1)) * 100}%`,
                        }}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </Table>
            {!ranked.length && <Empty />}
          </Card>
          <Card>
            <h2>Kilos por cliente y embarque</h2>
            <Table heads={["Cliente", ...ships.map((s) => shipmentName(s.id))]}>
              {ranked.map((c) => (
                <tr key={c.id}>
                  <td>{c.name}</td>
                  {ships.map((s) => {
                    const kg = sales
                      .filter((v) => v.client === c.id && v.shipment === s.id)
                      .reduce((a, v) => a + v.kg, 0);
                    return (
                      <td
                        key={s.id}
                        style={{
                          background: kg
                            ? `rgba(63,163,77,${Math.min(0.8, kg / 10000)})`
                            : undefined,
                        }}
                      >
                        {kg ? number(kg) : "—"}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </Table>
          </Card>
        </>
      )}
    </>
  );
}
