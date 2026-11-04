import { EstadoOrden } from "@/components/ui/estado-orden"
import { formatBs } from "@/lib/formato"
import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft, ChevronRight } from "lucide-react"
import Link from "next/link"
import { asignarCostosPorOrden, costoPor100kg, kgBuenosFinales, rendimientoOrden } from "@/lib/costos"

export const dynamic = "force-dynamic"

export default async function CostoPorOtPage() {
  const ordenes = await prisma.ordenTrabajo.findMany({
    orderBy: { fechaIngreso: "desc" },
    include: {
      cliente: true,
      registros: true,
    },
  })

  const costosAsignados = await asignarCostosPorOrden()

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
              Costo Unitario por 100 kg
            </h1>
            <p className="text-xs sm:text-sm text-subdued">
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

      <Card className="border-line shadow-sm bg-card overflow-hidden">
        <CardHeader className="pb-3 border-b border-line">
          <CardTitle className="text-base font-semibold text-fg">
            Órdenes de Trabajo Valoradas
          </CardTitle>
          <p className="text-xs text-subdued">
            Haz clic en una orden para ver la planilla de costos y desglose de insumos
          </p>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-line">
            {ordenes.map((ot) => {
              const kgBuenos = kgBuenosFinales(ot.registros)
              const kgMerma = ot.registros.reduce((sum, r) => sum + Number(r.kgMerma), 0)
              const kgRechazado = ot.registros.reduce((sum, r) => sum + Number(r.kgRechazado), 0)

              const costoAsignado = costosAsignados.get(ot.id)?.total ?? 0

              const costo100kg = costoPor100kg(costoAsignado, kgBuenos)
              const rendimiento = rendimientoOrden(ot.registros)

              return (
                <Link
                  key={ot.id}
                  href={`/costos/por-ot/${ot.id}`}
                  className="group block p-4 hover:bg-elevated/70 transition space-y-2"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-info bg-info/10 px-2 py-0.5 rounded-md border border-info/30">
                          OT #{ot.numero}
                        </span>
                        <h3 className="text-sm font-bold text-fg group-hover:text-info transition">
                          {ot.producto} {ot.medida && `(${ot.medida})`}
                        </h3>
                        <EstadoOrden estado={ot.estado} />
                      </div>
                      <p className="text-xs text-subdued mt-0.5">
                        Cliente: <strong>{ot.cliente.nombre}</strong> • Pedido: {Number(ot.kgPedidos).toFixed(2)} kg @ {formatBs(Number(ot.precioUnitario))}/kg
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="text-base font-extrabold text-fg tabular-nums">
                          {costo100kg > 0 ? formatBs(costo100kg) : "Sin costo asignado"}
                        </div>
                        <div className="text-[11px] text-muted">Costo / 100 kg</div>
                      </div>

                      <ChevronRight className="h-5 w-5 text-subdued group-hover:text-subdued group-hover:translate-x-1 transition" />
                    </div>
                  </div>

                  {/* Production Metrics Strip */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs pt-1 border-t border-line text-subdued">
                    <div>
                      Buenos: <strong className="text-accent font-bold">{kgBuenos.toFixed(2)} kg</strong>
                    </div>
                    <div>
                      Merma: <strong className="text-accent">{kgMerma.toFixed(2)} kg</strong>
                    </div>
                    <div>
                      Rechazo: <strong className="text-danger">{kgRechazado.toFixed(2)} kg</strong>
                    </div>
                    <div>
                      Rendimiento: <strong className="text-fg">{rendimiento.toFixed(1)}%</strong>
                    </div>
                  </div>
                </Link>
              )
            })}

            {ordenes.length === 0 && (
              <div className="p-8 text-center text-sm text-subdued">
                No hay órdenes de trabajo registradas
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
