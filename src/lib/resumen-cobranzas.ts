import { calcularCartera, type CarteraCliente, type RangoAntiguedad } from "@/lib/cartera-calculo"
import { redondear } from "@/lib/formato"

/**
 * Resumen de cobranzas para el panel: de un cliente o de todos.
 * Es una función pura (sin base de datos) para poder probarla con datos de ejemplo.
 */

type Num = unknown

export const PERIODOS = [
  { meses: 6, texto: "6 meses" },
  { meses: 12, texto: "12 meses" },
  { meses: 24, texto: "2 años" },
  { meses: 0, texto: "Todo" },
] as const

/** Periodo pedido en la URL (?meses=6). Por defecto, 12 meses. */
export function leerPeriodo(valor: string | undefined): number {
  const n = Number(valor)
  return valor !== undefined && valor !== "" && PERIODOS.some((p) => p.meses === n) ? n : 12
}

export type ClienteResumenDatos = {
  id: string
  nombre: string
  telefono: string | null
  diasCredito: number
  ordenes: {
    numero: number
    producto: string
    precioUnitario: Num
    entregas: { fecha: Date; kgEntregados: Num; notaRemision: string | null }[]
  }[]
  pagos: { fecha: Date; monto: Num; medio: string; referencia: string | null }[]
  notasCredito?: { fecha: Date; monto: Num; tipo: string; motivo: string; kg: Num | null }[]
}

export type PuntoMes = {
  /** "2026-03" */
  mes: string
  /** "mar 26" */
  etiqueta: string
  entregado: number
  cobrado: number
  /** Devoluciones y descuentos del mes */
  creditos: number
  kg: number
  /** Saldo acumulado al cierre del mes (negativo = a favor del cliente) */
  saldo: number
}

export type Movimiento = {
  fecha: Date
  tipo: "ENTREGA" | "PAGO" | "NOTA"
  detalle: string
  cargo: number
  abono: number
  saldo: number
}

export type FilaCliente = CarteraCliente & {
  kg: number
  ultimoPago: { fecha: Date; monto: number } | null
  ultimaEntrega: Date | null
  /** % de lo vendido (entregado menos devoluciones y descuentos) que ya está pagado */
  porcentajeCobrado: number
  diasPromedioPago: number | null
  enMora: boolean
}

export type Resumen = {
  alcance: "todos" | "cliente"
  meses: number
  desde: Date
  // Totales de todo el historial
  entregadoHistorico: number
  cobradoHistorico: number
  porCobrar: number
  aFavor: number
  enMora: number
  kgHistorico: number
  // Totales dentro del periodo elegido
  entregadoPeriodo: number
  cobradoPeriodo: number
  kgPeriodo: number
  /** Devoluciones y descuentos */
  creditosPeriodo: number
  creditosHistorico: number
  kgDevueltosPeriodo: number
  /** Promedio mensual cobrado en los últimos 3 meses */
  ritmoCobroMensual: number
  /** Meses que tomaría cubrir lo pendiente al ritmo de cobro actual (null si no hay ritmo) */
  mesesParaCobrar: number | null
  /** Días que tarda, en promedio, cada boliviano entregado en ser pagado */
  diasPromedioPago: number | null
  antiguedad: Record<RangoAntiguedad, number>
  serie: PuntoMes[]
  porMedio: { medio: string; monto: number }[]
  porProducto: { producto: string; kg: number; monto: number }[]
  clientes: FilaCliente[]
  movimientos: Movimiento[]
  ultimoPago: { fecha: Date; monto: number; cliente: string } | null
  clientesConDeuda: number
  clientesEnMora: number
}

