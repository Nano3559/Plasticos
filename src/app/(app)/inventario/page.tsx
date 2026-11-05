import { prisma } from "@/lib/prisma"
import { stockPorMaterial } from "@/lib/stock"
import { InventarioView } from "./inventario-view"

export const dynamic = "force-dynamic"

export default async function InventarioPage() {
  const [materiales, stock] = await Promise.all([prisma.material.findMany({ orderBy: { nombre: "asc" } }), stockPorMaterial()])
  return (
    <InventarioView
      materiales={materiales.map((m) => ({
        id: m.id,
        nombre: m.nombre,
        categoria: m.categoria,
        unidad: m.unidad,
        stockMinimo: Number(m.stockMinimo),
        costoPromedio: Number(m.costoPromedio),
        stock: stock.get(m.id) ?? 0,
      }))}
    />
  )
}
