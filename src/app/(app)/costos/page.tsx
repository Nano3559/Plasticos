import Link from "next/link"
import { ChevronRight, Plus } from "lucide-react"
import { prisma } from "@/lib/prisma"
import { fechaLaPaz } from "@/lib/session"
import { asignarCostosPorOrden, costoPor100kg, kgBuenosFinales } from "@/lib/costos"
import { formatBs, formatKg } from "@/lib/formato"
import { rangoMes } from "@/lib/gastos"
import { TURNO_ETIQUETA } from "@/lib/etiquetas"
import { Button } from "@/components/ui/button"
import { Cifras } from "@/components/ui/cifras"
import { Encabezado } from "@/components/ui/encabezado"
import { Seccion } from "@/components/ui/seccion"

export const dynamic = "force-dynamic"

const fecha = (d: Date) => d.toLocaleDateString("es-BO", { weekday: "short", day: "2-digit", month: "short", timeZone: "UTC" }).replace(".", "")

const SECCIONES = [
  { href: "/costos/por-ot", titulo: "Costo por orden", texto: "Costo por 100 kg, margen y desglose de cada OT" },
  { href: "/costos/desperdicio", titulo: "Desperdicio", texto: "Merma y rechazo por área y por orden" },
  { href: "/costos/gastos", titulo: "Gastos generales", texto: "Mantenimiento, repuestos, fletes, alquiler…" },
  { href: "/costos/turno", titulo: "Costo de turno", texto: "Mano de obra y energía de cada turno" },
]

export default async function CostosPage() {
  const { desde: inicioMes, hasta: finMes } = rangoMes(fechaLaPaz(new Date()).slice(0, 7))
  const [turnos, registros, costosPorOrden, gastosMes] = await Promise.all([
    prisma.costoTurno.findMany({ orderBy: [{ fecha: "desc" }, { turno: "asc" }], take: 9 }),
    prisma.registroProduccion.findMany({ select: { ordenId: true, area: true, kgBuenos: true, kgMerma: true, kgRechazado: true, kgEntrada: true } }),
    asignarCostosPorOrden(),
    prisma.gasto.aggregate({ where: { fecha: { gte: inicioMes, lt: finMes } }, _sum: { monto: true } }),
  ])

  // Promedio ponderado: solo órdenes con costo asignado y producto terminado
  const porOrden = new Map<string, typeof registros>()
  for (const r of registros) porOrden.set(r.ordenId, [...(porOrden.get(r.ordenId) ?? []), r])
  let kgConCosto = 0
  let costoTotal = 0
  for (const [id, regs] of porOrden) {
    const kg = kgBuenosFinales(regs)
    const c = costosPorOrden.get(id)
    if (c && kg > 0) {
      kgConCosto += kg
      costoTotal += c.total
    }
  }
  const entrada = registros.reduce((s, r) => s + Number(r.kgEntrada), 0)
  const perdida = registros.reduce((s, r) => s + Number(r.kgMerma) + Number(r.kgRechazado), 0)

  return (
    <div className="space-y-10">
      <Encabezado
        titulo="Costos"
        descripcion="Costo por 100 kg = (materia prima + tintas + mano de obra + energía) ÷ kg buenos × 100."
        acciones={
          <Button asChild size="sm">
            <Link href="/costos/turno">
              <Plus /> Costo de turno
            </Link>
          </Button>
        }
      />

      <Cifras
        items={[
          { etiqueta: "Costo por 100 kg", valor: formatBs(costoPor100kg(costoTotal, kgConCosto)), nota: "promedio de las órdenes con costo", tono: "brand" },
          { etiqueta: "Producto con costo", valor: formatKg(kgConCosto, 0), nota: "kg buenos que entran al promedio" },
          { etiqueta: "Desperdicio", valor: `${entrada > 0 ? ((perdida / entrada) * 100).toLocaleString("es-BO", { maximumFractionDigits: 1 }) : "0"}%`, nota: `${formatKg(perdida, 0)} de merma y rechazo` },
          { etiqueta: "Gastos del mes", valor: formatBs(gastosMes._sum.monto ?? 0, 0), nota: "no entran al costo por 100 kg" },
        ]}
      />

      <ul className="grid gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-2">
        {SECCIONES.map((s) => (
          <li key={s.href} className="bg-card">
            <Link href={s.href} className="group flex items-center justify-between gap-3 px-5 py-4 transition-colors hover:bg-elevated">
              <span>
                <span className="block font-semibold group-hover:text-brand-ink">{s.titulo}</span>
                <span className="mt-0.5 block text-[13px] text-subdued">{s.texto}</span>
              </span>
              <ChevronRight className="size-4 shrink-0 text-muted" />
            </Link>
          </li>
        ))}
      </ul>

      <Seccion titulo="Últimos turnos cargados" cuenta={turnos.length} verTodo={{ href: "/costos/turno", texto: "Cargar turno" }}>
        {turnos.length === 0 ? (
          <p className="py-6 text-subdued">Todavía no se cargó el costo de ningún turno. Sin eso, el costo por 100 kg solo incluye materiales.</p>
        ) : (
          <ul>
            {turnos.map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-3 border-b border-line py-3 last:border-b-0">
                <span>
                  <span className="block first-letter:uppercase">
                    {fecha(t.fecha)} · turno {(TURNO_ETIQUETA[t.turno] ?? t.turno).toLowerCase()}
                  </span>
                  <span className="text-[13px] text-subdued">
                    Mano de obra {formatBs(t.manoObra)} · energía {formatBs(t.energia)}
                  </span>
                </span>
                <span className="shrink-0 font-semibold tabular-nums">{formatBs(Number(t.manoObra) + Number(t.energia))}</span>
              </li>
            ))}
          </ul>
        )}
      </Seccion>
    </div>
  )
}
