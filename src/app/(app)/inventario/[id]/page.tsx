import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import { KardexMaterialView } from "./kardex-material-view"

export const dynamic = "force-dynamic"

export default async function DetalleMaterialPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const material = await prisma.material.findUnique({
    where: { id },
  })

  if (!material) notFound()

  // Fetch chronological to compute accurate running balance
  const movimientosAsc = await prisma.movimientoInventario.findMany({
    where: { materialId: id },
    orderBy: { createdAt: "asc" },
    include: {
      user: true,
      orden: { select: { numero: true } },
    },
  })

  const movimientosConSaldo = movimientosAsc.reduce<
    {
      id: string
      tipo: "ENTRADA" | "SALIDA" | "AJUSTE"
      cantidad: number
      costoUnitario: number | null
      turno: string
      motivo: string | null
      proveedor: string | null
      lote: string | null
      ordenNumero: number | null
      userName: string
      createdAt: string
      saldoAcumulado: number
    }[]
  >((acc, m) => {
    const cant = Number(m.cantidad)
    const anterior = acc.length > 0 ? acc[acc.length - 1].saldoAcumulado : 0
    // ENTRADA suma, SALIDA resta y el AJUSTE ya trae su propio signo
    const saldoAcumulado = m.tipo === "SALIDA" ? anterior - cant : anterior + cant
    acc.push({
      id: m.id,
      tipo: m.tipo as "ENTRADA" | "SALIDA" | "AJUSTE",
      cantidad: cant,
      costoUnitario: m.costoUnitario ? Number(m.costoUnitario) : null,
      turno: m.turno,
      motivo: m.motivo,
      proveedor: m.proveedor,
      lote: m.lote,
      ordenNumero: m.orden?.numero ?? null,
      userName: m.user.nombre,
      createdAt: m.createdAt.toISOString(),
      saldoAcumulado,
    })
    return acc
  }, [])

  // Invert back to newest-first for presentation
  const movimientosDesc = [...movimientosConSaldo].reverse()

  return (
    <KardexMaterialView
      material={{
        id: material.id,
        nombre: material.nombre,
        categoria: material.categoria,
        unidad: material.unidad,
        stockMinimo: Number(material.stockMinimo),
        costoPromedio: Number(material.costoPromedio),
        stock: movimientosConSaldo.at(-1)?.saldoAcumulado ?? 0,
      }}
      movimientos={movimientosDesc}
    />
  )
}
