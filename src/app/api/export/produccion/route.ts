import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import * as XLSX from "xlsx"

export async function GET() {
  const session = await auth()
  if (!session?.user) return new NextResponse("No autorizado", { status: 401 })

  const rol = (session.user as any).rol
  if (rol !== "GERENCIA") return new NextResponse("Sin permisos", { status: 403 })

  const ordenes = await prisma.ordenTrabajo.findMany({
    include: {
      cliente: true,
      registros: true,
    },
    orderBy: { fechaIngreso: "desc" },
  })

  const data = ordenes.map((ot) => {
    const kgBuenos = ot.registros.reduce((s, r) => s + Number(r.kgBuenos), 0)
    const kgMerma = ot.registros.reduce((s, r) => s + Number(r.kgMerma), 0)
    const kgRechazado = ot.registros.reduce((s, r) => s + Number(r.kgRechazado), 0)

    return {
      OT: ot.numero,
      Cliente: ot.cliente.nombre,
      Producto: ot.producto,
      Medida: ot.medida || "",
      "Kg Pedidos": Number(ot.kgPedidos),
      "Precio/Kg": Number(ot.precioUnitario),
      "Kg Buenos": kgBuenos,
      "Kg Merma": kgMerma,
      "Kg Rechazado": kgRechazado,
      Estado: ot.estado,
      Fecha: ot.fechaIngreso.toISOString().split("T")[0],
    }
  })

  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.json_to_sheet(data)
  XLSX.utils.book_append_sheet(wb, ws, "Produccion")

  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" })

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename=produccion_${Date.now()}.xlsx`,
    },
  })
}
