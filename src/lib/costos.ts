import { prisma } from "@/lib/prisma"
import { fechaLaPaz } from "@/lib/session"

const AREAS_EN_ORDEN = ["EXTRUSION", "IMPRESION", "CONFECCION"] as const

type RegistroArea = { area: string; kgBuenos: unknown; kgEntrada?: unknown }

function sumaPorArea(registros: RegistroArea[], area: string, campo: "kgBuenos" | "kgEntrada") {
  return registros.filter((r) => r.area === area).reduce((s, r) => s + Number(r[campo] ?? 0), 0)
}

/**
 * Kg buenos del producto terminado: los del último área por la que pasó la orden.
 * Sumar las tres áreas contaba el mismo material hasta tres veces (sale de extrusión,
 * se imprime y se confecciona) y dividía el costo por 100 kg a la mitad o menos.
 */
export function kgBuenosFinales(registros: RegistroArea[]): number {
  for (const area of [...AREAS_EN_ORDEN].reverse()) {
    if (registros.some((r) => r.area === area)) return sumaPorArea(registros, area, "kgBuenos")
  }
  return 0
}

/** Kg que entraron a la primera área de la orden (la materia prima real que se procesó). */
export function kgEntradaInicial(registros: RegistroArea[]): number {
  for (const area of AREAS_EN_ORDEN) {
    if (registros.some((r) => r.area === area)) return sumaPorArea(registros, area, "kgEntrada")
  }
  return 0
}

/** Rendimiento de toda la cadena: producto terminado ÷ materia prima que entró. */
export function rendimientoOrden(registros: RegistroArea[]): number {
  const entrada = kgEntradaInicial(registros)
  return entrada > 0 ? (kgBuenosFinales(registros) / entrada) * 100 : 0
}

export function costoPor100kg(costoTotal: number, kgBuenos: number): number {
  return kgBuenos > 0 ? (costoTotal / kgBuenos) * 100 : 0
}

export type CostoOrden = {
  manoObra: number
  energia: number
  /** Resinas, reciclado, masterbatch y otros insumos entregados a la OT con vale de salida */
  materiaPrima: number
  /** Tintas y solventes entregados a la OT */
  tintas: number
  total: number
  /** Cantidad de vales de salida ligados a la orden */
  vales: number
}

const CATEGORIAS_TINTA = new Set(["TINTA", "SOLVENTE"])

/**
 * Costo directo de cada orden = materia prima + tintas (vales de salida ligados a la OT,
 * valorados al costo promedio vigente cuando salieron) + su parte de mano de obra y energía.
 *
 * Mano de obra y energía se cargan por turno y se reparten entre las órdenes que produjeron
 * en ese turno, en proporción a sus kg buenos. Antes cada OT recibía el costo COMPLETO del
 * turno, así que dos OTs en el mismo turno contaban el gasto dos veces. La fecha del turno se
 * toma en America/La_Paz, no en UTC (después de las 20:00 caía al día siguiente).
 */
export async function asignarCostosPorOrden(): Promise<Map<string, CostoOrden>> {
  const [costos, registros, salidas] = await Promise.all([
    prisma.costoTurno.findMany(),
    prisma.registroProduccion.findMany({ select: { ordenId: true, turno: true, kgBuenos: true, createdAt: true } }),
    prisma.movimientoInventario.findMany({
      where: { tipo: "SALIDA", ordenId: { not: null } },
      select: {
        ordenId: true,
        cantidad: true,
        costoUnitario: true,
        material: { select: { categoria: true, costoPromedio: true } },
      },
    }),
  ])

  const resultado = new Map<string, CostoOrden>()
  const obtener = (ordenId: string) => {
    let c = resultado.get(ordenId)
    if (!c) {
      c = { manoObra: 0, energia: 0, materiaPrima: 0, tintas: 0, total: 0, vales: 0 }
      resultado.set(ordenId, c)
    }
    return c
  }

  // 1. Materiales
  for (const s of salidas) {
    const c = obtener(s.ordenId as string)
    const costoUnit = s.costoUnitario !== null ? Number(s.costoUnitario) : Number(s.material.costoPromedio)
    const valor = Number(s.cantidad) * costoUnit
    if (CATEGORIAS_TINTA.has(s.material.categoria)) c.tintas += valor
    else c.materiaPrima += valor
    c.vales += 1
  }

  // 2. Mano de obra y energía por turno
  const costoPorTurno = new Map<string, { manoObra: number; energia: number }>()
  for (const c of costos) {
    // CostoTurno.fecha se guarda como medianoche UTC del día elegido en el formulario
    costoPorTurno.set(`${c.fecha.toISOString().slice(0, 10)}|${c.turno}`, {
      manoObra: Number(c.manoObra),
      energia: Number(c.energia),
    })
  }
  const kgPorTurno = new Map<string, number>()
  const kgPorTurnoYOrden = new Map<string, Map<string, number>>()
  for (const r of registros) {
    const key = `${fechaLaPaz(r.createdAt)}|${r.turno}`
    const kg = Number(r.kgBuenos)
    kgPorTurno.set(key, (kgPorTurno.get(key) ?? 0) + kg)
    const porOrden = kgPorTurnoYOrden.get(key) ?? new Map<string, number>()
    porOrden.set(r.ordenId, (porOrden.get(r.ordenId) ?? 0) + kg)
    kgPorTurnoYOrden.set(key, porOrden)
  }
  for (const [key, porOrden] of kgPorTurnoYOrden) {
    const costo = costoPorTurno.get(key)
    if (!costo) continue
    const totalKg = kgPorTurno.get(key) ?? 0
    for (const [ordenId, kg] of porOrden) {
      // Si nadie produjo kg buenos en el turno, se reparte en partes iguales
      const proporcion = totalKg > 0 ? kg / totalKg : 1 / porOrden.size
      const c = obtener(ordenId)
      c.manoObra += costo.manoObra * proporcion
      c.energia += costo.energia * proporcion
    }
  }

  for (const c of resultado.values()) c.total = c.manoObra + c.energia + c.materiaPrima + c.tintas
  return resultado
}
