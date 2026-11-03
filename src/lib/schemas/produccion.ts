import { z } from "zod"

export const ordenTrabajoSchema = z.object({
  clienteId: z.string().min(1, "Cliente requerido"),
  producto: z.string().min(1, "Producto requerido"),
  medida: z.string().optional(),
  kgPedidos: z.coerce.number().positive("Kg pedidos debe ser mayor a 0"),
  precioUnitario: z.coerce.number().positive("Precio debe ser mayor a 0"),
  mezclaNota: z.string().optional(),
})

export const registroProduccionSchema = z
  .object({
    ordenId: z.string().min(1, "Orden requerida"),
    area: z.enum(["EXTRUSION", "IMPRESION", "CONFECCION"]),
    turno: z.enum(["MANANA", "TARDE", "NOCHE"]),
    kgEntrada: z.coerce.number().positive("Kg entrada debe ser mayor a 0"),
    kgBuenos: z.coerce.number().min(0, "No puede ser negativo"),
    kgMerma: z.coerce.number().min(0, "No puede ser negativo"),
    kgRechazado: z.coerce.number().min(0, "No puede ser negativo"),
    horasMaquina: z.coerce.number().min(0).optional(),
  })
  .refine(
    (data) => {
      const total = data.kgBuenos + data.kgMerma + data.kgRechazado
      const diff = Math.abs(total - data.kgEntrada)
      return diff < 0.01
    },
    {
      message: "kgBuenos + kgMerma + kgRechazado debe igualar kgEntrada",
      path: ["kgBuenos"],
    }
  )

export const clienteSchema = z.object({
  nombre: z.string().min(1, "Nombre requerido"),
  contacto: z.string().optional(),
  telefono: z.string().optional(),
  direccion: z.string().optional(),
  diasCredito: z.coerce.number().int().min(0).default(15),
})

export type OrdenTrabajoInput = z.infer<typeof ordenTrabajoSchema>
export type RegistroProduccionInput = z.infer<typeof registroProduccionSchema>
export type ClienteInput = z.infer<typeof clienteSchema>
