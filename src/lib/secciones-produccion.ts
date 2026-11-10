export type AreaParte = "EXTRUSION" | "IMPRESION" | "CONFECCION"
export const SECCIONES_PARTE = {
  EXTRUSION: { nombre:"Extrusión",slug:"extrusion",hoja:"OT 1" },
  IMPRESION: { nombre:"Impresión",slug:"impresion",hoja:"OT-IMP" },
  CONFECCION: { nombre:"Confección",slug:"confeccion",hoja:"OT-CONF" },
} as const
