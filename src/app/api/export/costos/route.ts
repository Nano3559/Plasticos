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

  const data = []
  for (const ot of ordenes) {
    const kgBuenos = ot.registros.reduce((s, r) => s + Number(r.kgBuenos), 0)

    const turnos = [...new Set(ot.registros.map((r) => `${r.turno}|${r.createdAt.toISOString().split("T")[0]}`))]
    let manoObra = 0
    let energia = 0
    for (const t of turnos) {
      const [turno, fecha] = t.split("|")
      const costo = await prisma.costoTurno.findUnique({
        where: { fecha_turno: { fecha: new Date(fecha), turno: turno as any } },
      })
      if (costo) {
        manoObra += Number(costo.manoObra)
        energia += Number(costo.energia)
      }
    }

    const costoTotal = manoObra + energia
    const costoPor100kg = kgBuenos > 0 ? (costoTotal / kgBuenos) * 100 : 0

    data.push({
      OT: ot.numero,
      Cliente: ot.cliente.nombre,
      Producto: ot.producto,
      "Kg Buenos": Number(kgBuenos.toFixed(2)),
      "Mano Obra": Number(manoObra.toFixed(2)),
      Energia: Number(energia.toFixed(2)),
      "Costo Total": Number(costoTotal.toFixed(2)),
      "Costo x 100 kg": Number(costoPor100kg.toFixed(2)),
    })
  }

  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.json_to_sheet(data)
  XLSX.utils.book_append_sheet(wb, ws, "Costos")

  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" })

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename=costos_${Date.now()}.xlsx`,
    },
  })
}
