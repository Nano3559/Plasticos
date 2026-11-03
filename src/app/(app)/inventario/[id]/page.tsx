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

  let runningBalance = 0
  const movimientosConSaldo = movimientosAsc.map((m) => {
    const cant = Number(m.cantidad)
    if (m.tipo === "ENTRADA") runningBalance += cant
    else if (m.tipo === "SALIDA") runningBalance -= cant
    else if (m.tipo === "AJUSTE") runningBalance += cant

    return {
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
      saldoAcumulado: runningBalance,
    }
  })

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
        stock: runningBalance,
      }}
      movimientos={movimientosDesc}
    />
  )
}
