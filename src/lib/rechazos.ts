/** Rechazos de materia prima por proveedor: cálculos sin acceso a la base, para poder probarlos. */

export const MOTIVOS_RECHAZO = [
  "Húmedo",
  "Sucio o contaminado",
  "Mezclado con otro material",
  "Color o tono incorrecto",
  "No funde bien / grumos",
  "Peso no coincide",
  "Otro",
] as const

/** Clave para agrupar el mismo proveedor escrito distinto: "Braskem / YPFB", "braskem/ypfb ". */
export function claveProveedor(nombre: string): string {
  return nombre
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
}

export type EntradaResumen = { proveedor: string | null; cantidad: unknown }
export type RechazoResumen = { proveedor: string | null; kgRechazado: unknown; motivo: string | null; lote: string | null }

export type FilaProveedor = {
  clave: string
  proveedor: string // el nombre escrito más veces
  kgRecibidos: number
  kgRechazados: number
  porcentaje: number | null // null si no hay kg recibidos en el periodo
  rechazos: number
  motivoPrincipal: string | null
  lotes: string[]
}

const SIN_PROVEEDOR = "Sin proveedor"
const centi = (v: unknown) => Math.round(Number(v) * 100)

/** Une entradas y rechazos por proveedor. Orden: % de rechazo de mayor a menor, luego kg rechazados. */
export function resumirPorProveedor(entradas: EntradaResumen[], rechazos: RechazoResumen[]): FilaProveedor[] {
  type Acum = { nombres: Map<string, number>; rec: number; rech: number; n: number; motivos: Map<string, number>; lotes: Set<string> }
  const mapa = new Map<string, Acum>()
  const tomar = (nombre: string | null) => {
    const visible = nombre?.trim() || SIN_PROVEEDOR
    const clave = claveProveedor(visible) || claveProveedor(SIN_PROVEEDOR)
    let a = mapa.get(clave)
    if (!a) {
      a = { nombres: new Map(), rec: 0, rech: 0, n: 0, motivos: new Map(), lotes: new Set() }
      mapa.set(clave, a)
    }
    a.nombres.set(visible, (a.nombres.get(visible) ?? 0) + 1)
    return [clave, a] as const
  }

  for (const e of entradas) tomar(e.proveedor)[1].rec += centi(e.cantidad)
  for (const r of rechazos) {
    const a = tomar(r.proveedor)[1]
    a.rech += centi(r.kgRechazado)
    a.n += 1
    if (r.motivo) a.motivos.set(r.motivo, (a.motivos.get(r.motivo) ?? 0) + 1)
    if (r.lote?.trim()) a.lotes.add(r.lote.trim())
  }

  const masFrecuente = (m: Map<string, number>) =>
    [...m.entries()].sort((x, y) => y[1] - x[1] || x[0].localeCompare(y[0], "es"))[0]?.[0] ?? null

  return [...mapa.entries()]
    .filter(([, a]) => a.n > 0 || a.rec > 0)
    .map(([clave, a]) => ({
      clave,
      proveedor: masFrecuente(a.nombres)!,
      kgRecibidos: a.rec / 100,
      kgRechazados: a.rech / 100,
      porcentaje: a.rec > 0 ? (a.rech / a.rec) * 100 : null,
      rechazos: a.n,
      motivoPrincipal: masFrecuente(a.motivos),
      lotes: [...a.lotes].sort(),
    }))
    .sort(
      (x, y) =>
        (y.porcentaje ?? (y.kgRechazados > 0 ? Infinity : -1)) - (x.porcentaje ?? (x.kgRechazados > 0 ? Infinity : -1)) ||
        y.kgRechazados - x.kgRechazados ||
        x.proveedor.localeCompare(y.proveedor, "es")
    )
}

/** Periodos del selector, en meses. */
export const PERIODOS_RECHAZO = [3, 6, 12] as const
export function leerPeriodoRechazo(v: string | undefined): (typeof PERIODOS_RECHAZO)[number] {
  const n = Number(v)
  return (PERIODOS_RECHAZO as readonly number[]).includes(n) ? (n as (typeof PERIODOS_RECHAZO)[number]) : 6
}

/** Fecha de hace `dias` días, para filtrar consultas. */
export function haceDias(dias: number): Date {
  return new Date(Date.now() - dias * 86_400_000)
}
