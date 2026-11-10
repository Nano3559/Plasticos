import { analizarParteProduccion } from "@/lib/extrusion"

export function analizarImpresion(bytes:Uint8Array,hoja?:string) {
  return analizarParteProduccion(bytes,hoja,"IMPRESION")
}
