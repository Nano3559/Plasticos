import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Flame, ChevronRight, Recycle } from "lucide-react"
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
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-fg">
              Desperdicio & Mermas por Área
            </h1>
            <p className="text-xs sm:text-sm text-subdued">
              Control de merma recuperable para molienda y material rechazado
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`text-xs px-3 py-1 rounded-full font-bold border ${
 porcentajeGlobal <= 5
 ? "bg-accent/10 text-accent border-accent/30"
 : porcentajeGlobal <= 8
 ? "bg-warn/10 text-warn border-warn/30"
 : "bg-danger/10 text-danger border-danger/30"
 }`}
          >
            Promedio Planta: {porcentajeGlobal.toFixed(1)}% Desperdicio
          </span>
        </div>
      </div>

      {/* Global Plant Scrap KPI Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl border border-line bg-card shadow-xs">
          <div className="text-[11px] font-medium text-subdued">Materia Prima Ingresada</div>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-2xl font-bold text-fg tabular-nums">
              {totalEntradaPlanta.toLocaleString("es-BO", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
            </span>
            <span className="text-xs font-medium text-subdued">kg</span>
          </div>
          <div className="mt-1 text-[11px] text-muted">Total a máquinas</div>
        </div>

        <div className="p-3.5 rounded-xl border border-line bg-card shadow-xs">
          <div className="text-[11px] font-medium text-subdued">Producto Conforme (Buenos)</div>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-2xl font-bold text-accent tabular-nums">
              {totalBuenosPlanta.toLocaleString("es-BO", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
            </span>
            <span className="text-xs font-medium text-subdued">kg</span>
          </div>
          <div className="mt-1 text-[11px] text-muted">
            {totalEntradaPlanta > 0 ? ((totalBuenosPlanta / totalEntradaPlanta) * 100).toFixed(1) : 0}% rendimiento
          </div>
        </div>

        <div className="p-3.5 rounded-xl border border-line bg-card shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-subdued">Merma Recuperable</span>
            <Recycle className="h-3.5 w-3.5 text-accent" />
          </div>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-2xl font-bold text-accent tabular-nums">
              {totalMermaPlanta.toLocaleString("es-BO", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
            </span>
            <span className="text-xs font-medium text-subdued">kg</span>
          </div>
          <div className="mt-1 text-[11px] text-accent font-medium">Reutilizable en molino</div>
        </div>

        <div className="p-3.5 rounded-xl border border-line bg-card shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-subdued">Rechazo / Contaminado</span>
            <Flame className="h-3.5 w-3.5 text-danger" />
          </div>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-2xl font-bold text-danger tabular-nums">
              {totalRechazadoPlanta.toLocaleString("es-BO", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
            </span>
            <span className="text-xs font-medium text-subdued">kg</span>
          </div>
          <div className="mt-1 text-[11px] text-danger font-medium">Pérdida no recuperable</div>
        </div>
      </div>

      {/* Orders Scrap Breakdown */}
      <Card className="border-line shadow-sm bg-card overflow-hidden">
        <CardHeader className="pb-3 border-b border-line">
          <CardTitle className="text-base font-semibold text-fg">
            Desperdicio Detallado por Orden de Trabajo
          </CardTitle>
          <p className="text-xs text-subdued">
            Comparativa de pérdida en Extrusión, Impresión y Confección
          </p>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-line">
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
                <div key={ot.id} className="p-4 space-y-3 hover:bg-elevated/50 transition">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-info bg-info/10 px-2 py-0.5 rounded-md border border-info/30">
                          OT #{ot.numero}
                        </span>
                        <h3 className="text-sm font-bold text-fg">
                          {ot.producto}
                        </h3>
                        {ot.medida && (
                          <span className="text-xs text-subdued">
                            ({ot.medida})
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-subdued mt-0.5">
                        Cliente: <strong>{ot.cliente.nombre}</strong> • Pedido: {Number(ot.kgPedidos).toFixed(2)} kg
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <div
                          className={`text-sm font-bold tabular-nums ${
 isAlarm ? "text-danger" : "text-fg"
 }`}
                        >
                          {otTotalDesp.toFixed(2)} kg ({pctTotal.toFixed(1)}%)
                        </div>
                        <div className="text-[11px] text-muted">Total desperdicio</div>
                      </div>

                      <Link href={`/costos/por-ot/${ot.id}`}>
                        <Button variant="ghost" size="sm" className="h-8 text-xs text-info hover:text-info">
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
                          className="p-3 rounded-xl border border-line bg-card space-y-1.5 shadow-2xs"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-fg">{label}</span>
                            <span
                              className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
 pctArea <= 5
 ? "bg-accent/10 text-accent"
 : pctArea <= 8
 ? "bg-warn/10 text-warn"
 : "bg-danger/10 text-danger"
 }`}
                            >
                              {pctArea.toFixed(1)}%
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-1 text-[11px] text-subdued pt-1 border-t border-line">
                            <div>
                              Ent: <strong className="text-subdued">{d.entrada.toFixed(1)}</strong>
                            </div>
                            <div>
                              Buen: <strong className="text-accent">{d.buenos.toFixed(1)}</strong>
                            </div>
                            <div>
                              Merm: <strong className="text-accent">{d.merma.toFixed(1)}</strong>
                            </div>
                            <div>
                              Rech: <strong className="text-danger">{d.rechazado.toFixed(1)}</strong>
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
              <div className="p-8 text-center text-sm text-subdued">
                No hay órdenes de trabajo con registros de producción
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
