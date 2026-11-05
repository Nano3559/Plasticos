import { z } from "zod"
import { numero, nro } from "./numero"

const textoOpcional = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Máximo ${max} caracteres`)
    .optional()
    .transform((v) => (v ? v : undefined))

export const ordenTrabajoSchema = z.object({
  clienteId: z.string().min(1, "Cliente requerido"),
  producto: z.string().min(1, "Producto requerido"),
  medida: z.string().optional(),
  kgPedidos: numero(nro("Escribe los kg pedidos").positive("Los kg pedidos deben ser mayores a 0")),
  precioUnitario: numero(nro("Escribe el precio por kg").positive("El precio debe ser mayor a 0"), 4),
  mezclaNota: z.string().optional(),
})

export const registroProduccionSchema = z
  .object({
    ordenId: z.string().min(1, "Orden requerida"),
    area: z.enum(["EXTRUSION", "IMPRESION", "CONFECCION"]),
    turno: z.enum(["MANANA", "TARDE", "NOCHE"]),
    kgEntrada: numero(nro("Escribe los kg de entrada").positive("Los kg de entrada deben ser mayores a 0")),
    kgBuenos: numero(nro("Escribe los kg buenos").min(0, "No puede ser negativo")),
    kgMerma: numero(nro().min(0, "No puede ser negativo").default(0)),
    kgRechazado: numero(nro().min(0, "No puede ser negativo").default(0)),
    horasMaquina: numero(nro().min(0, "No puede ser negativo").optional(), 1),
    // Rechazo en extrusión: de qué lote vino (rechazoEntradaId) o, si no está registrado, proveedor y lote a mano
    rechazoEntradaId: textoOpcional(40),
    rechazoProveedor: textoOpcional(80),
    rechazoLote: textoOpcional(40),
    rechazoMotivo: textoOpcional(60),
    rechazoNota: textoOpcional(300),
  })
  .superRefine((d, ctx) => {
    if (d.area !== "EXTRUSION" || d.kgRechazado <= 0) return
    if (!d.rechazoEntradaId && !d.rechazoProveedor) {
      ctx.addIssue({ code: "custom", path: ["rechazoProveedor"], message: "Indica de qué lote o proveedor vino el material rechazado" })
    }
    if (!d.rechazoMotivo) {
      ctx.addIssue({ code: "custom", path: ["rechazoMotivo"], message: "Indica por qué se rechazó el material" })
    }
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
  diasCredito: numero(nro().int("Escribe días enteros").min(0, "No puede ser negativo").default(15), 0),
})

export type OrdenTrabajoInput = z.infer<typeof ordenTrabajoSchema>
export type RegistroProduccionInput = z.infer<typeof registroProduccionSchema>
export type ClienteInput = z.infer<typeof clienteSchema>
