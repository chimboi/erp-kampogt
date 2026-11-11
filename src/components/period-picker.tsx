"use client";
import { useState } from "react";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { TODAY } from "@/data";
export type Period = { start: string; end: string };
const iso = (d: Date) => d.toISOString().slice(0, 10);
export function getPeriod(mode: string, anchor: string): Period {
  const d = new Date(anchor + "T12:00:00Z"),
    e = new Date(d);
  if (mode === "Semana") {
    d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
    e.setTime(d.getTime());
    e.setUTCDate(e.getUTCDate() + 6);
  }
  if (mode === "Mes") {
    d.setUTCDate(1);
    e.setUTCMonth(e.getUTCMonth() + 1, 0);
  }
  if (mode === "Año") {
    d.setUTCMonth(0, 1);
    e.setUTCMonth(11, 31);
  }
  return { start: iso(d), end: iso(e) };
}
export const within = (date: string, p: Period) =>
  date >= p.start && date <= p.end;
export function usePeriod(initial = "Mes") {
  const [mode, setMode] = useState(initial),
    [anchor, setAnchor] = useState(TODAY),
    [range, setRange] = useState({ start: "2026-01-01", end: TODAY });
  const period = mode === "Rango" ? range : getPeriod(mode, anchor);
  return { mode, setMode, anchor, setAnchor, range, setRange, period };
}
export function PeriodPicker({
  state,
}: {
  state: ReturnType<typeof usePeriod>;
}) {
  const { mode, setMode, anchor, setAnchor, range, setRange, period } = state;
  function move(n: number) {
    const d = new Date(anchor + "T12:00:00Z");
    if (mode === "Mes") {
      d.setUTCDate(1);
      d.setUTCMonth(d.getUTCMonth() + n);
    } else if (mode === "Año") d.setUTCFullYear(d.getUTCFullYear() + n);
    else d.setUTCDate(d.getUTCDate() + n * (mode === "Semana" ? 7 : 1));
    setAnchor(iso(d));
  }
  return (
    <div className="period">
      <div className="segmented">
        {["Día", "Semana", "Mes", "Año", "Rango"].map((m) => (
          <button
            key={m}
            className={mode === m ? "active" : ""}
            onClick={() => setMode(m)}
          >
            {m}
          </button>
        ))}
      </div>
      {mode === "Rango" ? (
        <div className="flex gap-2">
          <input
            aria-label="Desde"
            type="date"
            value={range.start}
            max={range.end}
            onChange={(e) => {
              const value = e.target.value;
              if (value)
                setRange({
                  start: value,
                  end: value > range.end ? value : range.end,
                });
            }}
          />
          <input
            aria-label="Hasta"
            type="date"
            min={range.start}
            value={range.end}
            onChange={(e) => {
              const value = e.target.value;
              if (value)
                setRange({
                  end: value,
                  start: value < range.start ? value : range.start,
                });
            }}
          />
        </div>
      ) : (
        <div className="date-nav">
          <button aria-label="Periodo anterior" onClick={() => move(-1)}>
            <ChevronLeft size={16} />
          </button>
          <CalendarDays size={15} />
          <span>
            {period.start === period.end
              ? period.start
              : `${period.start} — ${period.end}`}
          </span>
          <button aria-label="Periodo siguiente" onClick={() => move(1)}>
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
