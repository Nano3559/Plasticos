import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  ArrowLeft,
  DollarSign,
  TrendingUp,
  Scale,
  Zap,
  Users,
  Clock,
  Layers,
  Recycle,
  Flame,
} from "lucide-react"
import Link from "next/link"
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

  const kgBuenos = ot.registros.reduce((sum, r) => sum + Number(r.kgBuenos), 0)
  const kgMerma = ot.registros.reduce((sum, r) => sum + Number(r.kgMerma), 0)
  const kgRechazado = ot.registros.reduce((sum, r) => sum + Number(r.kgRechazado), 0)
  const kgEntrada = ot.registros.reduce((sum, r) => sum + Number(r.kgEntrada), 0)
  const desperdicioTotal = kgMerma + kgRechazado
  const rendimiento = kgEntrada > 0 ? (kgBuenos / kgEntrada) * 100 : 0

  // Turnos allocation
  const turnos = [
    ...new Set(ot.registros.map((r) => `${r.turno}|${r.createdAt.toISOString().split("T")[0]}`)),
  ]

  let manoObra = 0
  let energia = 0
  for (const t of turnos) {
    const [turno, fecha] = t.split("|")
    const costo = await prisma.costoTurno.findUnique({
      where: { fecha_turno: { fecha: new Date(fecha), turno: turno as any } },
    })
    if (costo) {
      manoObra += Number(costo.manoObra)
      energia += Number(costo.energia)
    }
  }

  const costoTotalOperativo = manoObra + energia
  const costoPor100kg = kgBuenos > 0 ? (costoTotalOperativo / kgBuenos) * 100 : 0
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
              <span className="text-xs font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded-md border border-sky-200">
                OT #{ot.numero}
              </span>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                {ot.producto}
              </h1>
            </div>
            <p className="text-xs text-slate-500">
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
        <div className="p-3.5 rounded-xl border border-sky-200/90 bg-sky-50/50 shadow-xs">
          <div className="text-[11px] font-semibold text-sky-800 uppercase tracking-wide">
            Costo x 100 kg
          </div>
          <div className="mt-1 text-2xl sm:text-3xl font-extrabold text-sky-950 tabular-nums">
            Bs. {costoPor100kg.toFixed(2)}
          </div>
          <div className="mt-1 text-[11px] text-sky-700">Conversión industrial</div>
        </div>

        <div className="p-3.5 rounded-xl border border-slate-200/90 bg-white shadow-xs">
          <div className="text-[11px] font-medium text-slate-500">Costo Directo Total</div>
          <div className="mt-1 text-2xl font-bold text-slate-900 tabular-nums">
            Bs. {costoTotalOperativo.toFixed(2)}
          </div>
          <div className="mt-1 text-[11px] text-slate-400">MO + Electricidad</div>
        </div>

        <div className="p-3.5 rounded-xl border border-slate-200/90 bg-white shadow-xs">
          <div className="text-[11px] font-medium text-slate-500">Producción Útil</div>
          <div className="mt-1 text-2xl font-bold text-emerald-700 tabular-nums">
            {kgBuenos.toFixed(2)} kg
          </div>
          <div className="mt-1 text-[11px] text-slate-400">{rendimiento.toFixed(1)}% rendimiento</div>
        </div>

        <div className="p-3.5 rounded-xl border border-slate-200/90 bg-white shadow-xs">
          <div className="text-[11px] font-medium text-slate-500">Precio Venta x kg</div>
          <div className="mt-1 text-2xl font-bold text-slate-900 tabular-nums">
            Bs. {precioVentaKg.toFixed(2)}
          </div>
          <div className="mt-1 text-[11px] text-emerald-700 font-semibold">
            Margen op: +Bs. {margenOperativoPorKg.toFixed(2)}/kg
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Production Balance Card */}
        <Card className="border-slate-200/90 shadow-sm bg-white">
          <CardHeader className="pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Scale className="h-4 w-4 text-sky-600" />
              <CardTitle className="text-base font-semibold text-slate-900">
                Balance de Masa y Rendimiento
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-4 space-y-3">
            <div className="flex justify-between items-center text-sm py-1 border-b border-slate-100">
              <span className="text-slate-600">Materia Prima Alimentada (Entrada):</span>
              <strong className="text-slate-900 font-mono">{kgEntrada.toFixed(2)} kg</strong>
            </div>
            <div className="flex justify-between items-center text-sm py-1 border-b border-slate-100">
              <span className="text-emerald-700 font-medium">Bolsas Conformes (Buenos):</span>
              <strong className="text-emerald-700 font-mono">{kgBuenos.toFixed(2)} kg</strong>
            </div>
            <div className="flex justify-between items-center text-sm py-1 border-b border-slate-100">
              <span className="text-teal-700">Merma Recuperable (a molienda):</span>
              <strong className="text-teal-700 font-mono">{kgMerma.toFixed(2)} kg</strong>
            </div>
            <div className="flex justify-between items-center text-sm py-1 border-b border-slate-100">
              <span className="text-rose-600">Rechazado / Contaminado:</span>
              <strong className="text-rose-600 font-mono">{kgRechazado.toFixed(2)} kg</strong>
            </div>

            <div className="pt-2 flex justify-between items-center text-sm font-bold">
              <span>Eficiencia de Planta:</span>
              <span className="text-emerald-700">{rendimiento.toFixed(1)}%</span>
            </div>
          </CardContent>
        </Card>

        {/* Financial Breakdown Card */}
        <Card className="border-slate-200/90 shadow-sm bg-white">
          <CardHeader className="pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-emerald-600" />
              <CardTitle className="text-base font-semibold text-slate-900">
                Asignación de Costos Directos
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-4 space-y-3">
            <div className="flex justify-between items-center text-sm py-1 border-b border-slate-100">
              <span className="text-slate-600">Mano de Obra Turnos Involucrados:</span>
              <strong className="text-slate-900 font-mono">Bs. {manoObra.toFixed(2)}</strong>
            </div>
            <div className="flex justify-between items-center text-sm py-1 border-b border-slate-100">
              <span className="text-slate-600">Energía Eléctrica Asignada:</span>
              <strong className="text-slate-900 font-mono">Bs. {energia.toFixed(2)}</strong>
            </div>
            <div className="flex justify-between items-center text-sm py-1 border-b border-slate-100">
              <span className="text-slate-900 font-semibold">Costo Total Conversión:</span>
              <strong className="text-slate-900 font-mono">Bs. {costoTotalOperativo.toFixed(2)}</strong>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Costo Operativo por kg:</span>
                <strong className="text-slate-800">Bs. {costoPorKg.toFixed(2)} / kg</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Precio Facturado por kg:</span>
                <strong className="text-slate-800">Bs. {precioVentaKg.toFixed(2)} / kg</strong>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Production Shifts History */}
      <Card className="border-slate-200/90 shadow-sm bg-white overflow-hidden">
        <CardHeader className="pb-3 border-b border-slate-100">
          <CardTitle className="text-base font-semibold text-slate-900">
            Historial de Pesajes & Turnos ({ot.registros.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-slate-100">
            {ot.registros.map((r) => (
              <div key={r.id} className="p-3.5 sm:p-4 hover:bg-slate-50/50 transition flex items-center justify-between text-xs">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900">{r.area}</span>
                    <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold">
                      Turno {r.turno}
                    </span>
                    <span className="text-slate-400">
                      {new Date(r.createdAt).toLocaleString("es-BO")}
                    </span>
                  </div>
                  <div className="text-slate-500">
                    Operador: <strong className="text-slate-700">{r.user.nombre}</strong>
                  </div>
                </div>

                <div className="text-right">
                  <div className="font-bold text-slate-900">
                    +{Number(r.kgBuenos).toFixed(2)} kg buenos
                  </div>
                  <div className="text-slate-400">
                    Merma: {Number(r.kgMerma).toFixed(2)} | Rech: {Number(r.kgRechazado).toFixed(2)}
                  </div>
                </div>
              </div>
            ))}

            {ot.registros.length === 0 && (
              <div className="p-8 text-center text-sm text-slate-500">
                Sin registros de producción aún
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
