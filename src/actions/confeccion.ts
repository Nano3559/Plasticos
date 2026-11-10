"use server"
import { importarParteProduccion } from "@/lib/partes-import"
import { analizarConfeccion } from "@/lib/confeccion"
export async function importarConfeccion(form:FormData) {
  return importarParteProduccion(form,"CONFECCION",analizarConfeccion)
}
