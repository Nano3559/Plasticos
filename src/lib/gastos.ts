/** Cálculos de gastos generales: sin acceso a la base, para poder probarlos. */

export type GastoResumible = { fecha: Date; categoria: string; monto: unknown }

/** "2026-11" a partir de una fecha guardada como día calendario (medianoche UTC). */
export function claveMes(fecha: Date): string {
  return fecha.toISOString().slice(0, 7)
}

/** Lee ?mes=YYYY-MM; si falta o no es válido, devuelve el mes por defecto. */
export function leerMes(valor: string | undefined, porDefecto: string): string {
  if (!valor || !/^\d{4}-(0[1-9]|1[0-2])$/.test(valor)) return porDefecto
  return valor
}

/** Primer día del mes y primer día del mes siguiente (rango [desde, hasta)). */
export function rangoMes(mes: string): { desde: Date; hasta: Date } {
  const [a, m] = mes.split("-").map(Number)
  return { desde: new Date(Date.UTC(a, m - 1, 1)), hasta: new Date(Date.UTC(a, m, 1)) }
}

/** Mes anterior o siguiente: desplazarMes("2026-01", -1) → "2025-12". */
export function desplazarMes(mes: string, delta: number): string {
  const [a, m] = mes.split("-").map(Number)
  const d = new Date(Date.UTC(a, m - 1 + delta, 1))
  return claveMes(d)
}

/** "noviembre de 2026" */
export function nombreMes(mes: string): string {
  const { desde } = rangoMes(mes)
  return desde.toLocaleDateString("es-BO", { month: "long", year: "numeric", timeZone: "UTC" })
}

const centavos = (v: unknown) => Math.round(Number(v) * 100)

/** Total por categoría, de mayor a menor, con su porcentaje del total. */
export function totalesPorCategoria(gastos: GastoResumible[]) {
  const mapa = new Map<string, number>()
  for (const g of gastos) mapa.set(g.categoria, (mapa.get(g.categoria) ?? 0) + centavos(g.monto))
  const total = [...mapa.values()].reduce((s, v) => s + v, 0)
  return [...mapa.entries()]
    .map(([categoria, c]) => ({ categoria, total: c / 100, porcentaje: total > 0 ? (c / total) * 100 : 0 }))
    .sort((a, b) => b.total - a.total || a.categoria.localeCompare(b.categoria, "es"))
}

/** Total de cada uno de los últimos `cantidad` meses hasta `hastaMes` inclusive, del más antiguo al más reciente. */
export function totalesPorMes(gastos: GastoResumible[], hastaMes: string, cantidad: number) {
  const meses = Array.from({ length: cantidad }, (_, i) => desplazarMes(hastaMes, i - cantidad + 1))
  const mapa = new Map(meses.map((m) => [m, 0]))
  for (const g of gastos) {
    const k = claveMes(g.fecha)
    if (mapa.has(k)) mapa.set(k, mapa.get(k)! + centavos(g.monto))
  }
  return meses.map((mes) => ({ mes, total: mapa.get(mes)! / 100 }))
}

export function sumarGastos(gastos: { monto: unknown }[]): number {
  return gastos.reduce((s, g) => s + centavos(g.monto), 0) / 100
}
