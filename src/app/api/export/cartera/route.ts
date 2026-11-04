import { consultarCartera } from "@/lib/cartera"
import { exigirRolReportes, respuestaXlsx } from "@/lib/export-xlsx"

export async function GET() {
  const denegado = await exigirRolReportes()
  if (denegado) return denegado

  const cartera = await consultarCartera()
  const filas = cartera.map((c) => ({
    Cliente: c.cliente.nombre,
    Teléfono: c.cliente.telefono ?? "",
    "Días de crédito": c.cliente.diasCredito,
    "Total entregado (Bs)": c.totalEntregado,
    "Total pagado (Bs)": c.totalPagado,
    "Saldo por cobrar (Bs)": c.saldo,
    "Anticipo a favor (Bs)": c.aFavor,
    "0-15 días (Bs)": c.saldoPorRango["0-15"],
    "16-30 días (Bs)": c.saldoPorRango["16-30"],
    "31-60 días (Bs)": c.saldoPorRango["31-60"],
    "Más de 60 días (Bs)": c.saldoPorRango["60+"],
    "Días de la deuda más antigua": c.diasMasAntiguo,
  }))
  return respuestaXlsx("cartera", "Cartera", filas)
}
