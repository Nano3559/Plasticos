import { z } from "zod"

export const entregaSchema = z.object({
  ordenId: z.string().min(1, "Orden de trabajo requerida"),
  notaRemision: z.string().optional(),
  fecha: z.string().optional(),
  kgEntregados: z.coerce.number().positive("Kg entregados debe ser mayor a 0"),
  bultos: z.coerce.number().int().min(0).optional(),
})

export const pagoSchema = z.object({
  clienteId: z.string().min(1, "Cliente requerido"),
  ordenId: z.string().optional(),
  monto: z.coerce.number().positive("Monto debe ser mayor a 0"),
  fecha: z.string().optional(),
  medio: z.enum(["QR", "EFECTIVO", "TRANSFERENCIA", "OTRO"]),
  referencia: z.string().optional(),
})

export type EntregaInput = z.infer<typeof entregaSchema>
export type PagoInput = z.infer<typeof pagoSchema>
