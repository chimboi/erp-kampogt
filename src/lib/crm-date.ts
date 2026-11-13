"use client";
import { useSyncExternalStore } from "react";
import { tomorrowDate } from "@/data/crm-automation";

function subscribe(callback: () => void) {
  const timer = window.setInterval(callback, 60000);
  window.addEventListener("focus", callback);
  return () => {
    window.clearInterval(timer);
    window.removeEventListener("focus", callback);
  };
}
// The server renders a placeholder; the browser supplies the current business date.
export function useTomorrowDate() {
  return useSyncExternalStore(subscribe, tomorrowDate, () => "");
}
