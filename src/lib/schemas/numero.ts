import { z } from "zod"
import { leerNumero } from "@/lib/formato"

/**
 * Número de un formulario, con la misma regla en toda la app: acepta "1.250,50", "1250.50" o "Bs 120"
 * (ver leerNumero). `decimales` es lo que admite el campo: 2 para kg y Bs, 4 para precios y costos por kg.
 * Un campo vacío cuenta como "no enviado", así funcionan .optional() y .default().
 */
export function numero<T extends z.ZodTypeAny>(esquema: T, decimales = 2) {
  return z.preprocess((v) => {
    if (typeof v !== "string") return v
    if (v.trim() === "") return undefined
    return leerNumero(v, decimales)
  }, esquema)
}

/** z.number() con mensajes en español. */
export function nro(obligatorio = "Este campo es obligatorio") {
  return z.number({ required_error: obligatorio, invalid_type_error: "Escribe solo números, por ejemplo 1.250,50" })
}
