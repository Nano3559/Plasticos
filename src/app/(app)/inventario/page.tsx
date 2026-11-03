import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { InventarioView } from "./inventario-view"

export const dynamic = "force-dynamic"

async function getStock(materialId: string) {
  const movimientos = await prisma.movimientoInventario.findMany({
    where: { materialId },
    select: { tipo: true, cantidad: true },
  })

  let stock = 0
  for (const m of movimientos) {
    const cant = Number(m.cantidad)
    if (m.tipo === "ENTRADA") stock += cant
    if (m.tipo === "SALIDA") stock -= cant
    if (m.tipo === "AJUSTE") stock += cant
  }
  return stock
}

export default async function InventarioPage() {
  const session = await auth()
  const rol = (session?.user as any)?.rol

  const materiales = await prisma.material.findMany({
    orderBy: { nombre: "asc" },
  })

  const materialesConStock = await Promise.all(
    materiales.map(async (m) => ({
      id: m.id,
      nombre: m.nombre,
      categoria: m.categoria,
      unidad: m.unidad,
      stockMinimo: Number(m.stockMinimo),
      costoPromedio: Number(m.costoPromedio),
      stock: await getStock(m.id),
    }))
  )

  return <InventarioView materiales={materialesConStock} rol={rol} />
}
