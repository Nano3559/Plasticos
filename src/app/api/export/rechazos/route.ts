import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getSessionUser } from "@/lib/session"
import { respuestaXlsx } from "@/lib/export-xlsx"
import { leerPeriodoRechazo } from "@/lib/rechazos"
import { TURNO_NOMBRE } from "@/lib/turno"
import { redondear } from "@/lib/formato"

/** Rechazos en extrusión del periodo (?meses=3|6|12), uno por fila. Almacén, Administración y Gerencia. */
export async function GET(req: NextRequest) {
  const user = await getSessionUser()
  if (!user) return new NextResponse("No autorizado", { status: 401 })
  if (!["ALMACEN", "ADMIN", "GERENCIA"].includes(user.rol)) return new NextResponse("Sin permisos", { status: 403 })

  const meses = leerPeriodoRechazo(req.nextUrl.searchParams.get("meses") ?? undefined)
  const desde = new Date()
  desde.setMonth(desde.getMonth() - meses)

  const rechazos = await prisma.registroProduccion.findMany({
    where: { area: "EXTRUSION", kgRechazado: { gt: 0 }, createdAt: { gte: desde } },
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { nombre: true } },
      orden: { select: { numero: true, refExterna: true, cliente: { select: { nombre: true } } } },
      rechazoEntrada: { select: { material: { select: { nombre: true } } } },
    },
  })

  const filas = rechazos.map((r) => ({
    Fecha: r.createdAt.toISOString().slice(0, 10),
    Proveedor: r.rechazoProveedor ?? "",
    Lote: r.rechazoLote ?? "",
    Material: r.rechazoEntrada?.material.nombre ?? "",
    "Kg rechazados": redondear(Number(r.kgRechazado)),
    "Kg entrada a máquina": redondear(Number(r.kgEntrada)),
    Motivo: r.rechazoMotivo ?? "",
    Detalle: r.rechazoNota ?? "",
    OT: r.orden.refExterna ?? `#${r.orden.numero}`,
    Cliente: r.orden.cliente.nombre,
    Turno: TURNO_NOMBRE[r.turno],
    Operador: r.user.nombre,
  }))
  return respuestaXlsx(`rechazos_${meses}m`, "Rechazos", filas)
}
