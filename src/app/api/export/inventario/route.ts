import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import * as XLSX from "xlsx"

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

export async function GET() {
  const session = await auth()
  if (!session?.user) return new NextResponse("No autorizado", { status: 401 })

  const rol = (session.user as any).rol
  if (rol !== "GERENCIA") return new NextResponse("Sin permisos", { status: 403 })

  const materiales = await prisma.material.findMany({
    orderBy: { nombre: "asc" },
  })

  const data = await Promise.all(
    materiales.map(async (m) => ({
      Material: m.nombre,
      Categoria: m.categoria,
      Unidad: m.unidad,
      "Stock Minimo": Number(m.stockMinimo),
      "Costo Promedio": Number(m.costoPromedio),
      Stock: await getStock(m.id),
    }))
  )

  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.json_to_sheet(data)
  XLSX.utils.book_append_sheet(wb, ws, "Inventario")

  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" })

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename=inventario_${Date.now()}.xlsx`,
    },
  })
}
