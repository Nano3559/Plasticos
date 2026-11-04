import { prisma } from "@/lib/prisma"
import { exigirRolReportes, respuestaXlsx } from "@/lib/export-xlsx"
import { asignarCostosPorOrden, costoPor100kg, kgBuenosFinales } from "@/lib/costos"
import { redondear } from "@/lib/formato"

export async function GET() {
  const denegado = await exigirRolReportes()
  if (denegado) return denegado

  const [ordenes, costos] = await Promise.all([
    prisma.ordenTrabajo.findMany({
      include: { cliente: true, registros: true },
      orderBy: { fechaIngreso: "desc" },
    }),
    asignarCostosPorOrden(),
  ])

  const filas = ordenes.map((ot) => {
    const c = costos.get(ot.id)
    const kgBuenos = kgBuenosFinales(ot.registros)
    const total = c?.total ?? 0
    return {
      OT: ot.numero,
      Cliente: ot.cliente.nombre,
      Producto: ot.producto,
      "Kg buenos": redondear(kgBuenos),
      "Materia prima (Bs)": redondear(c?.materiaPrima ?? 0),
      "Tintas y solventes (Bs)": redondear(c?.tintas ?? 0),
      "Mano de obra (Bs)": redondear(c?.manoObra ?? 0),
      "Energía (Bs)": redondear(c?.energia ?? 0),
      "Costo total (Bs)": redondear(total),
      "Costo por 100 kg (Bs)": redondear(costoPor100kg(total, kgBuenos)),
      "Precio de venta por kg (Bs)": Number(ot.precioUnitario),
      "Vales de salida ligados": c?.vales ?? 0,
    }
  })
  return respuestaXlsx("costos", "Costos", filas)
}
