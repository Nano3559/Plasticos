import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { stockPorMaterial } from "@/lib/stock"
import { InventarioView } from "./inventario-view"

export const dynamic = "force-dynamic"

export default async function InventarioPage() {
  const session = await auth()
  const rol = session?.user?.rol

  const materiales = await prisma.material.findMany({
    orderBy: { nombre: "asc" },
  })

  const stock = await stockPorMaterial()
  const materialesConStock = materiales.map((m) => ({
      id: m.id,
      nombre: m.nombre,
      categoria: m.categoria,
      unidad: m.unidad,
      stockMinimo: Number(m.stockMinimo),
      costoPromedio: Number(m.costoPromedio),
      stock: stock.get(m.id) ?? 0,
  }))

  return <InventarioView materiales={materialesConStock} rol={rol} />
}
