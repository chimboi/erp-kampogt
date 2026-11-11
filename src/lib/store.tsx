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
  shipments,
  expandLegacyHistory,
  type Shipment,
  sales,
  seedMovements,
  type Order,
  type Sale,
  type Movement,
} from "@/data";
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
  const history = useMemo(() => expandLegacyHistory(m), [m]);
  return (
    <Context.Provider
      value={{
        shipments: sh,
        setShipments: setSh,
        orders: o,
        setOrders: so,
        sales: s,
        setSales: ss,
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
