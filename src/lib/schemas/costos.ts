import { z } from "zod"

export const costoTurnoSchema = z.object({
  fecha: z.string().min(1, "Fecha requerida"),
  turno: z.enum(["MANANA", "TARDE", "NOCHE"]),
  manoObra: z.coerce.number().min(0, "No puede ser negativo"),
  energia: z.coerce.number().min(0, "No puede ser negativo"),
})

export type CostoTurnoInput = z.infer<typeof costoTurnoSchema>
