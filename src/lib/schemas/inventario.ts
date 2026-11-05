import { z } from "zod"
import { numero, nro } from "./numero"

export const entradaSchema = z.object({
  materialId: z.string().min(1, "Material requerido"),
  cantidad: numero(nro("Escribe la cantidad").positive("La cantidad debe ser mayor a 0")),
  turno: z.enum(["MANANA", "TARDE", "NOCHE"]),
  proveedor: z.string().optional(),
  lote: z.string().optional(),
  costoUnitario: numero(nro().positive("El costo debe ser mayor a 0").optional(), 4),
  motivo: z.string().optional(),
})

export const salidaSchema = z.object({
  materialId: z.string().min(1, "Material requerido"),
  cantidad: numero(nro("Escribe la cantidad").positive("La cantidad debe ser mayor a 0")),
  turno: z.enum(["MANANA", "TARDE", "NOCHE"]),
  motivo: z.string().min(1, "Motivo requerido"),
  ordenId: z.string().optional(),
})

export const ajusteSchema = z.object({
  materialId: z.string().min(1, "Material requerido"),
  cantidad: numero(nro("Escribe la cantidad a sumar o restar").refine((val) => val !== 0, "La cantidad no puede ser 0")),
  turno: z.enum(["MANANA", "TARDE", "NOCHE"]),
  motivo: z.string().min(3, "Motivo obligatorio para ajustes"),
})

export const materialSchema = z.object({
  nombre: z.string().min(2, "El nombre del material debe tener al menos 2 caracteres"),
  categoria: z.enum(["RECICLADO", "VIRGEN", "TINTA", "MASTER_BATCH", "SOLVENTE", "OTRO"]),
  unidad: z.string().default("kg"),
  stockMinimo: numero(nro().min(0, "El stock mínimo no puede ser negativo").default(0)),
  costoPromedio: numero(nro().min(0, "El costo no puede ser negativo").default(0), 4),
})

export type EntradaInput = z.infer<typeof entradaSchema>
export type SalidaInput = z.infer<typeof salidaSchema>
export type AjusteInput = z.infer<typeof ajusteSchema>
export type MaterialInput = z.infer<typeof materialSchema>
