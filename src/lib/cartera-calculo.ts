/** Cálculo de cartera sin base de datos (se puede usar y probar en cualquier lado). */
import { redondear } from "@/lib/formato"

export type RangoAntiguedad = "0-15" | "16-30" | "31-60" | "60+"

type Numerico = unknown

export type ClienteConMovimientos = {
  id: string
  nombre: string
  telefono: string | null
  diasCredito: number
  ordenes: { numero: number; precioUnitario: Numerico; entregas: { fecha: Date; kgEntregados: Numerico }[] }[]
  pagos: { monto: Numerico }[]
  /** Devoluciones y descuentos: rebajan la deuda pero no son plata cobrada */
  notasCredito?: { monto: Numerico }[]
}

export type CarteraCliente = {
  cliente: Pick<ClienteConMovimientos, "id" | "nombre" | "telefono" | "diasCredito">
  totalEntregado: number
  totalPagado: number
  /** Devoluciones y descuentos */
  totalCreditos: number
  /** Lo que el cliente debe (nunca negativo) */
  saldo: number
  /** Pagos por encima de lo entregado (anticipos) */
  aFavor: number
  saldoPorRango: Record<RangoAntiguedad, number>
  /** Días de la entrega más antigua que sigue con saldo pendiente */
  diasMasAntiguo: number
}

const MS_DIA = 24 * 60 * 60 * 1000

export function rangoDeDias(dias: number): RangoAntiguedad {
  if (dias <= 15) return "0-15"
  if (dias <= 30) return "16-30"
  if (dias <= 60) return "31-60"
  return "60+"
}

/**
 * Cartera de un cliente. Los pagos se aplican primero a las entregas más antiguas (FIFO):
 * así la deuda vieja no queda escondida en los rangos recientes.
 */
export function calcularCartera(c: ClienteConMovimientos, hoy = new Date()): CarteraCliente {
  const entregas = c.ordenes.flatMap((o) =>
    o.entregas.map((e) => ({
      fecha: new Date(e.fecha),
      monto: Number(e.kgEntregados) * Number(o.precioUnitario),
    }))
  )
  entregas.sort((a, b) => a.fecha.getTime() - b.fecha.getTime())

  const totalEntregado = entregas.reduce((s, e) => s + e.monto, 0)
  const totalPagado = c.pagos.reduce((s, p) => s + Number(p.monto), 0)
  const totalCreditos = (c.notasCredito ?? []).reduce((s, n) => s + Number(n.monto), 0)

  const saldoPorRango: Record<RangoAntiguedad, number> = { "0-15": 0, "16-30": 0, "31-60": 0, "60+": 0 }
  let porAplicar = totalPagado + totalCreditos
  let diasMasAntiguo = 0
  for (const e of entregas) {
    const aplicado = Math.min(porAplicar, e.monto)
    porAplicar -= aplicado
    const pendiente = e.monto - aplicado
    if (pendiente <= 0.005) continue
    const dias = Math.max(0, Math.floor((hoy.getTime() - e.fecha.getTime()) / MS_DIA))
    saldoPorRango[rangoDeDias(dias)] += pendiente
    diasMasAntiguo = Math.max(diasMasAntiguo, dias)
  }

  const neto = totalEntregado - totalPagado - totalCreditos
  return {
    cliente: { id: c.id, nombre: c.nombre, telefono: c.telefono, diasCredito: c.diasCredito },
    totalEntregado: redondear(totalEntregado),
    totalPagado: redondear(totalPagado),
    totalCreditos: redondear(totalCreditos),
    saldo: neto > 0.005 ? redondear(neto) : 0,
    aFavor: neto < -0.005 ? redondear(-neto) : 0,
    saldoPorRango: {
      "0-15": redondear(saldoPorRango["0-15"]),
      "16-30": redondear(saldoPorRango["16-30"]),
      "31-60": redondear(saldoPorRango["31-60"]),
      "60+": redondear(saldoPorRango["60+"]),
    },
    diasMasAntiguo,
  }
}

export function resumirCartera(lista: CarteraCliente[]) {
  const conDeuda = lista.filter((c) => c.saldo > 0.5)
  return {
    totalPorCobrar: redondear(conDeuda.reduce((s, c) => s + c.saldo, 0)),
    // Mora: lo que lleva más de 30 días
    totalEnMora: redondear(conDeuda.reduce((s, c) => s + c.saldoPorRango["31-60"] + c.saldoPorRango["60+"], 0)),
    clientesConDeuda: conDeuda.length,
    totalCobrado: redondear(lista.reduce((s, c) => s + c.totalPagado, 0)),
    totalCreditos: redondear(lista.reduce((s, c) => s + c.totalCreditos, 0)),
    totalEntregado: redondear(lista.reduce((s, c) => s + c.totalEntregado, 0)),
  }
}
