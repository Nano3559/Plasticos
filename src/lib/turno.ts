export type Turno = "MANANA" | "TARDE" | "NOCHE"

/** Hora (0-23) en Bolivia, sin importar la zona horaria del servidor o del aparato. */
export function horaLaPaz(fecha: Date = new Date()): number {
  return Number(new Intl.DateTimeFormat("en-US", { timeZone: "America/La_Paz", hour: "numeric", hourCycle: "h23" }).format(fecha))
}

/** Mañana 06:00–14:00 · Tarde 14:00–22:00 · Noche 22:00–06:00 */
export function turnoDeHora(hora: number): Turno {
  if (hora >= 6 && hora < 14) return "MANANA"
  if (hora >= 14 && hora < 22) return "TARDE"
  return "NOCHE"
}

export function turnoActual(): Turno {
  return turnoDeHora(horaLaPaz())
}

export const TURNO_NOMBRE: Record<Turno, string> = { MANANA: "mañana", TARDE: "tarde", NOCHE: "noche" }
