"use client";
import { clients, purchaseLabels, salePaid, type Sale } from "@/data";
import { usePersistentState, useStore } from "@/lib/store";
import { invoicePdf, type Invoice } from "@/lib/invoice-pdf";
export default function InvoiceButton({ sale }: { sale: Sale }) {
  const store = useStore();
  const [invoices, setInvoices] = usePersistentState<Record<string, Invoice>>(
    "kampo-invoices-v1",
    {},
  );
  const existing = invoices[sale.id];
  const paid = salePaid(sale);
  return (
    <button
      type="button"
      className="secondary"
      title="Factura PDF demo sin validez fiscal. Disponible desde el registro de la venta, antes del cobro."
      onClick={() => {
        const invoice = existing ?? {
          number: `KGT-${sale.id
            .replace(/[^a-zA-Z0-9]/g, "")
            .slice(-12)
            .toUpperCase()}`,
          issued: new Date().toLocaleDateString("es-MX"),
          saleDate: sale.date,
          client:
            clients.find((c) => c.id === sale.client)?.name ?? sale.client,
          product: sale.product,
          kg: sale.kg,
          price: sale.price,
          paid,
          purchase:
            purchaseLabels(store.shipments).get(sale.shipment) ?? sale.shipment,
        };
        const bytes = invoicePdf(invoice);
        const blob = new Blob([bytes as BlobPart], { type: "application/pdf" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${invoice.number}.pdf`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 10000);
        if (!existing) setInvoices((rows) => ({ ...rows, [sale.id]: invoice }));
      }}
    >
      {existing ? "Descargar factura" : "Facturar PDF"}
    </button>
  );
}
