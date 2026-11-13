"use client";
import { useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  ChevronDown,
} from "lucide-react";
import { TODAY } from "@/data";
export const compactDate = (value: string) => {
  const [, month, day] = value.split("-");
  const months = [
    "ene",
    "feb",
    "mar",
    "abr",
    "may",
    "jun",
    "jul",
    "ago",
    "sep",
    "oct",
    "nov",
    "dic",
  ];
  return `${Number(day)}-${months[Number(month) - 1] ?? month}`;
};
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
export function usePeriod(initial = "Mes", initialAnchor = TODAY) {
  const [mode, setMode] = useState(initial),
    [anchor, setAnchor] = useState(initialAnchor),
    [range, setRange] = useState({ start: "2026-01-01", end: TODAY });
  const period = mode === "Rango" ? range : getPeriod(mode, anchor);
  return { mode, setMode, anchor, setAnchor, range, setRange, period };
}
export function PeriodPicker({
  state,
  compact = false,
}: {
  state: ReturnType<typeof usePeriod>;
  compact?: boolean;
}) {
  const { mode, setMode, anchor, setAnchor, range, setRange, period } = state;
  const label = (value: string) =>
    compact
      ? compactDate(value) +
        (period.start.slice(0, 4) !== period.end.slice(0, 4)
          ? ` ${value.slice(0, 4)}`
          : "")
      : value;
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
            onClick={() => {
              if (m === "Rango") setRange(period);
              setMode(m);
            }}
          >
            {m}
          </button>
        ))}
      </div>
      <div className="date-nav">
        <button
          aria-label="Periodo anterior"
          disabled={mode === "Rango"}
          onClick={() => move(-1)}
        >
          <ChevronLeft size={16} />
        </button>
        <details className="date-dropdown">
          <summary>
            <CalendarDays size={15} />
            <span title={`${period.start} — ${period.end}`}>
              {period.start === period.end
                ? label(period.start)
                : `${label(period.start)} — ${label(period.end)}`}
            </span>
            <ChevronDown size={14} />
          </summary>
          <div className="date-popover">
            <label>
              Selección de fecha
              <select
                aria-label="Tipo de selección de fecha"
                value={mode === "Rango" ? "Rango" : "Fecha"}
                onChange={(e) => {
                  if (e.target.value === "Rango") {
                    setRange(period);
                    setMode("Rango");
                  } else setMode("Día");
                }}
              >
                <option value="Fecha">Fecha</option>
                <option value="Rango">Rango personalizado</option>
              </select>
            </label>
            {mode === "Rango" ? (
              <>
                <label>
                  Desde
                  <input
                    aria-label="Desde"
                    type="date"
                    value={range.start}
                    max={range.end}
                    onChange={(e) => {
                      if (e.target.value)
                        setRange({
                          start: e.target.value,
                          end:
                            e.target.value > range.end
                              ? e.target.value
                              : range.end,
                        });
                    }}
                  />
                </label>
                <label>
                  Hasta
                  <input
                    aria-label="Hasta"
                    type="date"
                    value={range.end}
                    min={range.start}
                    onChange={(e) => {
                      if (e.target.value)
                        setRange({
                          end: e.target.value,
                          start:
                            e.target.value < range.start
                              ? e.target.value
                              : range.start,
                        });
                    }}
                  />
                </label>
              </>
            ) : (
              <label>
                Fecha
                <input
                  aria-label="Fecha del periodo"
                  type="date"
                  value={anchor}
                  onChange={(e) => {
                    if (e.target.value) setAnchor(e.target.value);
                  }}
                />
              </label>
            )}
          </div>
        </details>
        <button
          aria-label="Periodo siguiente"
          disabled={mode === "Rango"}
          onClick={() => move(1)}
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
