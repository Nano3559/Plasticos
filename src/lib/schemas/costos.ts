import { z } from "zod"
import { numero, nro } from "./numero"

export const costoTurnoSchema = z.object({
  fecha: z.string().min(1, "Fecha requerida"),
  turno: z.enum(["MANANA", "TARDE", "NOCHE"]),
  manoObra: numero(nro("Escribe el costo de mano de obra").min(0, "No puede ser negativo")),
  energia: numero(nro("Escribe el costo de energía").min(0, "No puede ser negativo")),
})

export type CostoTurnoInput = z.infer<typeof costoTurnoSchema>
