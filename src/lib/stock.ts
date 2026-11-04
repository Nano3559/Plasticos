import { prisma } from "@/lib/prisma"

/**
 * Stock de todos los materiales en UNA consulta: ENTRADA − SALIDA ± AJUSTE.
 * Antes cada página hacía una consulta por material (y traía todos sus movimientos).
 */
export async function stockPorMaterial(): Promise<Map<string, number>> {
  const grupos = await prisma.movimientoInventario.groupBy({
    by: ["materialId", "tipo"],
    _sum: { cantidad: true },
  })
  const stock = new Map<string, number>()
  for (const g of grupos) {
    const cant = Number(g._sum.cantidad ?? 0)
    const signo = g.tipo === "SALIDA" ? -1 : 1 // el AJUSTE ya trae su propio signo
    stock.set(g.materialId, (stock.get(g.materialId) ?? 0) + signo * cant)
  }
  return stock
}
