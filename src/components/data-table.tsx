"use client";
import { useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, Filter } from "lucide-react";
import { number } from "@/data";

export type Column<T> = {
  id: string;
  label: string;
  value: (row: T) => string | number;
  filterValue?: (row: T) => string;
  render?: (row: T) => ReactNode;
};
export function DataTable<T>({
  rows,
  columns,
  rowId,
  initialSort,
  pageSize = 40,
}: {
  rows: T[];
  columns: Column<T>[];
  rowId: (row: T) => string;
  initialSort?: { id: string; direction: "asc" | "desc" };
  pageSize?: number;
}) {
  const [sort, setSort] = useState(initialSort);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [openFilters, setOpenFilters] = useState<string[]>([]);
  const [page, setPage] = useState(0);
  const normalize = (value: string) =>
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLocaleLowerCase("es");
  const filtered = rows.filter((row) =>
    columns.every(
      (column) =>
        !filters[column.id] ||
        normalize(
          column.filterValue?.(row) ?? String(column.value(row)),
        ).includes(normalize(filters[column.id])),
    ),
  );
  const column = columns.find((column) => column.id === sort?.id);
  const sorted = column
    ? [...filtered].sort((a, b) => {
        const left = column.value(a),
          right = column.value(b);
        const comparison =
          typeof left === "number" && typeof right === "number"
            ? left - right
            : String(left).localeCompare(String(right), "es", {
                numeric: true,
              });
        return comparison * (sort?.direction === "desc" ? -1 : 1);
      })
    : filtered;
  const pageIndex = Math.min(
    page,
    Math.max(0, Math.ceil(sorted.length / pageSize) - 1),
  );
  return (
    <>
      <div className="table-scroll spreadsheet-table">
        <table>
          <thead>
            <tr>
              {columns.map((column) => (
                <th
                  key={column.id}
                  aria-sort={
                    sort?.id === column.id
                      ? sort.direction === "asc"
                        ? "ascending"
                        : "descending"
                      : "none"
                  }
                >
                  <div className="column-controls">
                    <button
                      aria-label={`Ordenar ${column.label} ${sort?.id === column.id && sort.direction === "asc" ? "de mayor a menor" : "de menor a mayor"}`}
                      onClick={() => {
                        setSort({
                          id: column.id,
                          direction:
                            sort?.id === column.id && sort.direction === "asc"
                              ? "desc"
                              : "asc",
                        });
                        setPage(0);
                      }}
                    >
                      {column.label}
                      {sort?.id !== column.id ? (
                        <ArrowUpDown size={12} />
                      ) : sort.direction === "asc" ? (
                        <ArrowUp size={12} />
                      ) : (
                        <ArrowDown size={12} />
                      )}
                    </button>
                    <button
                      aria-label={`Filtrar ${column.label}`}
                      aria-expanded={openFilters.includes(column.id)}
                      className={filters[column.id] ? "filter-active" : ""}
                      onClick={() =>
                        setOpenFilters((ids) =>
                          ids.includes(column.id)
                            ? ids.filter((id) => id !== column.id)
                            : [...ids, column.id],
                        )
                      }
                    >
                      <Filter size={12} />
                    </button>
                  </div>
                </th>
              ))}
            </tr>
            {openFilters.length > 0 && (
              <tr className="column-filters">
                {columns.map((column) => (
                  <th key={column.id}>
                    {openFilters.includes(column.id) && (
                      <input
                        autoFocus
                        aria-label={`Filtro ${column.label}`}
                        placeholder="Filtrar…"
                        value={filters[column.id] ?? ""}
                        onChange={(event) => {
                          setFilters({
                            ...filters,
                            [column.id]: event.target.value,
                          });
                          setPage(0);
                        }}
                      />
                    )}
                  </th>
                ))}
              </tr>
            )}
          </thead>
          <tbody>
            {sorted
              .slice(pageIndex * pageSize, (pageIndex + 1) * pageSize)
              .map((row) => (
                <tr key={rowId(row)}>
                  {columns.map((column) => (
                    <td key={column.id}>
                      {column.render ? column.render(row) : column.value(row)}
                    </td>
                  ))}
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      {!sorted.length && (
        <p className="empty">
          No hay movimientos que coincidan con los filtros.
        </p>
      )}
      <div className="order-pagination">
        {Object.values(filters).some(Boolean) && (
          <button
            className="text-link"
            onClick={() => {
              setFilters({});
              setPage(0);
            }}
          >
            Limpiar filtros
          </button>
        )}
        <span className="muted">
          {sorted.length ? pageIndex * pageSize + 1 : 0}–
          {Math.min((pageIndex + 1) * pageSize, sorted.length)} de{" "}
          {number(sorted.length)}
        </span>
        {sorted.length > pageSize && (
          <>
            <button
              className="secondary"
              disabled={!pageIndex}
              onClick={() => setPage(pageIndex - 1)}
            >
              Anterior
            </button>
            <button
              className="secondary"
              disabled={(pageIndex + 1) * pageSize >= sorted.length}
              onClick={() => setPage(pageIndex + 1)}
            >
              Siguiente
            </button>
          </>
        )}
      </div>
    </>
  );
}
