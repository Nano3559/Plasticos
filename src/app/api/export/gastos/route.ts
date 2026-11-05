import type { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { exigirRolReportes, respuestaXlsx } from "@/lib/export-xlsx"
import { leerMes, rangoMes } from "@/lib/gastos"

/** /api/export/gastos → todos; /api/export/gastos?mes=2026-11 → solo ese mes. */
export async function GET(req: NextRequest) {
  const denegado = await exigirRolReportes()
  if (denegado) return denegado

  const mesParam = req.nextUrl.searchParams.get("mes") ?? undefined
  const mes = mesParam ? leerMes(mesParam, "") : ""
  const where = mes ? { fecha: { gte: rangoMes(mes).desde, lt: rangoMes(mes).hasta } } : {}

  const gastos = await prisma.gasto.findMany({
    where,
    orderBy: [{ fecha: "desc" }, { createdAt: "desc" }],
    include: { user: { select: { nombre: true } } },
  })

  const filas = gastos.map((g) => ({
    Fecha: g.fecha.toISOString().slice(0, 10),
    Mes: g.fecha.toISOString().slice(0, 7),
    Categoría: g.categoria,
    Detalle: g.descripcion ?? "",
    Comprobante: g.comprobante ?? "",
    "Monto (Bs)": Number(g.monto),
    "Registrado por": g.user?.nombre ?? "",
  }))
  return respuestaXlsx(mes ? `gastos_${mes}` : "gastos", "Gastos", filas)
}