const MS_DIA = 86_400_000
const MESES_CORTOS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"]
const claveMes = (d: Date) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`
const etiquetaMes = (clave: string) => {
  const [a, m] = clave.split("-").map(Number)
  return `${MESES_CORTOS[m - 1]} ${String(a).slice(2)}`
}

/** Días promedio de pago, aplicando los pagos a las entregas más antiguas (igual que la cartera). */
function diasDePago(
  entregas: { fecha: Date; monto: number }[],
  pagos: { fecha: Date; monto: number }[],
  creditos: { monto: number }[] = []
): number | null {
  const abiertas = entregas.map((e) => ({ ...e })).sort((a, b) => a.fecha.getTime() - b.fecha.getTime())
  let suma = 0
  let peso = 0
  let i = 0
  // Lo devuelto o descontado no se paga: se quita primero de las entregas más antiguas
  let credito = creditos.reduce((s, c) => s + c.monto, 0)
  while (credito > 0.005 && i < abiertas.length) {
    const quita = Math.min(credito, abiertas[i].monto)
    abiertas[i].monto -= quita
    credito -= quita
    if (abiertas[i].monto <= 0.005) i++
  }
  for (const p of [...pagos].sort((a, b) => a.fecha.getTime() - b.fecha.getTime())) {
    let resto = p.monto
    while (resto > 0.005 && i < abiertas.length) {
      const e = abiertas[i]
      const aplicado = Math.min(resto, e.monto)
      const dias = Math.max(0, (p.fecha.getTime() - e.fecha.getTime()) / MS_DIA)
      suma += aplicado * dias
      peso += aplicado
      e.monto -= aplicado
      resto -= aplicado
      if (e.monto <= 0.005) i++
    }
  }
  return peso > 0 ? Math.round(suma / peso) : null
}

export function armarResumen(
  clientes: ClienteResumenDatos[],
  opciones: { meses: number; alcance: "todos" | "cliente"; hoy?: Date }
): Resumen {
  const hoy = opciones.hoy ?? new Date()
  const meses = opciones.meses
  // Primer día del mes de inicio del periodo (meses = 0 → todo el historial)
  let desde = new Date(Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth() - (meses - 1), 1))

  const entregasTodas: { fecha: Date; monto: number; kg: number; producto: string; detalle: string; cliente: string }[] = []
  const pagosTodos: { fecha: Date; monto: number; medio: string; detalle: string; cliente: string }[] = []
  const notasTodas: { fecha: Date; monto: number; kg: number; detalle: string; cliente: string }[] = []
  const filas: FilaCliente[] = []

  for (const c of clientes) {
    const entregas = c.ordenes.flatMap((o) =>
      o.entregas.map((e) => {
        const kg = Number(e.kgEntregados)
        return {
          fecha: new Date(e.fecha),
          kg,
          monto: kg * Number(o.precioUnitario),
          producto: o.producto,
          detalle: `${o.producto}${e.notaRemision ? ` · N.R. ${e.notaRemision}` : ""}`,
          cliente: c.nombre,
        }
      })
    )
    const pagos = c.pagos.map((p) => ({
      fecha: new Date(p.fecha),
      monto: Number(p.monto),
      medio: p.medio,
      detalle: p.referencia || "Pago",
      cliente: c.nombre,
    }))
    const notas = (c.notasCredito ?? []).map((n) => ({
      fecha: new Date(n.fecha),
      monto: Number(n.monto),
      kg: n.kg === null || n.kg === undefined ? 0 : Number(n.kg),
      detalle: `${n.tipo === "DEVOLUCION" ? "Devolución" : "Descuento"}: ${n.motivo}`,
      cliente: c.nombre,
    }))
    entregasTodas.push(...entregas)
    pagosTodos.push(...pagos)
    notasTodas.push(...notas)

    const cartera = calcularCartera(
      {
        id: c.id,
        nombre: c.nombre,
        telefono: c.telefono,
        diasCredito: c.diasCredito,
        ordenes: c.ordenes.map((o) => ({ numero: o.numero, precioUnitario: o.precioUnitario, entregas: o.entregas })),
        pagos: c.pagos,
        notasCredito: c.notasCredito,
      },
      hoy
    )
    const ultimo = pagos.reduce<(typeof pagos)[number] | null>((u, p) => (!u || p.fecha > u.fecha ? p : u), null)
    filas.push({
      ...cartera,
      kg: redondear(entregas.reduce((s, e) => s + e.kg, 0)),
      ultimoPago: ultimo ? { fecha: ultimo.fecha, monto: redondear(ultimo.monto) } : null,
      ultimaEntrega: entregas.reduce<Date | null>((u, e) => (!u || e.fecha > u ? e.fecha : u), null),
      // Sobre lo vendido de verdad: lo entregado menos devoluciones y descuentos
      porcentajeCobrado:
        cartera.totalEntregado - cartera.totalCreditos > 0.5
          ? Math.min(100, Math.round((cartera.totalPagado / (cartera.totalEntregado - cartera.totalCreditos)) * 100))
          : 100,
      diasPromedioPago: diasDePago(entregas, pagos, notas),
      enMora: cartera.saldo > 0.5 && cartera.diasMasAntiguo > cartera.cliente.diasCredito,
    })
  }

  if (meses === 0) {
    const primera = [...entregasTodas, ...pagosTodos].reduce<Date | null>((p, m) => (!p || m.fecha < p ? m.fecha : p), null)
    desde = primera ? new Date(Date.UTC(primera.getUTCFullYear(), primera.getUTCMonth(), 1)) : desde
  }

  // ── Serie mensual con saldo acumulado ──
  const claves: string[] = []
  for (let d = new Date(desde); d <= hoy; d = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1))) claves.push(claveMes(d))
  const porMes = new Map(claves.map((k) => [k, { entregado: 0, cobrado: 0, creditos: 0, kg: 0 }]))
  let saldoInicial = 0
  for (const e of entregasTodas) {
    if (e.fecha < desde) saldoInicial += e.monto
    const m = porMes.get(claveMes(e.fecha))
    if (m) {
      m.entregado += e.monto
      m.kg += e.kg
    }
  }
  for (const p of pagosTodos) {
    if (p.fecha < desde) saldoInicial -= p.monto
    const m = porMes.get(claveMes(p.fecha))
    if (m) m.cobrado += p.monto
  }
  for (const n of notasTodas) {
    if (n.fecha < desde) saldoInicial -= n.monto
    const m = porMes.get(claveMes(n.fecha))
    if (m) m.creditos += n.monto
  }
  let acumulado = saldoInicial
  const serie: PuntoMes[] = claves.map((k) => {
    const m = porMes.get(k)!
    acumulado += m.entregado - m.cobrado - m.creditos
    return {
      mes: k,
      etiqueta: etiquetaMes(k),
      entregado: redondear(m.entregado),
      cobrado: redondear(m.cobrado),
      creditos: redondear(m.creditos),
      kg: redondear(m.kg, 1),
      saldo: redondear(acumulado),
    }
  })

  // ── Totales ──
  const suma = <T,>(xs: T[], f: (x: T) => number) => xs.reduce((s, x) => s + f(x), 0)
  const enPeriodo = <T extends { fecha: Date }>(xs: T[]) => xs.filter((x) => x.fecha >= desde)
  const porCobrar = redondear(suma(filas, (f) => f.saldo))
  const ultimos3 = serie.slice(-3)
  const ritmoCobroMensual = ultimos3.length > 0 ? redondear(suma(ultimos3, (p) => p.cobrado) / ultimos3.length) : 0

  const antiguedad: Record<RangoAntiguedad, number> = { "0-15": 0, "16-30": 0, "31-60": 0, "60+": 0 }
  for (const f of filas) for (const r of Object.keys(antiguedad) as RangoAntiguedad[]) antiguedad[r] = redondear(antiguedad[r] + f.saldoPorRango[r])

  const medios = new Map<string, number>()
  for (const p of enPeriodo(pagosTodos)) medios.set(p.medio, (medios.get(p.medio) ?? 0) + p.monto)
  // "Bobinas para Agua" y "Bobinas Para Agua." son el mismo producto: se agrupa sin mayúsculas, tildes ni puntos
  const productos = new Map<string, { nombre: string; kg: number; monto: number }>()
  for (const e of enPeriodo(entregasTodas)) {
    const nombre = e.producto.trim().replace(/\s+/g, " ")
    const clave = nombre.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[.\s]+$/, "").toUpperCase()
    const x = productos.get(clave) ?? { nombre, kg: 0, monto: 0 }
    x.kg += e.kg
    x.monto += e.monto
    productos.set(clave, x)
  }

  // ── Movimientos con saldo corrido (solo para un cliente) ──
  let movimientos: Movimiento[] = []
  if (opciones.alcance === "cliente") {
    const todos = [
      ...entregasTodas.map((e) => ({ fecha: e.fecha, tipo: "ENTREGA" as const, detalle: `${e.detalle} · ${e.kg.toLocaleString("es-BO")} kg`, cargo: e.monto, abono: 0 })),
      ...pagosTodos.map((p) => ({ fecha: p.fecha, tipo: "PAGO" as const, detalle: p.detalle, cargo: 0, abono: p.monto })),
      ...notasTodas.map((n) => ({
        fecha: n.fecha,
        tipo: "NOTA" as const,
        detalle: n.kg > 0 ? `${n.detalle} · ${n.kg.toLocaleString("es-BO")} kg` : n.detalle,
        cargo: 0,
        abono: n.monto,
      })),
    ].sort((a, b) => a.fecha.getTime() - b.fecha.getTime() || (a.tipo === "ENTREGA" ? -1 : 1))
    let s = 0
    movimientos = todos.map((m) => {
      s += m.cargo - m.abono
      return { ...m, cargo: redondear(m.cargo), abono: redondear(m.abono), saldo: redondear(s) }
    })
  }

  const ultimoPago = pagosTodos.reduce<(typeof pagosTodos)[number] | null>((u, p) => (!u || p.fecha > u.fecha ? p : u), null)
  const diasGlobal = (() => {
    // Promedio ponderado por lo cobrado de cada cliente
    const conDato = filas.filter((f) => f.diasPromedioPago !== null && f.totalPagado > 0)
    const peso = suma(conDato, (f) => Math.min(f.totalPagado, f.totalEntregado))
    return peso > 0 ? Math.round(suma(conDato, (f) => f.diasPromedioPago! * Math.min(f.totalPagado, f.totalEntregado)) / peso) : null
  })()

  return {
    alcance: opciones.alcance,
    meses,
    desde,
    entregadoHistorico: redondear(suma(filas, (f) => f.totalEntregado)),
    cobradoHistorico: redondear(suma(filas, (f) => f.totalPagado)),
    porCobrar,
    aFavor: redondear(suma(filas, (f) => f.aFavor)),
    enMora: redondear(suma(filas.filter((f) => f.enMora), (f) => f.saldo)),
    kgHistorico: redondear(suma(filas, (f) => f.kg), 1),
    entregadoPeriodo: redondear(suma(enPeriodo(entregasTodas), (e) => e.monto)),
    cobradoPeriodo: redondear(suma(enPeriodo(pagosTodos), (p) => p.monto)),
    kgPeriodo: redondear(suma(enPeriodo(entregasTodas), (e) => e.kg), 1),
    creditosPeriodo: redondear(suma(enPeriodo(notasTodas), (n) => n.monto)),
    creditosHistorico: redondear(suma(notasTodas, (n) => n.monto)),
    kgDevueltosPeriodo: redondear(suma(enPeriodo(notasTodas), (n) => n.kg), 1),
    ritmoCobroMensual,
    mesesParaCobrar: porCobrar > 0.5 && ritmoCobroMensual > 0 ? Math.round((porCobrar / ritmoCobroMensual) * 10) / 10 : null,
    diasPromedioPago: diasGlobal,
    antiguedad,
    serie,
    porMedio: [...medios.entries()].map(([medio, monto]) => ({ medio, monto: redondear(monto) })).sort((a, b) => b.monto - a.monto),
    porProducto: [...productos.values()]
      .map((x) => ({ producto: x.nombre, kg: redondear(x.kg, 1), monto: redondear(x.monto) }))
      .sort((a, b) => b.kg - a.kg),
    clientes: filas.sort((a, b) => b.saldo - a.saldo || b.totalEntregado - a.totalEntregado),
    movimientos,
    ultimoPago: ultimoPago ? { fecha: ultimoPago.fecha, monto: redondear(ultimoPago.monto), cliente: ultimoPago.cliente } : null,
    clientesConDeuda: filas.filter((f) => f.saldo > 0.5).length,
    clientesEnMora: filas.filter((f) => f.enMora).length,
  }
}
