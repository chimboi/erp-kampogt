export type Invoice = {
  number: string;
  issued: string;
  saleDate: string;
  client: string;
  product: string;
  kg: number;
  price: number;
  paid: number;
  purchase: string;
};
const currency = (value: number) =>
  "$" +
  value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
function literal(value: string) {
  return (
    "(" +
    value
      .replace(/[^\x20-\xff]/g, "-")
      .replace(
        /[\\()\x80-\xff]/g,
        (c) => "\\" + c.charCodeAt(0).toString(8).padStart(3, "0"),
      ) +
    ")"
  );
}
/** Small, dependency-free single-page PDF; all text emitted as ASCII with WinAnsi escapes. */
export function invoicePdf(invoice: Invoice): Uint8Array {
  const commands: string[] = [];
  const text = (
    x: number,
    y: number,
    size: number,
    value: string,
    bold = false,
  ) =>
    commands.push(
      `BT /${bold ? "F2" : "F1"} ${size} Tf 1 0 0 1 ${x} ${y} Tm ${literal(value)} Tj ET`,
    );
  commands.push("0.12 0.17 0.14 rg");
  text(48, 780, 25, "KAMPO GT", true);
  text(48, 757, 10, "Comercialización de cebolla | Guadalajara, Jalisco");
  text(48, 711, 19, "FACTURA DE DEMOSTRACIÓN", true);
  text(48, 689, 10, "SIN VALIDEZ FISCAL · No es un CFDI timbrado");
  text(48, 650, 11, `Folio: ${invoice.number}`, true);
  text(350, 650, 10, `Emisión: ${invoice.issued}`);
  text(48, 625, 11, `Cliente: ${invoice.client.slice(0, 65)}`);
  text(48, 603, 10, `Fecha de venta: ${invoice.saleDate}`);
  text(48, 581, 10, `Compra de origen: ${invoice.purchase.slice(0, 65)}`);
  commands.push("0.92 0.95 0.92 rg 48 515 499 33 re f 0.12 0.17 0.14 rg");
  text(58, 527, 10, "PRODUCTO", true);
  text(285, 527, 10, "KG", true);
  text(352, 527, 10, "PRECIO/KG", true);
  text(460, 527, 10, "IMPORTE", true);
  text(58, 490, 11, `Cebolla ${invoice.product}`);
  text(285, 490, 11, String(invoice.kg));
  text(352, 490, 11, currency(invoice.price));
  text(450, 490, 11, currency(invoice.kg * invoice.price));
  commands.push("0.8 0.85 0.8 RG 48 470 m 547 470 l S");
  text(320, 428, 12, "Total MXN", true);
  text(440, 428, 13, currency(invoice.kg * invoice.price), true);
  text(320, 400, 11, "Recibido al emitir");
  text(440, 400, 11, currency(invoice.paid));
  text(320, 374, 11, "Saldo al emitir");
  text(
    440,
    374,
    11,
    currency(Math.max(0, invoice.kg * invoice.price - invoice.paid)),
  );
  text(48, 285, 10, "Producto: KG × precio por kilogramo. Flete no incluido.");
  text(
    48,
    264,
    10,
    "Documento de demostración generado a partir de la venta registrada.",
  );
  text(48, 80, 9, "Kampo GT | Gracias por su compra.");
  text(495, 80, 9, "1 / 1");
  const stream = commands.join("\n");
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>",
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((obj, i) => {
    offsets.push(pdf.length);
    pdf += `${i + 1} 0 obj\n${obj}\nendobj\n`;
  });
  const xref = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  pdf += offsets
    .slice(1)
    .map((offset) => String(offset).padStart(10, "0") + " 00000 n \n")
    .join("");
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new TextEncoder().encode(pdf);
}
