import { Suspense } from "react";
import Content from "@/components/messages";
export default function Page() {
  return <Suspense fallback={<p>Cargando…</p>}><Content /></Suspense>;
}
