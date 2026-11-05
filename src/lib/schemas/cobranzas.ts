import { z } from "zod"
import { numero, nro } from "./numero"

export const entregaSchema = z.object({
  ordenId: z.string().min(1, "Orden de trabajo requerida"),
  notaRemision: z.string().optional(),
  fecha: z.string().optional(),
  kgEntregados: numero(nro("Escribe los kg entregados").positive("Los kg entregados deben ser mayores a 0")),
  bultos: numero(nro().min(0, "No puede ser negativo").optional()),
})

export const pagoSchema = z.object({
  clienteId: z.string().min(1, "Cliente requerido"),
  ordenId: z.string().optional(),
  monto: numero(nro("Escribe el monto").positive("El monto debe ser mayor a 0")),
  fecha: z.string().optional(),
  medio: z.enum(["QR", "EFECTIVO", "TRANSFERENCIA", "OTRO"]),
  referencia: z.string().optional(),
})

export const notaCreditoSchema = z
  .object({
    clienteId: z.string().min(1, "Elige el cliente."),
    tipo: z.enum(["DEVOLUCION", "DESCUENTO"], { errorMap: () => ({ message: "Elige si es devolución o descuento." }) }),
    ordenId: z.string().optional(),
    kg: numero(nro().optional()),
    monto: numero(nro().optional()),
    fecha: z.string().optional(),
    motivo: z.string().trim().min(3, "Escribe el motivo (por ejemplo: «bolsas con falla de sellado»).").max(300),
    notaRemision: z.string().trim().max(40).optional(),
  })
  .superRefine((d, ctx) => {
    if (d.tipo === "DEVOLUCION") {
      if (!d.ordenId) ctx.addIssue({ code: "custom", message: "Elige la orden de trabajo del producto devuelto.", path: ["ordenId"] })
      if (!d.kg || d.kg <= 0) ctx.addIssue({ code: "custom", message: "Escribe cuántos kg devolvió.", path: ["kg"] })
    } else if (!d.monto || d.monto <= 0) {
      ctx.addIssue({ code: "custom", message: "Escribe el monto del descuento.", path: ["monto"] })
    }
  })

export type EntregaInput = z.infer<typeof entregaSchema>
export type PagoInput = z.infer<typeof pagoSchema>
