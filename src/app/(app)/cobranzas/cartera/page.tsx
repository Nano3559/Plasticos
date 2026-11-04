import { formatBs } from "@/lib/formato"
import { consultarCartera, resumirCartera } from "@/lib/cartera"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft, AlertTriangle, ChevronRight, FileSpreadsheet } from "lucide-react"
import Link from "next/link"

export const dynamic = "force-dynamic"

export default async function CarteraPage() {
  // Mismo cálculo que el dashboard, los reportes y la exportación a Excel
  const clientes = await consultarCartera()
  const resumen = resumirCartera(clientes)
  const clientesConDeuda = clientes.filter((c) => c.saldo > 0.5).sort((a, b) => b.saldo - a.saldo)
  const totalCarteraVigente = resumen.totalPorCobrar
  const totalMoraCritica = resumen.totalEnMora

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/cobranzas">
            <Button variant="ghost" size="sm" className="h-9 w-9 p-0 rounded-lg">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-fg">
              Antigüedad de Deuda & Cartera
            </h1>
            <p className="text-xs sm:text-sm text-subdued">
              Vencimiento de notas de remisión en rangos de 15, 30, 60 y más de 60 días
            </p>
          </div>
        </div>

        <Link href="/cobranzas/kardex">
          <Button size="sm" variant="outline" className="text-xs gap-1.5 font-semibold">
            <FileSpreadsheet className="h-4 w-4 text-info" />
            <span>Kardex por Cliente</span>
          </Button>
        </Link>
      </div>

      {/* KPI Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="p-3.5 rounded-xl border border-line bg-card shadow-xs">
          <div className="text-[11px] font-medium text-subdued">Saldo Total en Cartera</div>
          <div className="mt-1 text-2xl font-bold text-fg tabular-nums">
            {formatBs(totalCarteraVigente)}
          </div>
          <div className="mt-1 text-[11px] text-muted">
            {clientesConDeuda.length} clientes con saldo
          </div>
        </div>

        <div className="p-3.5 rounded-xl border border-danger/30 bg-danger/10 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-danger">Mora Crítica (&gt; 30 días)</span>
            <AlertTriangle className="h-4 w-4 text-danger" />
          </div>
          <div className="mt-1 text-2xl font-bold text-danger tabular-nums">
            {formatBs(totalMoraCritica)}
          </div>
          <div className="mt-1 text-[11px] text-danger font-medium">Requiere gestión de cobro</div>
        </div>

        <div className="col-span-2 sm:col-span-1 p-3.5 rounded-xl border border-line bg-card shadow-xs">
          <div className="text-[11px] font-medium text-subdued">Clientes Totales</div>
          <div className="mt-1 text-2xl font-bold text-fg tabular-nums">
            {clientes.length}
          </div>
          <div className="mt-1 text-[11px] text-muted">
            {clientes.length - clientesConDeuda.length} al día (saldo 0)
          </div>
        </div>
      </div>

      {/* Debt Aging Table */}
      <Card className="border-line shadow-sm bg-card overflow-hidden">
        <CardHeader className="pb-3 border-b border-line flex flex-row items-center justify-between">
          <CardTitle className="text-base font-semibold text-fg">
            Clientes con Saldo Pendiente
          </CardTitle>
          <div className="hidden sm:flex items-center gap-3 text-[11px] text-subdued font-medium">
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-accent" /> 0-15 d
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-warn" /> 16-30 d
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-warn" /> 31-60 d
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-danger" /> &gt; 60 d
            </span>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="divide-y divide-line">
            {clientesConDeuda.map((c) => {
              const d0_15 = Math.max(0, c.saldoPorRango["0-15"])
              const d16_30 = Math.max(0, c.saldoPorRango["16-30"])
              const d31_60 = Math.max(0, c.saldoPorRango["31-60"])
              const d60plus = Math.max(0, c.saldoPorRango["60+"])

              return (
                <Link
                  key={c.cliente.id}
                  href={`/cobranzas/kardex?clienteId=${c.cliente.id}`}
                  className="group block p-4 hover:bg-elevated/70 transition space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-fg group-hover:text-info transition">
                        {c.cliente.nombre}
                      </h3>
                      <p className="text-xs text-subdued">
                        Plazo acordado: {c.cliente.diasCredito} días • Total entregado: {formatBs(c.totalEntregado)}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <div className="text-base font-bold text-fg tabular-nums">
                          {formatBs(c.saldo)}
                        </div>
                        <div className="text-[11px] text-muted">Saldo por cobrar</div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-subdued group-hover:text-subdued group-hover:translate-x-0.5 transition" />
                    </div>
                  </div>

                  {/* 4 Buckets Breakdown */}
                  <div className="grid grid-cols-4 gap-2 text-center text-xs">
                    <div className="p-1.5 rounded-lg border border-accent/30 bg-accent/10">
                      <div className="text-[10px] font-semibold text-accent">0 - 15 días</div>
                      <div className="text-xs font-bold text-accent tabular-nums mt-0.5">
                        {formatBs(d0_15, 0)}
                      </div>
                    </div>

                    <div className="p-1.5 rounded-lg border border-warn/30 bg-warn/10">
                      <div className="text-[10px] font-semibold text-warn">16 - 30 días</div>
                      <div className="text-xs font-bold text-warn tabular-nums mt-0.5">
                        {formatBs(d16_30, 0)}
                      </div>
                    </div>

                    <div className="p-1.5 rounded-lg border border-warn/30 bg-warn/10">
                      <div className="text-[10px] font-semibold text-warn">31 - 60 días</div>
                      <div className="text-xs font-bold text-warn tabular-nums mt-0.5">
                        {formatBs(d31_60, 0)}
                      </div>
                    </div>

                    <div className={`p-1.5 rounded-lg border ${d60plus > 0 ? "border-danger/30 bg-danger/10 text-danger" : "border-line bg-elevated text-subdued"}`}>
                      <div className="text-[10px] font-semibold">Más de 60 días</div>
                      <div className="text-xs font-bold tabular-nums mt-0.5">
                        {formatBs(d60plus, 0)}
                      </div>
                    </div>
                  </div>
                </Link>
              )
            })}

            {clientesConDeuda.length === 0 && (
              <div className="p-8 text-center text-sm text-subdued">
                ¡Excelente! Todos los clientes se encuentran al día con sus pagos.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
