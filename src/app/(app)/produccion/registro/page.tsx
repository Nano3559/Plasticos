import { prisma } from "@/lib/prisma"
import { haceDias } from "@/lib/rechazos"
import { kgBuenosFinales } from "@/lib/costos"
import { RegistroForm, type LoteOpcion } from "./registro-form"

export const dynamic = "force-dynamic"

/** Lotes que se ofrecen para un rechazo: entradas con proveedor de los últimos 6 meses. */
const DIAS_LOTES = 180
const MAX_LOTES = 200

export default async function RegistroPage({ searchParams }: { searchParams: Promise<{ ot?: string }> }) {
  const { ot: otPedida } = await searchParams
  const desde = haceDias(DIAS_LOTES)
  const [ordenes, entradas] = await Promise.all([
    prisma.ordenTrabajo.findMany({
      where: { estado: "ABIERTA" },
      orderBy: { fechaIngreso: "desc" },
      include: {
        cliente: { select: { id: true, nombre: true } },
        registros: { select: { area: true, kgBuenos: true } },
        // Materiales entregados a esta OT con vale de salida: sus lotes se muestran primero
        movimientos: { where: { tipo: "SALIDA" }, select: { materialId: true }, distinct: ["materialId"] },
      },
    }),
    prisma.movimientoInventario.findMany({
      where: { tipo: "ENTRADA", proveedor: { not: null }, createdAt: { gte: desde } },
      orderBy: { createdAt: "desc" },
      take: MAX_LOTES,
      select: { id: true, materialId: true, proveedor: true, lote: true, cantidad: true, createdAt: true, material: { select: { nombre: true } } },
    }),
  ])

  const ordenesFormateadas = ordenes.map((ot) => ({
    id: ot.id,
    numero: ot.numero,
    refExterna: ot.refExterna,
    producto: ot.producto,
    medida: ot.medida,
    mezclaNota: ot.mezclaNota,
    kgPedidos: Number(ot.kgPedidos),
    totalFabricado: kgBuenosFinales(ot.registros),
    clienteNombre: ot.cliente.nombre,
    materialesUsados: ot.movimientos.map((m) => m.materialId),
  }))

  const lotes: LoteOpcion[] = entradas
    .filter((e) => e.proveedor?.trim())
    .map((e) => ({
      id: e.id,
      materialId: e.materialId,
      material: e.material.nombre,
      proveedor: e.proveedor!.trim(),
      lote: e.lote?.trim() || null,
      kg: Number(e.cantidad),
      fecha: e.createdAt.toISOString(),
    }))

  const inicial = ordenesFormateadas.some((o) => o.id === otPedida) ? otPedida : undefined
  return <RegistroForm ordenes={ordenesFormateadas} lotes={lotes} ordenInicial={inicial} />
}
