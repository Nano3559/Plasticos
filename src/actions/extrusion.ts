"use server"
import { importarParteProduccion } from "@/lib/partes-import"
import { analizarExtrusion } from "@/lib/extrusion"

export async function importarExtrusion(form:FormData) {
  return importarParteProduccion(form,"EXTRUSION",analizarExtrusion)
}
