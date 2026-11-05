import Link from "next/link"
import { ChevronLeft, ChevronRight, Download, Plus } from "lucide-react"
import { prisma } from "@/lib/prisma"
import { fechaLaPaz } from "@/lib/session"
import { formatBs } from "@/lib/formato"
import { desplazarMes, leerMes, nombreMes, rangoMes, sumarGastos, totalesPorCategoria, totalesPorMes } from "@/lib/gastos"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Seccion } from "@/components/ui/seccion"
import { BorrarGasto } from "./borrar-gasto"

export const dynamic = "force-dynamic"

const MESES_HISTORIAL = 6
const fechaCorta = (d: Date) => d.toLocaleDateString("es-BO", { weekday: "short", day: "2-digit", month: "short", timeZone: "UTC" })
const mesCorto = (mes: string) =>
  rangoMes(mes).desde.toLocaleDateString("es-BO", { month: "short", timeZone: "UTC" }).replace(".", "")

export default async function GastosPage({ searchParams }: { searchParams: Promise<{ mes?: string }> }) {
  const mesActual = fechaLaPaz(new Date()).slice(0, 7)
  const mes = leerMes((await searchParams).mes, mesActual)
  const { desde, hasta } = rangoMes(mes)
  const desdeHistorial = rangoMes(desplazarMes(mes, -(MESES_HISTORIAL - 1))).desde

  const [delMes, historial] = await Promise.all([
    prisma.gasto.findMany({
      where: { fecha: { gte: desde, lt: hasta } },
      orderBy: [{ fecha: "desc" }, { createdAt: "desc" }],
      include: { user: { select: { nombre: true } } },
    }),
    prisma.gasto.findMany({
      where: { fecha: { gte: desdeHistorial, lt: hasta } },
      select: { fecha: true, categoria: true, monto: true },
    }),
  ])

  const total = sumarGastos(delMes)
  const porCategoria = totalesPorCategoria(delMes)
  const porMes = totalesPorMes(historial, mes, MESES_HISTORIAL)
  const maxMes = Math.max(...porMes.map((m) => m.total), 1)
  const anterior = porMes[porMes.length - 2]?.total ?? 0
  const variacion = anterior > 0 ? ((total - anterior) / anterior) * 100 : null
  const esMesActual = mes === mesActual

  return (
    <div className="max-w-4xl space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-subdued">
            <Link href="/costos" className="hover:text-brand-ink hover:underline">
              Costos
            </Link>
          </p>
          <h1 className="mt-1 text-[26px] font-bold leading-tight sm:text-[28px]">Gastos generales</h1>
          <p className="mt-1 text-subdued">Lo que la planta paga aparte de materia prima, mano de obra y energía.</p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm">
            <a href={`/api/export/gastos?mes=${mes}`} download>
              <Download /> Excel
            </a>
          </Button>
          <Button asChild size="sm">
            <Link href="/costos/gastos/nuevo">
              <Plus /> Registrar gasto
            </Link>
          </Button>
        </div>
      </header>

      {/* Selector de mes */}
      <nav aria-label="Mes" className="flex items-center gap-1">
        <Button asChild variant="ghost" size="icon" aria-label="Mes anterior">
          <Link href={`/costos/gastos?mes=${desplazarMes(mes, -1)}`}>
            <ChevronLeft />
          </Link>
        </Button>
        <p className="min-w-44 text-center text-base font-semibold first-letter:uppercase">{nombreMes(mes)}</p>
        {esMesActual ? (
          <span className="size-10" aria-hidden />
        ) : (
          <Button asChild variant="ghost" size="icon" aria-label="Mes siguiente">
            <Link href={`/costos/gastos?mes=${desplazarMes(mes, 1)}`}>
              <ChevronRight />
            </Link>
          </Button>
        )}
        {!esMesActual && (
          <Link href="/costos/gastos" className="ml-2 text-[13px] font-semibold text-brand-ink hover:underline">
            Ir al mes actual
          </Link>
        )}
      </nav>

      <div className="grid gap-4 md:grid-cols-[1fr_1.3fr]">
        <Card className="px-5 py-4">
          <p className="text-[13px] text-subdued">Total del mes</p>
          <p className="mt-1 text-[28px] font-extrabold leading-tight tracking-tight tabular-nums">{formatBs(total)}</p>
          <p className="mt-0.5 text-xs text-muted">
            {delMes.length} {delMes.length === 1 ? "gasto" : "gastos"}
            {variacion !== null &&
              ` · ${variacion >= 0 ? "+" : ""}${variacion.toLocaleString("es-BO", { maximumFractionDigits: 0 })}% frente al mes anterior`}
          </p>

          {/* Últimos meses: barras simples */}
          <div className="mt-5 flex h-28 items-end gap-2" role="img" aria-label="Total de gastos de los últimos 6 meses">
            {porMes.map((m) => (
              <Link
                key={m.mes}
                href={`/costos/gastos?mes=${m.mes}`}
                className="group flex flex-1 flex-col items-center gap-1"
                title={`${nombreMes(m.mes)}: ${formatBs(m.total)}`}
              >
                <span
                  className={`w-full rounded-t-md transition ${m.mes === mes ? "bg-brand" : "bg-highlight group-hover:bg-brand/40"}`}
                  style={{ height: `${Math.max((m.total / maxMes) * 88, m.total > 0 ? 4 : 2)}px` }}
                />
                <span className={`text-[11px] ${m.mes === mes ? "font-bold text-fg" : "text-muted"}`}>{mesCorto(m.mes)}</span>
              </Link>
            ))}
          </div>
        </Card>

        <Card className="px-5 py-4">
          <p className="mb-3 text-[13px] text-subdued">Por categoría</p>
          {porCategoria.length === 0 ? (
            <p className="py-6 text-sm text-muted">Sin gastos este mes.</p>
          ) : (
            <ul className="space-y-3">
              {porCategoria.map((c) => (
                <li key={c.categoria}>
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="font-medium">{c.categoria}</span>
                    <span className="tabular-nums">
                      {formatBs(c.total)}
                      <span className="ml-2 text-xs text-muted">{c.porcentaje.toLocaleString("es-BO", { maximumFractionDigits: 0 })}%</span>
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 rounded-full bg-highlight">
                    <div className="h-1.5 rounded-full bg-brand" style={{ width: `${c.porcentaje}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Seccion titulo="Detalle" cuenta={delMes.length}>
        {delMes.length === 0 ? (
          <div className="py-10 text-center text-sm text-subdued">
            No hay gastos registrados en {nombreMes(mes)}.{" "}
            <Link href="/costos/gastos/nuevo" className="font-semibold text-brand-ink hover:underline">
              Registrar el primero
            </Link>
          </div>
        ) : (
          <ul className="divide-y divide-line">
            {delMes.map((g) => (
              <li key={g.id} className="flex items-start justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold">
                    {g.categoria}
                    {g.descripcion && <span className="font-normal text-subdued"> · {g.descripcion}</span>}
                  </p>
                  <p className="mt-0.5 text-xs text-muted">
                    <span className="first-letter:uppercase">{fechaCorta(g.fecha)}</span>
                    {g.comprobante && ` · Comprobante ${g.comprobante}`}
                    {g.user && ` · ${g.user.nombre}`}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <span className="text-sm font-bold tabular-nums">{formatBs(g.monto)}</span>
                  <BorrarGasto id={g.id} descripcion={`${g.categoria} de ${formatBs(g.monto)}`} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </Seccion>
    </div>
  )
}
