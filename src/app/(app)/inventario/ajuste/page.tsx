import { prisma } from "@/lib/prisma"
import { stockPorMaterial } from "@/lib/stock"
import { AjusteForm } from "./ajuste-form"

export const dynamic = "force-dynamic"

export default async function AjustePage() {
  const materiales = await prisma.material.findMany({
    orderBy: { nombre: "asc" },
  })

  const stock = await stockPorMaterial()
  const materialesConStock = materiales.map((m) => ({
      id: m.id,
      nombre: m.nombre,
      categoria: m.categoria,
      unidad: m.unidad,
      stock: stock.get(m.id) ?? 0,
  }))

  return <AjusteForm materiales={materialesConStock} />
}
