import { formatBs } from "@/lib/formato"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { asignarCostosPorOrden, costoPor100kg, kgBuenosFinales } from "@/lib/costos"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Calculator, Plus, BarChart3, FileText, Zap, Users, TrendingDown, ArrowRight, Scale } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function CostosPage() {
  const session = await auth()
  const rol = session?.user?.rol

  const canManage = rol === "ADMIN" || rol === "GERENCIA"

  const [costosTurno, registrosProd] = await Promise.all([
    prisma.costoTurno.findMany({
      orderBy: [{ fecha: "desc" }, { turno: "asc" }],
      take: 12,
    }),
    prisma.registroProduccion.findMany({
      select: {
        ordenId: true,
        area: true,
        kgBuenos: true,
        kgMerma: true,
        kgRechazado: true,
      },
    }),
  ])
  const costosPorOrden = await asignarCostosPorOrden()

  const totalMO = costosTurno.reduce((s, c) => s + Number(c.manoObra), 0)
  const totalEnergia = costosTurno.reduce((s, c) => s + Number(c.energia), 0)
  
  // Producto terminado = kg buenos del último área de cada orden (no la suma de las tres áreas)
  const registrosPorOrden = new Map<string, typeof registrosProd>()
  for (const r of registrosProd) {
    const lista = registrosPorOrden.get(r.ordenId) ?? []
    lista.push(r)
    registrosPorOrden.set(r.ordenId, lista)
  }
  let totalKgBuenos = 0
  let kgConCosto = 0
  let costoDirectoTotal = 0
  for (const [ordenId, regs] of registrosPorOrden) {
    const kg = kgBuenosFinales(regs)
    totalKgBuenos += kg
    const costo = costosPorOrden.get(ordenId)
    if (costo && kg > 0) {
      kgConCosto += kg
      costoDirectoTotal += costo.total
    }
  }
  const totalKgDesperdicio = registrosProd.reduce((s, r) => s + Number(r.kgMerma) + Number(r.kgRechazado), 0)

  // Promedio ponderado de las órdenes que ya tienen costo asignado
  const costoPor100kgPromedio = costoPor100kg(costoDirectoTotal, kgConCosto)

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-fg">
              Control de Costos & Rendimiento
            </h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-highlight text-subdued border border-line">
              MO & Energía
            </span>
          </div>
          <p className="text-xs sm:text-sm text-subdued">
            Fórmula de costo industrial por 100 kg, mano de obra, energía eléctrica y merma
          </p>
        </div>

        {canManage && (
          <div className="flex items-center gap-2">
            <Link href="/costos/turno">
              <Button size="sm" className="gap-1.5 shadow-sm">
                <Plus className="h-4 w-4" />
                <span>Registrar Turno</span>
              </Button>
            </Link>
          </div>
        )}
      </div>

      {/* Formula Explanatory Hero Card */}
      <div className="rounded-2xl border border-info/30 bg-gradient-to-r from-info/10 via-card to-accent/10 p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-brand text-on-brand">
                <Calculator className="h-4 w-4" />
              </div>
              <h2 className="text-sm font-bold text-fg ">
                Fórmula Estándar de Planta
              </h2>
            </div>
            <p className="text-xs text-subdued">
              Costo Unitario de Conversión x 100 kg producidos (excluye resina neta):
            </p>
            <div className="inline-block px-3 py-1.5 rounded-lg bg-card border border-info/30 font-mono text-xs sm:text-sm font-bold text-fg shadow-xs">
              Costo/100kg = ((Mano de Obra + Energía Eléctrica) / kg Buenos) × 100
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-card/90 border border-info/30 shadow-xs text-right">
            <div className="text-[11px] font-semibold text-muted ">
              Costo Promedio Actual
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-info tabular-nums">
              {formatBs(costoPor100kgPromedio)}
            </div>
            <div className="text-[11px] text-subdued">por cada 100 kg terminados</div>
          </div>
        </div>
      </div>

      {/* KPI Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl border border-line bg-card shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-subdued">Mano de Obra</span>
            <Users className="h-4 w-4 text-muted" />
          </div>
          <div className="mt-1 text-xl sm:text-2xl font-bold text-fg tabular-nums">
            {formatBs(totalMO)}
          </div>
          <div className="mt-1 text-[11px] text-muted">Turnos registrados</div>
        </div>

        <div className="p-3.5 rounded-xl border border-line bg-card shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-subdued">Energía Eléctrica</span>
            <Zap className="h-4 w-4 text-warn" />
          </div>
          <div className="mt-1 text-xl sm:text-2xl font-bold text-fg tabular-nums">
            {formatBs(totalEnergia)}
          </div>
          <div className="mt-1 text-[11px] text-muted">Consumo industrial</div>
        </div>

        <div className="p-3.5 rounded-xl border border-line bg-card shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-subdued">Producción Neta</span>
            <Scale className="h-4 w-4 text-accent" />
          </div>
          <div className="mt-1 text-xl sm:text-2xl font-bold text-accent tabular-nums">
            {totalKgBuenos.toLocaleString("es-BO", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} kg
          </div>
          <div className="mt-1 text-[11px] text-muted">Bolsas buenas listas</div>
        </div>

        <div className="p-3.5 rounded-xl border border-line bg-card shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-subdued">Desperdicio / Merma</span>
            <TrendingDown className="h-4 w-4 text-danger" />
          </div>
          <div className="mt-1 text-xl sm:text-2xl font-bold text-danger tabular-nums">
            {totalKgDesperdicio.toLocaleString("es-BO", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} kg
          </div>
          <div className="mt-1 text-[11px] text-muted">A reciclado o scrap</div>
        </div>
      </div>

      {/* Quick Navigation Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Link href="/costos/por-ot" className="group">
          <div className="h-full p-4 rounded-xl border border-line bg-card hover:border-info/30 hover:shadow-md transition space-y-2">
            <div className="flex items-center justify-between">
              <div className="p-2 rounded-lg bg-info/10 text-info group-hover:scale-110 transition-transform">
                <BarChart3 className="h-5 w-5" />
              </div>
              <ArrowRight className="h-4 w-4 text-muted group-hover:text-info group-hover:translate-x-1 transition" />
            </div>
            <div>
              <div className="text-sm font-bold text-fg group-hover:text-info">
                Costos por Orden (OT)
              </div>
              <div className="text-xs text-subdued">
                Análisis individual por pedido, margen y rendimiento por cliente
              </div>
            </div>
          </div>
        </Link>

        <Link href="/costos/desperdicio" className="group">
          <div className="h-full p-4 rounded-xl border border-line bg-card hover:border-warn/30 hover:shadow-md transition space-y-2">
            <div className="flex items-center justify-between">
              <div className="p-2 rounded-lg bg-warn/10 text-warn group-hover:scale-110 transition-transform">
                <FileText className="h-5 w-5" />
              </div>
              <ArrowRight className="h-4 w-4 text-muted group-hover:text-warn group-hover:translate-x-1 transition" />
            </div>
            <div>
              <div className="text-sm font-bold text-fg group-hover:text-warn">
                Control de Desperdicio
              </div>
              <div className="text-xs text-subdued">
                Pérdida por área: Extrusión, Impresión y Confección
              </div>
            </div>
          </div>
        </Link>

        <Link href="/costos/turno" className="group">
          <div className="h-full p-4 rounded-xl border border-line bg-card hover:border-accent/30 hover:shadow-md transition space-y-2">
            <div className="flex items-center justify-between">
              <div className="p-2 rounded-lg bg-accent/10 text-accent group-hover:scale-110 transition-transform">
                <Plus className="h-5 w-5" />
              </div>
              <ArrowRight className="h-4 w-4 text-muted group-hover:text-accent group-hover:translate-x-1 transition" />
            </div>
            <div>
              <div className="text-sm font-bold text-fg group-hover:text-accent">
                Registrar Turno
              </div>
              <div className="text-xs text-subdued">
                Ingresar planilla de operarios y medidor eléctrico del turno
              </div>
            </div>
          </div>
        </Link>
      </div>

      {/* Recent Shift Cost Table */}
      <Card className="border-line shadow-sm bg-card overflow-hidden">
        <CardHeader className="pb-3 border-b border-line flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold text-fg">
              Últimos Costos Asignados por Turno
            </CardTitle>
            <p className="text-xs text-subdued">
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
          <div className="divide-y divide-line">
            {costosTurno.map((c) => {
              const total = Number(c.manoObra) + Number(c.energia)
              return (
                <div key={c.id} className="p-3.5 sm:p-4 hover:bg-elevated/60 transition flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-fg">
                        {new Date(c.fecha).toLocaleDateString("es-BO", {
                          weekday: "short",
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-md font-semibold bg-highlight text-subdued">
                        Turno {c.turno}
                      </span>
                    </div>
                    <div className="text-xs text-subdued flex items-center gap-3">
                      <span>Mano de Obra: <strong className="text-subdued">{formatBs(Number(c.manoObra))}</strong></span>
                      <span>•</span>
                      <span>Energía: <strong className="text-subdued">{formatBs(Number(c.energia))}</strong></span>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-sm font-bold text-fg tabular-nums">
                      {formatBs(total)}
                    </div>
                    <div className="text-[10px] text-muted">Total turno</div>
                  </div>
                </div>
              )
            })}

            {costosTurno.length === 0 && (
              <div className="p-8 text-center text-sm text-subdued">
                No hay turnos de costo registrados todavía. Registra el primero para calcular el costo por 100 kg.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
