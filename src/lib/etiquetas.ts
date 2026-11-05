/** Nombres legibles de los valores internos, iguales en todas las pantallas. */

export const AREA_NOMBRE: Record<string, string> = { EXTRUSION: "Extrusión", IMPRESION: "Impresión", CONFECCION: "Confección" }

export const TURNO_ETIQUETA: Record<string, string> = { MANANA: "Mañana", TARDE: "Tarde", NOCHE: "Noche" }

export const CATEGORIA_MATERIAL: Record<string, string> = {
  RECICLADO: "Reciclado",
  VIRGEN: "Virgen",
  TINTA: "Tinta",
  MASTER_BATCH: "Masterbatch",
  SOLVENTE: "Solvente",
  OTRO: "Otro",
}

export const TIPO_MOVIMIENTO: Record<string, string> = { ENTRADA: "Entrada", SALIDA: "Salida", AJUSTE: "Ajuste" }

export const MEDIO_PAGO: Record<string, string> = { QR: "QR", EFECTIVO: "Efectivo", TRANSFERENCIA: "Transferencia", OTRO: "Otro" }

export const etiqueta = (mapa: Record<string, string>, valor: string | null | undefined) => (valor ? (mapa[valor] ?? valor) : "")
