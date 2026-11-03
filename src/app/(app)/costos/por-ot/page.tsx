import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft, BarChart3, ChevronRight, Scale, TrendingDown, DollarSign } from "lucide-react"
import Link from "next/link"

export const dynamic = "force-dynamic"

export default async function CostoPorOtPage() {
  const ordenes = await prisma.ordenTrabajo.findMany({
    orderBy: { fechaIngreso: "desc" },
    include: {
      cliente: true,
      registros: true,
    },
  })

  // Pre-fetch all costos de turno to compute cost per 100 kg
  const costosTurnos = await prisma.costoTurno.findMany()
  const costosMap = new Map<string, number>()
  for (const c of costosTurnos) {
    const key = `${c.turno}|${c.fecha.toISOString().split("T")[0]}`
    costosMap.set(key, Number(c.manoObra) + Number(c.energia))
  }

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
              Costo Unitario por 100 kg
            </h1>
            <p className="text-xs sm:text-sm text-slate-500">
              Costeo individual por orden de trabajo y margen operativo
            </p>
          </div>
        </div>

        <Link href="/produccion/ordenes">
          <Button variant="outline" size="sm" className="text-xs">
            Ver todas las OTs
          </Button>
        </Link>
      </div>

      <Card className="border-slate-200/90 shadow-sm bg-white overflow-hidden">
        <CardHeader className="pb-3 border-b border-slate-100">
          <CardTitle className="text-base font-semibold text-slate-900">
            Órdenes de Trabajo Valoradas
          </CardTitle>
          <p className="text-xs text-slate-500">
            Haz clic en una orden para ver la planilla de costos y desglose de insumos
          </p>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-slate-100">
            {ordenes.map((ot) => {
              const kgBuenos = ot.registros.reduce((sum, r) => sum + Number(r.kgBuenos), 0)
              const kgMerma = ot.registros.reduce((sum, r) => sum + Number(r.kgMerma), 0)
              const kgRechazado = ot.registros.reduce((sum, r) => sum + Number(r.kgRechazado), 0)
              const kgEntrada = ot.registros.reduce((sum, r) => sum + Number(r.kgEntrada), 0)

              // Cost allocation for this OT
              const turnosUnicos = [
                ...new Set(ot.registros.map((r) => `${r.turno}|${r.createdAt.toISOString().split("T")[0]}`)),
              ]
              let costoAsignado = 0
              for (const t of turnosUnicos) {
                costoAsignado += costosMap.get(t) || 0
              }

              const costo100kg = kgBuenos > 0 ? (costoAsignado / kgBuenos) * 100 : 0
              const rendimiento = kgEntrada > 0 ? (kgBuenos / kgEntrada) * 100 : 0

              return (
                <Link
                  key={ot.id}
                  href={`/costos/por-ot/${ot.id}`}
                  className="group block p-4 hover:bg-slate-50/70 transition space-y-2"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded-md border border-sky-200">
                          OT #{ot.numero}
                        </span>
                        <h3 className="text-sm font-bold text-slate-900 group-hover:text-sky-600 transition">
                          {ot.producto} {ot.medida && `(${ot.medida})`}
                        </h3>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            ot.estado === "ENTREGADA"
                              ? "bg-slate-100 text-slate-600"
                              : ot.estado === "EN_PROCESO"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-amber-50 text-amber-700 border border-amber-200"
                          }`}
                        >
                          {ot.estado}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Cliente: <strong>{ot.cliente.nombre}</strong> • Pedido: {Number(ot.kgPedidos).toFixed(2)} kg @ Bs. {Number(ot.precioUnitario).toFixed(2)}/kg
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="text-base font-extrabold text-slate-900 tabular-nums">
                          {costo100kg > 0 ? `Bs. ${costo100kg.toFixed(2)}` : "Sin costo asignado"}
                        </div>
                        <div className="text-[11px] text-slate-400">Costo / 100 kg</div>
                      </div>

                      <ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-slate-600 group-hover:translate-x-1 transition" />
                    </div>
                  </div>

                  {/* Production Metrics Strip */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs pt-1 border-t border-slate-100 text-slate-600">
                    <div>
                      Buenos: <strong className="text-emerald-700 font-bold">{kgBuenos.toFixed(2)} kg</strong>
                    </div>
                    <div>
                      Merma: <strong className="text-teal-700">{kgMerma.toFixed(2)} kg</strong>
                    </div>
                    <div>
                      Rechazo: <strong className="text-rose-600">{kgRechazado.toFixed(2)} kg</strong>
                    </div>
                    <div>
                      Rendimiento: <strong className="text-slate-900">{rendimiento.toFixed(1)}%</strong>
                    </div>
                  </div>
                </Link>
              )
            })}

            {ordenes.length === 0 && (
              <div className="p-8 text-center text-sm text-slate-500">
                No hay órdenes de trabajo registradas
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
