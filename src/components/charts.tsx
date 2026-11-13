"use client";
import { money, number } from "@/data";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
export const chartColors = [
  "#3fa34d",
  "#7b3fa0",
  "#0e3b2c",
  "#e5a16e",
  "#a8b7a3",
  "#ddadbc",
  "#4e96ad",
  "#bc9b40",
  "#62805a",
  "#a86a76",
];
export function Trend({
  data,
  keys = ["Blanca", "Morada"],
  dotEvery,
  currency = false,
}: {
  data: Record<string, string | number>[];
  keys?: string[];
  dotEvery?: number;
  currency?: boolean;
}) {
  return (
    <div className="chart">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            {keys.map((k, i) => (
              <linearGradient
                key={k}
                id={"fill" + i}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop
                  offset="0%"
                  stopColor={["#3fa34d", "#9363ad", "#d5a52b"][i % 3]}
                  stopOpacity={0.22}
                />
                <stop
                  offset="100%"
                  stopColor={["#3fa34d", "#9363ad", "#d5a52b"][i % 3]}
                  stopOpacity={0}
                />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid
            strokeDasharray="3 5"
            vertical={false}
            stroke="#e8ede8"
          />
          <XAxis
            dataKey="name"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 11 }}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 11 }}
            tickFormatter={(v) => (v >= 1000 ? `${Math.round(v / 1000)}k` : v)}
          />
          <Tooltip
            formatter={(v) => (currency ? money(Number(v)) : number(Number(v)))}
          />
          <Legend />
          {keys.map((k, i) => (
            <Area
              key={k}
              type="monotone"
              dataKey={k}
              stroke={["#3fa34d", "#9363ad", "#d5a52b"][i % 3]}
              fill={`url(#fill${i})`}
              strokeWidth={2.5}
              dot={
                dotEvery
                  ? (props) => {
                      const { cx, cy, index } = props;
                      return (
                        <circle
                          key={index}
                          cx={cx}
                          cy={cy}
                          r={index % dotEvery === 0 ? 3.5 : 0}
                          fill={["#3fa34d", "#9363ad", "#d5a52b"][i % 3]}
                          stroke="white"
                          strokeWidth={2}
                        />
                      );
                    }
                  : false
              }
              activeDot={{ r: 5 }}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
export function Bars({ data }: { data: Record<string, string | number>[] }) {
  return (
    <div className="chart">
      <ResponsiveContainer>
        <BarChart data={data}>
          <CartesianGrid vertical={false} stroke="#e8ede8" />
          <XAxis dataKey="name" tick={{ fontSize: 11 }} />
          <YAxis
            tickFormatter={(v) => `${Math.round(v / 1000)}k`}
            tick={{ fontSize: 11 }}
          />
          <Tooltip />
          <Legend />
          <Bar dataKey="Costos" stackId="a" fill="#0e3b2c" />
          <Bar
            dataKey="Gastos"
            stackId="a"
            fill="#a0cfa2"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
export function Donut({
  data,
  currency = false,
  showLegend = true,
}: {
  data: { name: string; value: number }[];
  currency?: boolean;
  showLegend?: boolean;
}) {
  return (
    <div className="chart">
      <ResponsiveContainer>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            innerRadius={65}
            outerRadius={100}
            paddingAngle={4}
          >
            {data.map((d, i) => (
              <Cell key={d.name} fill={chartColors[i % chartColors.length]} />
            ))}
          </Pie>
          <Tooltip
            formatter={(v) => (currency ? money(Number(v)) : number(Number(v)))}
          />
          {showLegend && <Legend />}
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ClientBars({
  data,
  currency,
}: {
  data: { name: string; value: number }[];
  currency: boolean;
}) {
  return (
    <div className="chart">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ right: 20 }}>
          <CartesianGrid horizontal={false} stroke="#e8ede8" />
          <XAxis
            type="number"
            tickFormatter={(v) =>
              `${currency ? "$" : ""}${v >= 1000 ? `${Math.round(v / 1000)}k` : v}`
            }
            tick={{ fontSize: 11 }}
          />
          <YAxis
            type="category"
            dataKey="name"
            width={115}
            tick={{ fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            formatter={(v) =>
              currency ? money(Number(v)) : `${number(Number(v))} kg`
            }
          />
          <Bar
            dataKey="value"
            name={currency ? "Ventas" : "Kilos"}
            fill="#3fa34d"
            radius={[0, 5, 5, 0]}
            maxBarSize={24}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
