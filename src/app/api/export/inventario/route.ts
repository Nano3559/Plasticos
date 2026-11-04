import { prisma } from "@/lib/prisma"
import { stockPorMaterial } from "@/lib/stock"
import { exigirRolReportes, respuestaXlsx } from "@/lib/export-xlsx"
import { redondear } from "@/lib/formato"

export async function GET() {
  const denegado = await exigirRolReportes()
  if (denegado) return denegado

  const [materiales, stock] = await Promise.all([
    prisma.material.findMany({ orderBy: { nombre: "asc" } }),
    stockPorMaterial(),
  ])

  const filas = materiales.map((m) => {
    const s = stock.get(m.id) ?? 0
    return {
      Material: m.nombre,
      Categoría: m.categoria,
      Unidad: m.unidad,
      Stock: redondear(s),
      "Stock mínimo": Number(m.stockMinimo),
      "Costo promedio (Bs)": redondear(Number(m.costoPromedio), 4),
      "Valor en stock (Bs)": redondear(s * Number(m.costoPromedio)),
      Alerta: s <= Number(m.stockMinimo) && Number(m.stockMinimo) > 0 ? "Bajo mínimo" : "",
    }
  })
  return respuestaXlsx("inventario", "Inventario", filas)
}
