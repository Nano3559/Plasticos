"use server"
import { importarParteProduccion } from "@/lib/partes-import"
import { analizarImpresion } from "@/lib/impresion"

export async function importarImpresion(form:FormData) {
  return importarParteProduccion(form,"IMPRESION",analizarImpresion)
}
