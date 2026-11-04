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
