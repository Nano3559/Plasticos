import { z } from "zod"
import { numero, nro } from "./numero"

/** Categorías sugeridas en el formulario. Se puede escribir otra si ninguna sirve. */
export const CATEGORIAS_GASTO = [
  "Mantenimiento",
  "Repuestos",
  "Transporte y fletes",
  "Combustible",
  "Alquiler",
  "Servicios básicos",
  "Sueldos administrativos",
  "Impuestos y trámites",
  "Material de oficina",
  "Otros",
] as const

const textoOpcional = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Máximo ${max} caracteres`)
    .optional()
    .transform((v) => (v ? v : undefined))

export const gastoSchema = z.object({
  fecha: z.string({ required_error: "Fecha requerida" }).regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha requerida"),
  categoria: z.string({ required_error: "Elige o escribe una categoría" }).trim().min(1, "Elige o escribe una categoría").max(60, "Máximo 60 caracteres"),
  descripcion: textoOpcional(300),
  comprobante: textoOpcional(40),
  monto: numero(
    nro("Escribe el monto")
      .refine((n) => n > 0, "El monto debe ser mayor a 0")
      .refine((n) => n <= 10_000_000, "Monto demasiado grande")
  ),
})

export type GastoInput = z.infer<typeof gastoSchema>
