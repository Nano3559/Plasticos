import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import {
  Calculator,
  Plus,
  BarChart3,
  FileText,
  Zap,
  Users,
  TrendingDown,
  ArrowRight,
  Calendar,
  Layers,
  Scale,
} from "lucide-react"

export const dynamic = "force-dynamic"

export default async function CostosPage() {
  const session = await auth()
  const rol = (session?.user as any)?.rol

  const canManage = rol === "ADMIN" || rol === "GERENCIA"

  const [costosTurno, registrosProd] = await Promise.all([
    prisma.costoTurno.findMany({
      orderBy: [{ fecha: "desc" }, { turno: "asc" }],
      take: 12,
    }),
    prisma.registroProduccion.findMany({
      select: {
        kgBuenos: true,
        kgMerma: true,
        kgRechazado: true,
      },
    }),
  ])

  const totalMO = costosTurno.reduce((s, c) => s + Number(c.manoObra), 0)
  const totalEnergia = costosTurno.reduce((s, c) => s + Number(c.energia), 0)
  const totalCostosOperativos = totalMO + totalEnergia

  const totalKgBuenos = registrosProd.reduce((s, r) => s + Number(r.kgBuenos), 0)
  const totalKgDesperdicio = registrosProd.reduce(
    (s, r) => s + Number(r.kgMerma) + Number(r.kgRechazado),
    0
  )

  const costoPor100kgPromedio =
    totalKgBuenos > 0 ? (totalCostosOperativos / totalKgBuenos) * 100 : 0

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              Control de Costos & Rendimiento
            </h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-slate-100 text-slate-700 border border-slate-200">
              MO & Energía
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500">
            Fórmula de costo industrial por 100 kg, mano de obra, energía eléctrica y merma
          </p>
        </div>

        {canManage && (
          <div className="flex items-center gap-2">
            <Link href="/costos/turno">
              <Button size="sm" className="bg-slate-900 hover:bg-slate-800 text-white gap-1.5 shadow-sm">
                <Plus className="h-4 w-4" />
                <span>Registrar Turno</span>
              </Button>
            </Link>
          </div>
        )}
      </div>

      {/* Formula Explanatory Hero Card */}
      <div className="rounded-2xl border border-sky-200/90 bg-gradient-to-r from-sky-50 via-white to-teal-50 p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-sky-600 text-white">
                <Calculator className="h-4 w-4" />
              </div>
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                Fórmula Estándar de Planta
              </h2>
            </div>
            <p className="text-xs text-slate-600">
              Costo Unitario de Conversión x 100 kg producidos (excluye resina neta):
            </p>
            <div className="inline-block px-3 py-1.5 rounded-lg bg-white border border-sky-200 font-mono text-xs sm:text-sm font-bold text-slate-800 shadow-xs">
              Costo/100kg = ((Mano de Obra + Energía Eléctrica) / kg Buenos) × 100
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-white/90 border border-sky-100 shadow-xs text-right">
            <div className="text-[11px] font-semibold text-slate-400 uppercase">
              Costo Promedio Actual
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-sky-700 tabular-nums">
              Bs. {costoPor100kgPromedio.toFixed(2)}
            </div>
            <div className="text-[11px] text-slate-500">por cada 100 kg terminados</div>
          </div>
        </div>
      </div>

      {/* KPI Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl border border-slate-200/90 bg-white shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-500">Mano de Obra</span>
            <Users className="h-4 w-4 text-slate-400" />
          </div>
          <div className="mt-1 text-xl sm:text-2xl font-bold text-slate-900 tabular-nums">
            Bs. {totalMO.toLocaleString("es-BO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="mt-1 text-[11px] text-slate-400">Turnos registrados</div>
        </div>

        <div className="p-3.5 rounded-xl border border-slate-200/90 bg-white shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-500">Energía Eléctrica</span>
            <Zap className="h-4 w-4 text-amber-500" />
          </div>
          <div className="mt-1 text-xl sm:text-2xl font-bold text-slate-900 tabular-nums">
            Bs. {totalEnergia.toLocaleString("es-BO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="mt-1 text-[11px] text-slate-400">Consumo industrial</div>
        </div>

        <div className="p-3.5 rounded-xl border border-slate-200/90 bg-white shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-500">Producción Neta</span>
            <Scale className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="mt-1 text-xl sm:text-2xl font-bold text-emerald-700 tabular-nums">
            {totalKgBuenos.toLocaleString("es-BO", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} kg
          </div>
          <div className="mt-1 text-[11px] text-slate-400">Bolsas buenas listas</div>
        </div>

        <div className="p-3.5 rounded-xl border border-slate-200/90 bg-white shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-500">Desperdicio / Merma</span>
            <TrendingDown className="h-4 w-4 text-rose-500" />
          </div>
          <div className="mt-1 text-xl sm:text-2xl font-bold text-rose-600 tabular-nums">
            {totalKgDesperdicio.toLocaleString("es-BO", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} kg
          </div>
          <div className="mt-1 text-[11px] text-slate-400">A reciclado o scrap</div>
        </div>
      </div>

      {/* Quick Navigation Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Link href="/costos/por-ot" className="group">
          <div className="h-full p-4 rounded-xl border border-slate-200/90 bg-white hover:border-sky-300 hover:shadow-md transition space-y-2">
            <div className="flex items-center justify-between">
              <div className="p-2 rounded-lg bg-sky-50 text-sky-700 group-hover:scale-110 transition-transform">
                <BarChart3 className="h-5 w-5" />
              </div>
              <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-sky-600 group-hover:translate-x-1 transition" />
            </div>
            <div>
              <div className="text-sm font-bold text-slate-900 group-hover:text-sky-700">
                Costos por Orden (OT)
              </div>
              <div className="text-xs text-slate-500">
                Análisis individual por pedido, margen y rendimiento por cliente
              </div>
            </div>
          </div>
        </Link>

        <Link href="/costos/desperdicio" className="group">
          <div className="h-full p-4 rounded-xl border border-slate-200/90 bg-white hover:border-amber-300 hover:shadow-md transition space-y-2">
            <div className="flex items-center justify-between">
              <div className="p-2 rounded-lg bg-amber-50 text-amber-700 group-hover:scale-110 transition-transform">
                <FileText className="h-5 w-5" />
              </div>
              <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-amber-600 group-hover:translate-x-1 transition" />
            </div>
            <div>
              <div className="text-sm font-bold text-slate-900 group-hover:text-amber-700">
                Control de Desperdicio
              </div>
              <div className="text-xs text-slate-500">
                Pérdida por área: Extrusión, Impresión y Confección
              </div>
            </div>
          </div>
        </Link>

        <Link href="/costos/turno" className="group">
          <div className="h-full p-4 rounded-xl border border-slate-200/90 bg-white hover:border-emerald-300 hover:shadow-md transition space-y-2">
            <div className="flex items-center justify-between">
              <div className="p-2 rounded-lg bg-emerald-50 text-emerald-700 group-hover:scale-110 transition-transform">
                <Plus className="h-5 w-5" />
              </div>
              <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-1 transition" />
            </div>
            <div>
              <div className="text-sm font-bold text-slate-900 group-hover:text-emerald-700">
                Registrar Turno
              </div>
              <div className="text-xs text-slate-500">
                Ingresar planilla de operarios y medidor eléctrico del turno
              </div>
            </div>
          </div>
        </Link>
      </div>

      {/* Recent Shift Cost Table */}
      <Card className="border-slate-200/90 shadow-sm bg-white overflow-hidden">
        <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold text-slate-900">
              Últimos Costos Asignados por Turno
            </CardTitle>
            <p className="text-xs text-slate-500">
              Planilla de turno y energía registrada
            </p>
          </div>
          {canManage && (
            <Link href="/costos/turno">
              <Button size="sm" variant="outline" className="text-xs">
                + Nuevo Turno
              </Button>
            </Link>
          )}
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-slate-100">
            {costosTurno.map((c) => {
              const total = Number(c.manoObra) + Number(c.energia)
              return (
                <div key={c.id} className="p-3.5 sm:p-4 hover:bg-slate-50/60 transition flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900">
                        {new Date(c.fecha).toLocaleDateString("es-BO", {
                          weekday: "short",
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-md font-semibold bg-slate-100 text-slate-700">
                        Turno {c.turno}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 flex items-center gap-3">
                      <span>Mano de Obra: <strong className="text-slate-700">Bs. {Number(c.manoObra).toFixed(2)}</strong></span>
                      <span>•</span>
                      <span>Energía: <strong className="text-slate-700">Bs. {Number(c.energia).toFixed(2)}</strong></span>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-sm font-bold text-slate-900 tabular-nums">
                      Bs. {total.toFixed(2)}
                    </div>
                    <div className="text-[10px] text-slate-400">Total turno</div>
                  </div>
                </div>
              )
            })}

            {costosTurno.length === 0 && (
              <div className="p-8 text-center text-sm text-slate-500">
                No hay turnos de costo registrados todavía. Registra el primero para calcular el costo por 100 kg.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
