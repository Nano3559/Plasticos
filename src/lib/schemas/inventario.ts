import { z } from "zod"

export const entradaSchema = z.object({
  materialId: z.string().min(1, "Material requerido"),
  cantidad: z.coerce.number().positive("Cantidad debe ser mayor a 0"),
  turno: z.enum(["MANANA", "TARDE", "NOCHE"]),
  proveedor: z.string().optional(),
  lote: z.string().optional(),
  costoUnitario: z.coerce.number().positive("Costo debe ser mayor a 0").optional(),
  motivo: z.string().optional(),
})

export const salidaSchema = z.object({
  materialId: z.string().min(1, "Material requerido"),
  cantidad: z.coerce.number().positive("Cantidad debe ser mayor a 0"),
  turno: z.enum(["MANANA", "TARDE", "NOCHE"]),
  motivo: z.string().min(1, "Motivo requerido"),
  ordenId: z.string().optional(),
})

export const ajusteSchema = z.object({
  materialId: z.string().min(1, "Material requerido"),
  cantidad: z.coerce.number().refine((val) => val !== 0, "Cantidad debe ser diferente a 0"),
  turno: z.enum(["MANANA", "TARDE", "NOCHE"]),
  motivo: z.string().min(3, "Motivo obligatorio para ajustes"),
})

export const materialSchema = z.object({
  nombre: z.string().min(2, "El nombre del material debe tener al menos 2 caracteres"),
  categoria: z.enum(["RECICLADO", "VIRGEN", "TINTA", "MASTER_BATCH", "SOLVENTE", "OTRO"]),
  unidad: z.string().default("kg"),
  stockMinimo: z.coerce.number().min(0, "Stock mínimo no puede ser negativo").default(0),
  costoPromedio: z.coerce.number().min(0, "Costo no puede ser negativo").default(0),
})

export type EntradaInput = z.infer<typeof entradaSchema>
export type SalidaInput = z.infer<typeof salidaSchema>
export type AjusteInput = z.infer<typeof ajusteSchema>
export type MaterialInput = z.infer<typeof materialSchema>
