import { prisma } from "@/lib/prisma"
import { exigirRolReportes, respuestaXlsx } from "@/lib/export-xlsx"
import { kgBuenosFinales, rendimientoOrden } from "@/lib/costos"
import { redondear } from "@/lib/formato"
import { fechaLaPaz } from "@/lib/session"

export async function GET() {
  const denegado = await exigirRolReportes()
  if (denegado) return denegado

  const ordenes = await prisma.ordenTrabajo.findMany({
    include: { cliente: true, registros: true },
    orderBy: { fechaIngreso: "desc" },
  })

  const filas = ordenes.map((ot) => ({
    OT: ot.numero,
    "OT del cliente": ot.refExterna ?? "",
    Cliente: ot.cliente.nombre,
    Producto: ot.producto,
    Medida: ot.medida ?? "",
    "Kg pedidos": Number(ot.kgPedidos),
    "Precio por kg (Bs)": Number(ot.precioUnitario),
    "Valor del pedido (Bs)": redondear(Number(ot.kgPedidos) * Number(ot.precioUnitario)),
    "Kg buenos (producto terminado)": redondear(kgBuenosFinales(ot.registros)),
    "Kg merma": redondear(ot.registros.reduce((s, r) => s + Number(r.kgMerma), 0)),
    "Kg rechazado": redondear(ot.registros.reduce((s, r) => s + Number(r.kgRechazado), 0)),
    "Rendimiento %": redondear(rendimientoOrden(ot.registros), 1),
    Estado: ot.estado,
    Fecha: fechaLaPaz(ot.fechaIngreso),
  }))
  return respuestaXlsx("produccion", "Producción", filas)
}
