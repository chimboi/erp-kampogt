"use client";
import {
  createContext,
  useContext,
  useSyncExternalStore,
  useCallback,
  useMemo,
  type Dispatch,
  type SetStateAction,
} from "react";
import {
  orders,
  legacyDemoSales,
  legacyDemoOrders,
  legacyDemoShipments,
  salePaid,
  saleTotal,
  mergeDemoRecords,
  shipments,
  expandLegacyHistory,
  type Shipment,
  sales,
  seedMovements,
  type Order,
  type Sale,
  type Movement,
} from "@/data";
import {
  cashEntries,
  applyCollections,
  collectedFor,
  mergeCashDemo,
  type CashEntry,
} from "@/data/cash";
const memory = new Map<string, string>();
const listeners = new Set<() => void>();
function subscribe(callback: () => void) {
  listeners.add(callback);
  window.addEventListener("storage", callback);
  return () => {
    listeners.delete(callback);
    window.removeEventListener("storage", callback);
  };
}
function read(key: string, fallback: string) {
  try {
    return localStorage.getItem(key) ?? memory.get(key) ?? fallback;
  } catch {
    return memory.get(key) ?? fallback;
  }
}
export function usePersistentState<T>(
  key: string,
  initial: T,
): [T, Dispatch<SetStateAction<T>>] {
  const fallback = JSON.stringify(initial);
  const raw = useSyncExternalStore(
    subscribe,
    () => read(key, fallback),
    () => fallback,
  );
  const value = useMemo(() => {
    try {
      return JSON.parse(raw) as T;
    } catch {
      return JSON.parse(fallback) as T;
    }
  }, [raw, fallback]);
  const setValue = useCallback<Dispatch<SetStateAction<T>>>(
    (update) => {
      let current: T;
      try {
        current = JSON.parse(read(key, fallback));
      } catch {
        current = JSON.parse(fallback);
      }
      const next =
        typeof update === "function"
          ? (update as (previous: T) => T)(current)
          : update;
      const serialized = JSON.stringify(next);
      memory.set(key, serialized);
      try {
        localStorage.setItem(key, serialized);
      } catch {}
      listeners.forEach((callback) => callback());
    },
    [key, fallback],
  );
  return [value, setValue];
}
type Store = {
  cashEntries: CashEntry[];
  registerCollection: (entry: CashEntry) => boolean;
  setCashEntries: Dispatch<SetStateAction<CashEntry[]>>;
  shipments: Shipment[];
  setShipments: Dispatch<SetStateAction<Shipment[]>>;
  orders: Order[];
  setOrders: Dispatch<SetStateAction<Order[]>>;
  sales: Sale[];
  setSales: Dispatch<SetStateAction<Sale[]>>;
  movements: Movement[];
  setMovements: Dispatch<SetStateAction<Movement[]>>;
};
const Context = createContext<Store | null>(null);
export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [o, so] = usePersistentState("kampo-orders-v1", orders),
    [s, ss] = usePersistentState("kampo-sales-v1", sales),
    [m, sm] = usePersistentState("kampo-movements-v1", seedMovements);
  const [sh, setSh] = usePersistentState("kampo-shipments-v1", shipments);
  const [cash, setCash] = usePersistentState("kampo-cash-v1", cashEntries);
  const baseOrders = useMemo(
    () => mergeDemoRecords(o, orders, legacyDemoOrders),
    [o],
  );
  const baseSales = useMemo(
    () => mergeDemoRecords(s, sales, legacyDemoSales),
    [s],
  );
  const allShipments = useMemo(
    () => mergeDemoRecords(sh, shipments, legacyDemoShipments),
    [sh],
  );
  const ledger = useMemo(() => mergeCashDemo(cash), [cash]);
  const allSales = useMemo(
    () => applyCollections(baseSales, ledger),
    [baseSales, ledger],
  );
  const allOrders = useMemo(
    () =>
      baseOrders.map((order) => {
        const sale = allSales.find((sale) => sale.id === order.saleId);
        const paid = sale
          ? salePaid(sale)
          : Math.min(
              order.kg * order.price,
              (order.paid ?? 0) + collectedFor(ledger, "orderId", order.id),
            );
        return { ...order, paid };
      }),
    [baseOrders, allSales, ledger],
  );
  const history = useMemo(() => expandLegacyHistory(m), [m]);
  return (
    <Context.Provider
      value={{
        cashEntries: ledger,
        setCashEntries: (update) =>
          setCash((prev) =>
            typeof update === "function" ? update(mergeCashDemo(prev)) : update,
          ),
        registerCollection: (entry) => {
          let accepted = false;
          setCash((previous) => {
            const entries = mergeCashDemo(previous);
            if (entries.some((row) => row.id === entry.id)) return entries;
            const sale = baseSales.find((sale) => sale.id === entry.saleId);
            const order = baseOrders.find(
              (order) => order.id === entry.orderId,
            );
            const total = sale
              ? saleTotal(sale)
              : order
                ? order.kg * order.price
                : 0;
            const alreadyPaid = sale
              ? salePaid(sale) + collectedFor(entries, "saleId", sale.id)
              : order
                ? (order.paid ?? 0) + collectedFor(entries, "orderId", order.id)
                : 0;
            const sourceDate = sale?.date ?? order?.date;
            if (
              !sourceDate ||
              entry.date < sourceDate ||
              !Number.isFinite(entry.amount) ||
              entry.amount <= 0 ||
              Math.round(entry.amount * 100) >
                Math.round((total - alreadyPaid) * 100)
            )
              return entries;
            accepted = true;
            return [...entries, entry];
          });
          return accepted;
        },
        shipments: allShipments,
        setShipments: (update) =>
          setSh((prev) =>
            typeof update === "function"
              ? update(mergeDemoRecords(prev, shipments, legacyDemoShipments))
              : update,
          ),
        orders: allOrders,
        setOrders: (update) =>
          so((prev) => {
            const current = mergeDemoRecords(prev, orders, legacyDemoOrders);
            const effective = current.map((order) =>
              order.saleId
                ? order
                : {
                    ...order,
                    paid:
                      (order.paid ?? 0) +
                      collectedFor(ledger, "orderId", order.id),
                  },
            );
            const next =
              typeof update === "function" ? update(effective) : update;
            return next.map((order) =>
              order.saleId
                ? order
                : {
                    ...order,
                    paid: Math.max(
                      0,
                      (order.paid ?? 0) -
                        collectedFor(ledger, "orderId", order.id),
                    ),
                  },
            );
          }),
        sales: allSales,
        setSales: (update) =>
          ss((prev) => {
            const raw = mergeDemoRecords(prev, sales, legacyDemoSales);
            const current = applyCollections(raw, ledger);
            const next =
              typeof update === "function" ? update(current) : update;
            return next.map((sale) => {
              const collected = collectedFor(ledger, "saleId", sale.id);
              if (!collected) return sale;
              const paid = Math.max(
                0,
                Math.round((salePaid(sale) - collected) * 100) / 100,
              );
              return { ...sale, paid, cash: paid >= saleTotal(sale) };
            });
          }),
        movements: history,
        setMovements: (update) =>
          sm((previous) =>
            typeof update === "function"
              ? update(expandLegacyHistory(previous))
              : update,
          ),
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useStore() {
  const c = useContext(Context);
  if (!c) throw Error("Missing store");
  return c;
}
