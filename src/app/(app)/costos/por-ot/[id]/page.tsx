import { formatBs } from "@/lib/formato"
import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Banknote, Scale } from "lucide-react"
import Link from "next/link"
import { asignarCostosPorOrden, costoPor100kg as calcCostoPor100kg, kgBuenosFinales, kgEntradaInicial, rendimientoOrden } from "@/lib/costos"
import { notFound } from "next/navigation"

export const dynamic = "force-dynamic"

export default async function DetalleCostoOtPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const ot = await prisma.ordenTrabajo.findUnique({
    where: { id },
    include: {
      cliente: true,
      registros: {
        include: { user: true },
        orderBy: { createdAt: "asc" },
      },
    },
  })

  if (!ot) notFound()

  const kgBuenos = kgBuenosFinales(ot.registros)
  const kgMerma = ot.registros.reduce((sum, r) => sum + Number(r.kgMerma), 0)
  const kgRechazado = ot.registros.reduce((sum, r) => sum + Number(r.kgRechazado), 0)
  const desperdicioTotal = kgMerma + kgRechazado
  const rendimiento = rendimientoOrden(ot.registros)

  const asignado = (await asignarCostosPorOrden()).get(ot.id)
  const manoObra = asignado?.manoObra ?? 0
  const energia = asignado?.energia ?? 0
  const materiaPrima = asignado?.materiaPrima ?? 0
  const tintas = asignado?.tintas ?? 0
  const sinVales = (asignado?.vales ?? 0) === 0

  const costoTotalOperativo = manoObra + energia + materiaPrima + tintas
  const costoPor100kg = calcCostoPor100kg(costoTotalOperativo, kgBuenos)
  const costoPorKg = kgBuenos > 0 ? costoTotalOperativo / kgBuenos : 0

  const precioVentaKg = Number(ot.precioUnitario)
  const margenOperativoPorKg = precioVentaKg - costoPorKg

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/costos/por-ot">
            <Button variant="ghost" size="sm" className="h-9 w-9 p-0 rounded-lg">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-info bg-info/10 px-2 py-0.5 rounded-md border border-info/30">
                OT #{ot.numero}
              </span>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-fg">
                {ot.producto}
              </h1>
            </div>
            <p className="text-xs text-subdued">
              Cliente: <strong>{ot.cliente.nombre}</strong> • Pedido: {Number(ot.kgPedidos).toFixed(2)} kg
            </p>
          </div>
        </div>

        <Link href={`/produccion/ordenes/${ot.id}`}>
          <Button variant="outline" size="sm" className="text-xs">
            Ver Orden de Trabajo
          </Button>
        </Link>
      </div>

      {/* Main Highlights Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl border border-info/30 bg-info/10 shadow-xs">
          <div className="text-[11px] font-semibold text-info ">
            Costo x 100 kg
          </div>
          <div className="mt-1 text-2xl sm:text-3xl font-extrabold text-info tabular-nums">
            {formatBs(costoPor100kg)}
          </div>
          <div className="mt-1 text-[11px] text-info">Conversión industrial</div>
        </div>

        <div className="p-3.5 rounded-xl border border-line bg-card shadow-xs">
          <div className="text-[11px] font-medium text-subdued">Costo Directo Total</div>
          <div className="mt-1 text-2xl font-bold text-fg tabular-nums">
            {formatBs(costoTotalOperativo)}
          </div>
          <div className="mt-1 text-[11px] text-muted">MO + Electricidad</div>
        </div>

        <div className="p-3.5 rounded-xl border border-line bg-card shadow-xs">
          <div className="text-[11px] font-medium text-subdued">Producción Útil</div>
          <div className="mt-1 text-2xl font-bold text-accent tabular-nums">
            {kgBuenos.toFixed(2)} kg
          </div>
          <div className="mt-1 text-[11px] text-muted">{rendimiento.toFixed(1)}% rendimiento</div>
        </div>

        <div className="p-3.5 rounded-xl border border-line bg-card shadow-xs">
          <div className="text-[11px] font-medium text-subdued">Precio Venta x kg</div>
          <div className="mt-1 text-2xl font-bold text-fg tabular-nums">
            {formatBs(precioVentaKg)}
          </div>
          <div className="mt-1 text-[11px] text-accent font-semibold">
            Margen operativo: {margenOperativoPorKg >= 0 ? "+" : ""}{formatBs(margenOperativoPorKg)}/kg
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Production Balance Card */}
        <Card className="border-line shadow-sm bg-card">
          <CardHeader className="pb-3 border-b border-line">
            <div className="flex items-center gap-2">
              <Scale className="h-4 w-4 text-info" />
              <CardTitle className="text-base font-semibold text-fg">
                Balance de Masa y Rendimiento
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-4 space-y-3">
            <div className="flex justify-between items-center text-sm py-1 border-b border-line">
              <span className="text-subdued">Materia Prima Alimentada (Entrada):</span>
              <strong className="text-fg font-mono">{kgEntradaInicial(ot.registros).toFixed(2)} kg</strong>
            </div>
            <div className="flex justify-between items-center text-sm py-1 border-b border-line">
              <span className="text-accent font-medium">Bolsas Conformes (Buenos):</span>
              <strong className="text-accent font-mono">{kgBuenos.toFixed(2)} kg</strong>
            </div>
            <div className="flex justify-between items-center text-sm py-1 border-b border-line">
              <span className="text-accent">Merma Recuperable (a molienda):</span>
              <strong className="text-accent font-mono">{kgMerma.toFixed(2)} kg</strong>
            </div>
            <div className="flex justify-between items-center text-sm py-1 border-b border-line">
              <span className="text-danger">Rechazado / Contaminado:</span>
              <strong className="text-danger font-mono">{kgRechazado.toFixed(2)} kg</strong>
            </div>

            <div className="pt-2 flex justify-between items-center text-sm font-bold">
              <span>Eficiencia de Planta:</span>
              <span className="text-accent">{rendimiento.toFixed(1)}%</span>
            </div>
          </CardContent>
        </Card>

        {/* Financial Breakdown Card */}
        <Card className="border-line shadow-sm bg-card">
          <CardHeader className="pb-3 border-b border-line">
            <div className="flex items-center gap-2">
              <Banknote className="h-4 w-4 text-accent" />
              <CardTitle className="text-base font-semibold text-fg">
                Asignación de Costos Directos
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-4 space-y-3">
            <div className="flex justify-between items-center text-sm py-1 border-b border-line">
              <span className="text-subdued">Materia prima (vales de salida):</span>
              <strong className="text-fg font-mono">{formatBs(materiaPrima)}</strong>
            </div>
            <div className="flex justify-between items-center text-sm py-1 border-b border-line">
              <span className="text-subdued">Tintas y solventes:</span>
              <strong className="text-fg font-mono">{formatBs(tintas)}</strong>
            </div>
            <div className="flex justify-between items-center text-sm py-1 border-b border-line">
              <span className="text-subdued">Mano de obra (parte proporcional del turno):</span>
              <strong className="text-fg font-mono">{formatBs(manoObra)}</strong>
            </div>
            <div className="flex justify-between items-center text-sm py-1 border-b border-line">
              <span className="text-subdued">Energía eléctrica (parte proporcional):</span>
              <strong className="text-fg font-mono">{formatBs(energia)}</strong>
            </div>
            <div className="flex justify-between items-center text-sm py-1 border-b border-line">
              <span className="text-fg font-semibold">Costo directo total:</span>
              <strong className="text-fg font-mono">{formatBs(costoTotalOperativo)}</strong>
            </div>

            {sinVales && (
              <p className="rounded-lg bg-warn/10 p-3 text-xs text-warn">
                Esta orden no tiene vales de salida asignados: el costo de materia prima y tintas no está incluido. Al
                registrar una salida de almacén, elige esta OT para que se sume.
              </p>
            )}

            <div className="p-3 rounded-xl bg-elevated border border-line space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-subdued">Costo directo por kg:</span>
                <strong className="text-fg">{formatBs(costoPorKg)} / kg</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-subdued">Precio Facturado por kg:</span>
                <strong className="text-fg">{formatBs(precioVentaKg)} / kg</strong>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Production Shifts History */}
      <Card className="border-line shadow-sm bg-card overflow-hidden">
        <CardHeader className="pb-3 border-b border-line">
          <CardTitle className="text-base font-semibold text-fg">
            Historial de Pesajes & Turnos ({ot.registros.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-line">
            {ot.registros.map((r) => (
              <div key={r.id} className="p-3.5 sm:p-4 hover:bg-elevated/50 transition flex items-center justify-between text-xs">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-fg">{r.area}</span>
                    <span className="px-2 py-0.5 rounded bg-highlight text-subdued font-semibold">
                      Turno {r.turno}
                    </span>
                    <span className="text-muted">
                      {new Date(r.createdAt).toLocaleString("es-BO")}
                    </span>
                  </div>
                  <div className="text-subdued">
                    Operador: <strong className="text-subdued">{r.user.nombre}</strong>
                  </div>
                </div>

                <div className="text-right">
                  <div className="font-bold text-fg">
                    +{Number(r.kgBuenos).toFixed(2)} kg buenos
                  </div>
                  <div className="text-muted">
                    Merma: {Number(r.kgMerma).toFixed(2)} | Rech: {Number(r.kgRechazado).toFixed(2)}
                  </div>
                </div>
              </div>
            ))}

            {ot.registros.length === 0 && (
              <div className="p-8 text-center text-sm text-subdued">
                Sin registros de producción aún
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
