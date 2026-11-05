import { prisma } from "@/lib/prisma"
import { stockPorMaterial } from "@/lib/stock"

/** Materiales para los formularios de inventario, con su stock actual. */
export async function materialesParaFormulario() {
  const [materiales, stock] = await Promise.all([
    prisma.material.findMany({ orderBy: { nombre: "asc" }, select: { id: true, nombre: true, unidad: true, costoPromedio: true } }),
    stockPorMaterial(),
  ])
  return materiales.map((m) => ({
    id: m.id,
    nombre: m.nombre,
    unidad: m.unidad,
    costoPromedio: Number(m.costoPromedio),
    stock: stock.get(m.id) ?? 0,
  }))
}

export type MaterialForm = Awaited<ReturnType<typeof materialesParaFormulario>>[number]

/** Textos ya usados en un campo (proveedores, motivos), los más recientes primero, sin repetir. */
export async function textosUsados(campo: "proveedor" | "motivo", tipo: "ENTRADA" | "SALIDA" | "AJUSTE", max = 12) {
  const filas = await prisma.movimientoInventario.findMany({
    where: { tipo, [campo]: { not: null } },
    orderBy: { createdAt: "desc" },
    take: 300,
    select: { [campo]: true } as { proveedor: true } | { motivo: true },
  })
  const vistos = new Map<string, string>()
  for (const f of filas as Record<string, string | null>[]) {
    const t = f[campo]?.trim()
    if (t && !vistos.has(t.toLowerCase())) vistos.set(t.toLowerCase(), t)
  }
  return [...vistos.values()].slice(0, max)
}
