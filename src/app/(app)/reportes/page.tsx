import { redirect } from "next/navigation"
import { Download } from "lucide-react"
import { prisma } from "@/lib/prisma"
import { getSessionUser } from "@/lib/session"
import { consultarCartera, resumirCartera } from "@/lib/cartera"
import { kgBuenosFinales, kgEntradaInicial } from "@/lib/costos"
import { formatBs, formatKg, formatNumero } from "@/lib/formato"
import { Button } from "@/components/ui/button"
import { Cifras } from "@/components/ui/cifras"
import { Encabezado } from "@/components/ui/encabezado"
import { Seccion } from "@/components/ui/seccion"

export const dynamic = "force-dynamic"

export default async function ReportesPage() {
  const user = await getSessionUser()
  if (user?.rol !== "GERENCIA" && user?.rol !== "ADMIN") redirect("/dashboard")

  const [materiales, registros, cartera, gastos, ordenes, rechazos] = await Promise.all([
    prisma.material.count(),
    prisma.registroProduccion.findMany({ select: { ordenId: true, area: true, kgBuenos: true, kgEntrada: true } }),
    consultarCartera(),
    prisma.gasto.count(),
    prisma.ordenTrabajo.count(),
    prisma.registroProduccion.count({ where: { area: "EXTRUSION", kgRechazado: { gt: 0 } } }),
  ])

  const porOrden = new Map<string, typeof registros>()
  for (const r of registros) porOrden.set(r.ordenId, [...(porOrden.get(r.ordenId) ?? []), r])
  const terminado = [...porOrden.values()].reduce((s, regs) => s + kgBuenosFinales(regs), 0)
  const entrada = [...porOrden.values()].reduce((s, regs) => s + kgEntradaInicial(regs), 0)
  const resumen = resumirCartera(cartera)

  const descargas = [
    { href: "/api/export/inventario", titulo: "Inventario", texto: "Stock de cada material, mínimo, costo promedio y valor.", nota: `${materiales} materiales` },
    { href: "/api/export/produccion", titulo: "Producción por orden", texto: "Kg pedidos, terminados, merma, rechazo y rendimiento de cada OT.", nota: `${ordenes} órdenes` },
    { href: "/api/export/costos", titulo: "Costos por orden", texto: "Materia prima, tintas, mano de obra, energía y costo por 100 kg.", nota: `${porOrden.size} órdenes con producción` },
    { href: "/api/export/cartera", titulo: "Cartera de clientes", texto: "Saldo de cada cliente y su antigüedad (0–15, 16–30, 31–60, más de 60 días).", nota: `${resumen.clientesConDeuda} con saldo` },
    { href: "/api/export/gastos", titulo: "Gastos generales", texto: "Fecha, categoría, comprobante, monto y quién lo registró.", nota: `${gastos} gastos` },
    { href: "/api/export/rechazos?meses=12", titulo: "Rechazos por proveedor", texto: "Rechazos en extrusión de los últimos 12 meses, con lote y motivo.", nota: `${rechazos} rechazos en total` },
  ]

  return (
    <div className="space-y-10">
      <Encabezado titulo="Reportes" descripcion="Planillas en Excel con los datos al momento de descargarlas." />

      <Cifras
        items={[
          { etiqueta: "Producto terminado", valor: formatKg(terminado, 0), nota: `rinde ${formatNumero(entrada > 0 ? (terminado / entrada) * 100 : 0, 1)}% en total` },
          { etiqueta: "Por cobrar", valor: formatBs(resumen.totalPorCobrar, 0), nota: `${resumen.clientesConDeuda} clientes` },
          { etiqueta: "Cobrado", valor: formatBs(resumen.totalCobrado, 0), nota: "en total" },
          { etiqueta: "Materiales", valor: String(materiales) },
        ]}
      />

      <Seccion titulo="Descargar en Excel" cuenta={descargas.length}>
        <ul>
          {descargas.map((d) => (
            <li key={d.href} className="flex items-center justify-between gap-4 border-b border-line py-3.5 last:border-b-0">
              <span className="min-w-0">
                <span className="block font-semibold">{d.titulo}</span>
                <span className="mt-0.5 block text-[13px] text-subdued">{d.texto}</span>
                <span className="mt-0.5 block text-xs text-muted">{d.nota}</span>
              </span>
              <Button asChild variant="outline" size="sm" className="shrink-0">
                <a href={d.href} download aria-label={`Descargar ${d.titulo}`}>
                  <Download /> Excel
                </a>
              </Button>
            </li>
          ))}
        </ul>
      </Seccion>
    </div>
  )
}
