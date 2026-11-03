import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import * as XLSX from "xlsx"

export async function GET() {
  const session = await auth()
  if (!session?.user) return new NextResponse("No autorizado", { status: 401 })

  const rol = (session.user as any).rol
  if (rol !== "GERENCIA") return new NextResponse("Sin permisos", { status: 403 })

  const clientes = await prisma.cliente.findMany({
    include: {
      ordenes: { include: { entregas: true } },
      pagos: true,
    },
    orderBy: { nombre: "asc" },
  })

  const data = clientes.map((c) => {
    let totalEntregado = 0
    for (const o of c.ordenes) {
      const precio = Number(o.precioUnitario)
      for (const e of o.entregas) {
        totalEntregado += Number(e.kgEntregados) * precio
      }
    }
    const totalPagado = c.pagos.reduce((s, p) => s + Number(p.monto), 0)
    const saldo = totalEntregado - totalPagado

    return {
      Cliente: c.nombre,
      "Dias Credito": c.diasCredito,
      "Total Entregado": Number(totalEntregado.toFixed(2)),
      "Total Pagado": Number(totalPagado.toFixed(2)),
      Saldo: Number(saldo.toFixed(2)),
    }
  })

  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.json_to_sheet(data)
  XLSX.utils.book_append_sheet(wb, ws, "Cartera")

  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" })

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename=cartera_${Date.now()}.xlsx`,
    },
  })
}
