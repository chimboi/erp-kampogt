"use client";
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
export function Trend({
  data,
  keys = ["Blanca", "Morada"],
}: {
  data: Record<string, string | number>[];
  keys?: string[];
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
                  stopColor={i ? "#9363ad" : "#3fa34d"}
                  stopOpacity={0.22}
                />
                <stop
                  offset="100%"
                  stopColor={i ? "#9363ad" : "#3fa34d"}
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
          <Tooltip formatter={(v) => Number(v).toLocaleString("es-MX")} />
          <Legend />
          {keys.map((k, i) => (
            <Area
              key={k}
              type="monotone"
              dataKey={k}
              stroke={i ? "#9363ad" : "#3fa34d"}
              fill={`url(#fill${i})`}
              strokeWidth={2.5}
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
export function Donut({ data }: { data: { name: string; value: number }[] }) {
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
              <Cell
                key={d.name}
                fill={
                  [
                    "#3fa34d",
                    "#7b3fa0",
                    "#0e3b2c",
                    "#f6c9a8",
                    "#a8b7a3",
                    "#ddadbc",
                  ][i % 6]
                }
              />
            ))}
          </Pie>
          <Tooltip formatter={(v) => Number(v).toLocaleString("es-MX")} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
