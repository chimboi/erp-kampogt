import Dashboard from "@/components/dashboard";
import { Suspense } from "react";
async function Content({
  searchParams,
}: {
  searchParams: Promise<{ fecha?: string }>;
}) {
  const { fecha } = await searchParams;
  const initialDate =
    fecha &&
    /^\d{4}-\d{2}-\d{2}$/.test(fecha) &&
    Number.isFinite(Date.parse(fecha))
      ? fecha
      : undefined;
  return <Dashboard key={initialDate ?? "default"} initialDate={initialDate} />;
}
export default function Page({
  searchParams,
}: {
  searchParams: Promise<{ fecha?: string }>;
}) {
  return (
    <Suspense fallback={<p>Cargando control de caja…</p>}>
      <Content searchParams={searchParams} />
    </Suspense>
  );
}
