import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  ArrowLeft,
  Flame,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  TrendingDown,
  Recycle,
  Sparkles,
} from "lucide-react"
import Link from "next/link"

export const dynamic = "force-dynamic"

export default async function DesperdicioPage() {
  const ordenes = await prisma.ordenTrabajo.findMany({
    orderBy: { fechaIngreso: "desc" },
    include: {
      cliente: true,
      registros: true,
    },
  })

  // Global totals
  let totalEntradaPlanta = 0
  let totalBuenosPlanta = 0
  let totalMermaPlanta = 0
  let totalRechazadoPlanta = 0

  for (const ot of ordenes) {
    for (const r of ot.registros) {
      totalEntradaPlanta += Number(r.kgEntrada)
      totalBuenosPlanta += Number(r.kgBuenos)
      totalMermaPlanta += Number(r.kgMerma)
      totalRechazadoPlanta += Number(r.kgRechazado)
    }
  }

  const totalDesperdicio = totalMermaPlanta + totalRechazadoPlanta
  const porcentajeGlobal =
    totalEntradaPlanta > 0 ? (totalDesperdicio / totalEntradaPlanta) * 100 : 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/costos">
            <Button variant="ghost" size="sm" className="h-9 w-9 p-0 rounded-lg">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              Desperdicio & Mermas por Área
            </h1>
            <p className="text-xs sm:text-sm text-slate-500">
              Control de merma recuperable para molienda y material rechazado
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`text-xs px-3 py-1 rounded-full font-bold border ${
              porcentajeGlobal <= 5
                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                : porcentajeGlobal <= 8
                ? "bg-amber-50 text-amber-800 border-amber-200"
                : "bg-rose-50 text-rose-800 border-rose-200"
            }`}
          >
            Promedio Planta: {porcentajeGlobal.toFixed(1)}% Desperdicio
          </span>
        </div>
      </div>

      {/* Global Plant Scrap KPI Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl border border-slate-200/90 bg-white shadow-xs">
          <div className="text-[11px] font-medium text-slate-500">Materia Prima Ingresada</div>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-2xl font-bold text-slate-900 tabular-nums">
              {totalEntradaPlanta.toLocaleString("es-BO", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
            </span>
            <span className="text-xs font-medium text-slate-500">kg</span>
          </div>
          <div className="mt-1 text-[11px] text-slate-400">Total a máquinas</div>
        </div>

        <div className="p-3.5 rounded-xl border border-slate-200/90 bg-white shadow-xs">
          <div className="text-[11px] font-medium text-slate-500">Producto Conforme (Buenos)</div>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-2xl font-bold text-emerald-700 tabular-nums">
              {totalBuenosPlanta.toLocaleString("es-BO", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
            </span>
            <span className="text-xs font-medium text-slate-500">kg</span>
          </div>
          <div className="mt-1 text-[11px] text-slate-400">
            {totalEntradaPlanta > 0 ? ((totalBuenosPlanta / totalEntradaPlanta) * 100).toFixed(1) : 0}% rendimiento
          </div>
        </div>

        <div className="p-3.5 rounded-xl border border-slate-200/90 bg-white shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-500">Merma Recuperable</span>
            <Recycle className="h-3.5 w-3.5 text-teal-600" />
          </div>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-2xl font-bold text-teal-700 tabular-nums">
              {totalMermaPlanta.toLocaleString("es-BO", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
            </span>
            <span className="text-xs font-medium text-slate-500">kg</span>
          </div>
          <div className="mt-1 text-[11px] text-teal-600 font-medium">Reutilizable en molino</div>
        </div>

        <div className="p-3.5 rounded-xl border border-slate-200/90 bg-white shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-500">Rechazo / Contaminado</span>
            <Flame className="h-3.5 w-3.5 text-rose-500" />
          </div>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-2xl font-bold text-rose-600 tabular-nums">
              {totalRechazadoPlanta.toLocaleString("es-BO", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
            </span>
            <span className="text-xs font-medium text-slate-500">kg</span>
          </div>
          <div className="mt-1 text-[11px] text-rose-600 font-medium">Pérdida no recuperable</div>
        </div>
      </div>

      {/* Orders Scrap Breakdown */}
      <Card className="border-slate-200/90 shadow-sm bg-white overflow-hidden">
        <CardHeader className="pb-3 border-b border-slate-100">
          <CardTitle className="text-base font-semibold text-slate-900">
            Desperdicio Detallado por Orden de Trabajo
          </CardTitle>
          <p className="text-xs text-slate-500">
            Comparativa de pérdida en Extrusión, Impresión y Confección
          </p>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-slate-100">
            {ordenes.map((ot) => {
              const porArea = {
                EXTRUSION: { entrada: 0, buenos: 0, merma: 0, rechazado: 0 },
                IMPRESION: { entrada: 0, buenos: 0, merma: 0, rechazado: 0 },
                CONFECCION: { entrada: 0, buenos: 0, merma: 0, rechazado: 0 },
              }

              for (const r of ot.registros) {
                const a = r.area as keyof typeof porArea
                if (porArea[a]) {
                  porArea[a].entrada += Number(r.kgEntrada)
                  porArea[a].buenos += Number(r.kgBuenos)
                  porArea[a].merma += Number(r.kgMerma)
                  porArea[a].rechazado += Number(r.kgRechazado)
                }
              }

              const otTotalEntrada =
                porArea.EXTRUSION.entrada +
                porArea.IMPRESION.entrada +
                porArea.CONFECCION.entrada
              const otTotalDesp =
                porArea.EXTRUSION.merma +
                porArea.EXTRUSION.rechazado +
                porArea.IMPRESION.merma +
                porArea.IMPRESION.rechazado +
                porArea.CONFECCION.merma +
                porArea.CONFECCION.rechazado

              const pctTotal =
                otTotalEntrada > 0 ? (otTotalDesp / otTotalEntrada) * 100 : 0

              const isAlarm = pctTotal > 8

              return (
                <div key={ot.id} className="p-4 space-y-3 hover:bg-slate-50/50 transition">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded-md border border-sky-200">
                          OT #{ot.numero}
                        </span>
                        <h3 className="text-sm font-bold text-slate-900">
                          {ot.producto}
                        </h3>
                        {ot.medida && (
                          <span className="text-xs text-slate-500">
                            ({ot.medida})
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Cliente: <strong>{ot.cliente.nombre}</strong> • Pedido: {Number(ot.kgPedidos).toFixed(2)} kg
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <div
                          className={`text-sm font-bold tabular-nums ${
                            isAlarm ? "text-rose-600" : "text-slate-800"
                          }`}
                        >
                          {otTotalDesp.toFixed(2)} kg ({pctTotal.toFixed(1)}%)
                        </div>
                        <div className="text-[11px] text-slate-400">Total desperdicio</div>
                      </div>

                      <Link href={`/costos/por-ot/${ot.id}`}>
                        <Button variant="ghost" size="sm" className="h-8 text-xs text-sky-600 hover:text-sky-700">
                          Detalle <ChevronRight className="h-3.5 w-3.5 ml-1" />
                        </Button>
                      </Link>
                    </div>
                  </div>

                  {/* 3 Area Cards Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                    {(
                      [
                        { area: "EXTRUSION", label: "Extrusión", color: "amber" },
                        { area: "IMPRESION", label: "Impresión Flexo", color: "blue" },
                        { area: "CONFECCION", label: "Confección / Corte", color: "emerald" },
                      ] as const
                    ).map(({ area, label, color }) => {
                      const d = porArea[area]
                      const despArea = d.merma + d.rechazado
                      const pctArea = d.entrada > 0 ? (despArea / d.entrada) * 100 : 0

                      return (
                        <div
                          key={area}
                          className="p-3 rounded-xl border border-slate-200 bg-white space-y-1.5 shadow-2xs"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-800">{label}</span>
                            <span
                              className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                                pctArea <= 5
                                  ? "bg-emerald-50 text-emerald-700"
                                  : pctArea <= 8
                                  ? "bg-amber-50 text-amber-700"
                                  : "bg-rose-50 text-rose-700"
                              }`}
                            >
                              {pctArea.toFixed(1)}%
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-1 text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                            <div>
                              Ent: <strong className="text-slate-700">{d.entrada.toFixed(1)}</strong>
                            </div>
                            <div>
                              Buen: <strong className="text-emerald-700">{d.buenos.toFixed(1)}</strong>
                            </div>
                            <div>
                              Merm: <strong className="text-teal-700">{d.merma.toFixed(1)}</strong>
                            </div>
                            <div>
                              Rech: <strong className="text-rose-600">{d.rechazado.toFixed(1)}</strong>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}

            {ordenes.length === 0 && (
              <div className="p-8 text-center text-sm text-slate-500">
                No hay órdenes de trabajo con registros de producción
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
