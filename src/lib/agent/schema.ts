import { z } from "zod";
export const orderSchema = z.object({
  cliente: z.string().min(1),
  producto: z.enum(["Blanca", "Morada"]),
  tamano: z.enum(["GDE", "MED", "PP", "CH"]),
  bultos: z.number().int().positive(),
  kg: z.number().positive(),
  precio_kg: z.number().positive(),
  destino: z.string().min(1),
  fecha_carga: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  flete: z.number().nonnegative(),
});
export type DetectedOrder = z.infer<typeof orderSchema>;
