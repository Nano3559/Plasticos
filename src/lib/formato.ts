/**
 * Formato único de números y dinero para toda la app.
 * Moneda: boliviano (Bs). Separador de miles ".", decimal ",", como se escribe en Bolivia: Bs 1.234,50
 */

const cacheBs = new Map<number, Intl.NumberFormat>()
const cacheNum = new Map<number, Intl.NumberFormat>()

function fmtBs(decimales: number) {
  let f = cacheBs.get(decimales)
  if (!f) {
    f = new Intl.NumberFormat("es-BO", {
      style: "currency",
      currency: "BOB",
      minimumFractionDigits: decimales,
      maximumFractionDigits: decimales,
    })
    cacheBs.set(decimales, f)
  }
  return f
}

function fmtNum(decimales: number) {
  let f = cacheNum.get(decimales)
  if (!f) {
    f = new Intl.NumberFormat("es-BO", { minimumFractionDigits: decimales, maximumFractionDigits: decimales })
    cacheNum.set(decimales, f)
  }
  return f
}

function aNumero(valor: unknown): number {
  const n = typeof valor === "number" ? valor : Number(valor)
  return Number.isFinite(n) ? n : 0
}

/** Bs 1.234,50 — acepta number, string o Decimal de Prisma. */
export function formatBs(valor: unknown, decimales = 2): string {
  return fmtBs(decimales).format(aNumero(valor))
}

/** 1.234,50 (sin símbolo). */
export function formatNumero(valor: unknown, decimales = 2): string {
  return fmtNum(decimales).format(aNumero(valor))
}

/** 1.234,5 kg */
export function formatKg(valor: unknown, decimales = 2): string {
  return `${fmtNum(decimales).format(aNumero(valor))} kg`
}

/** Redondeo contable a 2 decimales, sin errores de coma flotante típicos (1.005 → 1.01). */
export function redondear(valor: number, decimales = 2): number {
  const f = 10 ** decimales
  return Math.round((valor + Number.EPSILON) * f) / f
}

/**
 * Lee un número escrito a mano: "1.250,50", "1250,50", "1250.50" o "Bs 1 250".
 * Si hay coma, es el decimal y los puntos son separadores de miles (como en Bolivia).
 * Sin coma, un único punto seguido de hasta `decimales` cifras es decimal; si no, son miles.
 * Así "1.250" es mil doscientos cincuenta en kg o Bs (2 decimales), pero "14.375" es un precio
 * por kg con 3 decimales cuando el campo admite 4. Devuelve NaN si no es un número.
 */
export function leerNumero(texto: string, decimales = 2): number {
  let t = texto.replace(/bs/gi, "").replace(/kg/gi, "").replace(/\s/g, "")
  if (!t) return NaN
  if (t.includes(",")) t = t.replace(/\./g, "").replace(",", ".")
  else if (!new RegExp(`^-?\\d*\\.\\d{1,${Math.max(1, decimales)}}$`).test(t)) t = t.replace(/\./g, "")
  return /^-?\d*\.?\d+$/.test(t) ? Number(t) : NaN
}

/** Texto canónico para enviar al servidor ("1250.5"), redondeado a los decimales del campo. "" si no es número. */
export function numeroParaEnviar(texto: string, decimales = 2): string {
  const n = leerNumero(texto, decimales)
  return Number.isFinite(n) ? String(redondear(n, decimales)) : ""
}

/** Precio por kg: 2 decimales como mínimo y hasta 4 si los tiene (Bs 14,375, no Bs 14,38). */
export function formatPrecio(valor: unknown): string {
  const n = aNumero(valor)
  const dec = Math.min(4, Math.max(2, (String(redondear(n, 4)).split(".")[1] ?? "").length))
  return formatBs(n, dec)
}
