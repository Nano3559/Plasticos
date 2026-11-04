/**
 * Lectura tolerante de celdas de Excel: los kardex reales traen números como
 * texto ("Bs 1.250,50"), fechas escritas a mano ("15/03/2026") y celdas con errores.
 * Cuando un valor no se entiende devolvemos null para poder avisarlo, en lugar de
 * convertirlo en silencio en 0 o en "hoy".
 */

/** Convierte una celda a número. null si está vacía o no es un número. */
export function parseNumero(valor: unknown): number | null {
  if (valor === null || valor === undefined || valor === "") return null
  if (typeof valor === "number") return Number.isFinite(valor) ? valor : null
  if (typeof valor === "boolean") return null
  if (valor instanceof Date) return null

  let s = String(valor).trim()
  if (!s) return null

  let negativo = false
  if (/^\(.*\)$/.test(s)) {
    negativo = true
    s = s.slice(1, -1)
  }
  // Quitar moneda, kg, espacios (incluye el espacio duro) y cualquier letra
  s = s.replace(/bs\.?|bob|\$|kg|kgs/gi, "").replace(/[\s\u00a0]/g, "")
  if (s.startsWith("-")) {
    negativo = !negativo
    s = s.slice(1)
  }
  if (s.startsWith("+")) s = s.slice(1)
  if (!/^[\d.,]+$/.test(s) || !/\d/.test(s)) return null

  const puntos = (s.match(/\./g) || []).length
  const comas = (s.match(/,/g) || []).length

  if (puntos > 0 && comas > 0) {
    // Gana como decimal el separador que aparece al final
    const decimal = s.lastIndexOf(",") > s.lastIndexOf(".") ? "," : "."
    const miles = decimal === "," ? "." : ","
    s = s.split(miles).join("").replace(decimal, ".")
  } else if (comas > 1 || puntos > 1) {
    // Varias repeticiones del mismo símbolo → son miles: 1.234.567 / 1,234,567
    s = s.replace(/[.,]/g, "")
  } else if (comas === 1) {
    s = s.replace(",", ".") // en Bolivia la coma es el decimal
  }
  // un solo punto: se deja como decimal

  const n = Number(s)
  if (!Number.isFinite(n)) return null
  return negativo ? -n : n
}

/** Una fecha de calendario guardada a las 12:00 UTC para no saltar de día en ninguna zona horaria. */
function fechaCalendario(anio: number, mes: number, dia: number): Date | null {
  if (mes < 1 || mes > 12 || dia < 1 || dia > 31) return null
  const d = new Date(Date.UTC(anio, mes - 1, dia, 12, 0, 0))
  // Rechaza 31/02, 30/04, etc.
  if (d.getUTCFullYear() !== anio || d.getUTCMonth() !== mes - 1 || d.getUTCDate() !== dia) return null
  return d
}

/**
 * Convierte una celda a fecha. Acepta serial de Excel, Date, dd/mm/aaaa, dd-mm-aa, dd.mm.aaaa y aaaa-mm-dd.
 * @param date1904 true si el libro usa el calendario de 1904 (Excel para Mac antiguo)
 */
export function parseFecha(valor: unknown, date1904 = false): Date | null {
  if (valor === null || valor === undefined || valor === "") return null

  if (valor instanceof Date) {
    if (isNaN(valor.getTime())) return null
    return fechaCalendario(valor.getFullYear(), valor.getMonth() + 1, valor.getDate())
  }

  if (typeof valor === "number") {
    if (!Number.isFinite(valor) || valor < 1 || valor > 80000) return null
    const serial = date1904 ? valor + 1462 : valor
    const ms = Math.round((serial - 25569) * 86400 * 1000)
    const u = new Date(ms)
    return fechaCalendario(u.getUTCFullYear(), u.getUTCMonth() + 1, u.getUTCDate())
  }

  const s = String(valor).trim()
  if (!s) return null

  let m = s.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2}|\d{4})(?:\D.*)?$/)
  if (m) {
    let anio = Number(m[3])
    if (m[3].length === 2) anio += 2000
    return fechaCalendario(anio, Number(m[2]), Number(m[1]))
  }
  m = s.match(/^(\d{4})[/\-.](\d{1,2})[/\-.](\d{1,2})(?:\D.*)?$/)
  if (m) return fechaCalendario(Number(m[1]), Number(m[2]), Number(m[3]))

  // Un número escrito como texto ("45321") es un serial de Excel
  if (/^\d{5}$/.test(s)) return parseFecha(Number(s), date1904)
  return null
}

/** Texto en mayúsculas, sin tildes ni espacios repetidos: para comparar etiquetas y nombres. */
export function normalizar(valor: unknown): string {
  return String(valor ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\s\u00a0]+/g, " ")
    .trim()
    .toUpperCase()
}

export function textoCelda(valor: unknown): string {
  if (valor === null || valor === undefined) return ""
  return String(valor).replace(/[\s\u00a0]+/g, " ").trim()
}
