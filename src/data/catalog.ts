export type CatalogProduct = "Blanca" | "Morada" | "Amarilla";
export const CATALOG_KEY = "kampo-catalog-v1";
export const catalogTiers = [
  { min: 0, max: 49, label: "0–49 kg" },
  { min: 50, max: 200, label: "50–200 kg" },
  { min: 201, max: 499, label: "201–499 kg" },
  { min: 500, max: 700, label: "500–700 kg" },
  { min: 701, max: Infinity, label: "701+ kg" },
];
export const catalogProducts: CatalogProduct[] = [
  "Blanca",
  "Morada",
  "Amarilla",
];
export const catalogRoutes = [
  "Tepic",
  "Michoacán",
  "Colima",
  "Guanajuato",
  "Monterrey",
];
export type CatalogChange = {
  id: string;
  key: string;
  date: string;
  timestamp: string;
  before: number;
  price: number;
};
export type CatalogState = { changes: CatalogChange[] };
export const emptyCatalog: CatalogState = { changes: [] };
export function catalogToday() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Mexico_City",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}
export function catalogDayOffset(day: string, offset: number) {
  return new Date(Date.parse(day + "T12:00:00Z") + offset * 86400000)
    .toISOString()
    .slice(0, 10);
}
export function catalogBasePrice(key: string, day: string) {
  const variation =
    (Math.floor(Date.parse(day + "T12:00:00Z") / 86400000) % 7) - 3;
  const [kind, name, tier] = key.split(":");
  if (kind === "freight")
    return (
      [6500, 8500, 7000, 9500, 22500][catalogRoutes.indexOf(name)] +
      variation * 100
    );
  const base =
    { Blanca: 19, Morada: 23, Amarilla: 21 }[name as CatalogProduct] ?? 19;
  return (
    Math.round(
      (base - [0, 1, 2, 3, 4][Number(tier)] + variation * 0.25) * 100,
    ) / 100
  );
}
export function catalogPrice(
  state: CatalogState,
  key: string,
  day = catalogToday(),
) {
  const latest = state.changes
    .filter((c) => c.key === key && c.date <= day)
    .sort(
      (a, b) =>
        b.date.localeCompare(a.date) || b.timestamp.localeCompare(a.timestamp),
    )[0];
  return latest?.price ?? catalogBasePrice(key, day);
}
export function catalogProductPrice(
  state: CatalogState,
  product: CatalogProduct,
  kg: number,
  day = catalogToday(),
) {
  const tier = kg < 50 ? 0 : kg < 201 ? 1 : kg < 500 ? 2 : kg < 701 ? 3 : 4;
  return catalogPrice(state, `product:${product}:${tier}`, day);
}
export function catalogAgentContext(state: CatalogState, day = catalogToday()) {
  return (
    `CATÁLOGO VIGENTE ${day} (MXN; precios demo editables; usar estos precios al cotizar):\n` +
    catalogProducts
      .map(
        (product) =>
          `${product}: ${catalogTiers.map((tier, i) => `${tier.label} $${catalogPrice(state, `product:${product}:${i}`, day).toFixed(2)}/kg`).join(", ")}`,
      )
      .join("\n") +
    "\nFletes desde Guadalajara por viaje: " +
    catalogRoutes
      .map(
        (route) => `${route} $${catalogPrice(state, `freight:${route}`, day)}`,
      )
      .join(", ") +
    ". No sumar flete sin confirmar destino con el cliente."
  );
}

export function readCatalog(): CatalogState {
  if (typeof window === "undefined") return emptyCatalog;
  try {
    const state = JSON.parse(
      window.localStorage.getItem(CATALOG_KEY) ?? "null",
    );
    return state && Array.isArray(state.changes) ? state : emptyCatalog;
  } catch {
    return emptyCatalog;
  }
}
export function catalogFreightPrice(
  state: CatalogState,
  destination: string,
  day = catalogToday(),
): number | null {
  const normalized = destination
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  const aliases: Record<string, string> = {
    tepic: "Tepic",
    michoacan: "Michoacán",
    morelia: "Michoacán",
    zamora: "Michoacán",
    colima: "Colima",
    guanajuato: "Guanajuato",
    leon: "Guanajuato",
    monterrey: "Monterrey",
  };
  const route = aliases[normalized];
  return route ? catalogPrice(state, `freight:${route}`, day) : null;
}
