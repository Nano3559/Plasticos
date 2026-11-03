import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Users, AlertTriangle, ChevronRight, DollarSign, Clock, FileSpreadsheet } from "lucide-react"
import Link from "next/link"

export const dynamic = "force-dynamic"

export default async function CarteraPage() {
  const clientes = await prisma.cliente.findMany({
    orderBy: { nombre: "asc" },
    include: {
      ordenes: {
        include: {
          entregas: true,
        },
      },
      pagos: true,
    },
  })

  const today = new Date()

  const cartera = clientes.map((cliente) => {
    let totalEntregado = 0
    const entregasDetalladas: any[] = []

    for (const orden of cliente.ordenes) {
      const precio = Number(orden.precioUnitario)
      for (const entrega of orden.entregas) {
        const kg = Number(entrega.kgEntregados)
        totalEntregado += kg * precio
        const fechaEntrega = new Date(entrega.fecha)
        const dias = Math.floor((today.getTime() - fechaEntrega.getTime()) / (1000 * 60 * 60 * 24))
        entregasDetalladas.push({
          fecha: fechaEntrega,
          dias,
          monto: kg * precio,
          ot: orden.numero,
        })
      }
    }

    const totalPagado = cliente.pagos.reduce((sum, p) => sum + Number(p.monto), 0)
    const saldo = Math.max(0, totalEntregado - totalPagado)

    const rangos = {
      "0-15": 0,
      "16-30": 0,
      "31-60": 0,
      "60+": 0,
    }

    for (const e of entregasDetalladas) {
      if (e.dias <= 15) rangos["0-15"] += e.monto
      else if (e.dias <= 30) rangos["16-30"] += e.monto
      else if (e.dias <= 60) rangos["31-60"] += e.monto
      else rangos["60+"] += e.monto
    }

    const factor = totalEntregado > 0 ? (totalEntregado - totalPagado) / totalEntregado : 0
    const saldoPorRango = {
      "0-15": rangos["0-15"] * factor,
      "16-30": rangos["16-30"] * factor,
      "31-60": rangos["31-60"] * factor,
      "60+": rangos["60+"] * factor,
    }

    return {
      cliente,
      totalEntregado,
      totalPagado,
      saldo,
      saldoPorRango,
    }
  })

  const clientesConDeuda = cartera.filter((c) => c.saldo > 0.5)
  const totalCarteraVigente = clientesConDeuda.reduce((s, c) => s + c.saldo, 0)
  const totalMoraCritica = clientesConDeuda.reduce(
    (s, c) => s + Math.max(0, c.saldoPorRango["31-60"]) + Math.max(0, c.saldoPorRango["60+"]),
    0
  )

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
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              Antigüedad de Deuda & Cartera
            </h1>
            <p className="text-xs sm:text-sm text-slate-500">
              Vencimiento de notas de remisión en rangos de 15, 30, 60 y más de 60 días
            </p>
          </div>
        </div>

        <Link href="/cobranzas/kardex">
          <Button size="sm" variant="outline" className="text-xs gap-1.5 font-semibold">
            <FileSpreadsheet className="h-4 w-4 text-sky-600" />
            <span>Kardex por Cliente</span>
          </Button>
        </Link>
      </div>

      {/* KPI Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="p-3.5 rounded-xl border border-slate-200/90 bg-white shadow-xs">
          <div className="text-[11px] font-medium text-slate-500">Saldo Total en Cartera</div>
          <div className="mt-1 text-2xl font-bold text-slate-900 tabular-nums">
            Bs. {totalCarteraVigente.toLocaleString("es-BO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="mt-1 text-[11px] text-slate-400">
            {clientesConDeuda.length} clientes con saldo
          </div>
        </div>

        <div className="p-3.5 rounded-xl border border-rose-200/90 bg-rose-50/40 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-rose-800">Mora Crítica (&gt; 30 días)</span>
            <AlertTriangle className="h-4 w-4 text-rose-500" />
          </div>
          <div className="mt-1 text-2xl font-bold text-rose-700 tabular-nums">
            Bs. {totalMoraCritica.toLocaleString("es-BO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="mt-1 text-[11px] text-rose-600 font-medium">Requiere gestión de cobro</div>
        </div>

        <div className="col-span-2 sm:col-span-1 p-3.5 rounded-xl border border-slate-200/90 bg-white shadow-xs">
          <div className="text-[11px] font-medium text-slate-500">Clientes Totales</div>
          <div className="mt-1 text-2xl font-bold text-slate-900 tabular-nums">
            {clientes.length}
          </div>
          <div className="mt-1 text-[11px] text-slate-400">
            {clientes.length - clientesConDeuda.length} al día (saldo 0)
          </div>
        </div>
      </div>

      {/* Debt Aging Table */}
      <Card className="border-slate-200/90 shadow-sm bg-white overflow-hidden">
        <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
          <CardTitle className="text-base font-semibold text-slate-900">
            Clientes con Saldo Pendiente
          </CardTitle>
          <div className="hidden sm:flex items-center gap-3 text-[11px] text-slate-500 font-medium">
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-emerald-500" /> 0-15 d
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-amber-500" /> 16-30 d
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-orange-500" /> 31-60 d
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-rose-600" /> &gt; 60 d
            </span>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="divide-y divide-slate-100">
            {clientesConDeuda.map((c) => {
              const d0_15 = Math.max(0, c.saldoPorRango["0-15"])
              const d16_30 = Math.max(0, c.saldoPorRango["16-30"])
              const d31_60 = Math.max(0, c.saldoPorRango["31-60"])
              const d60plus = Math.max(0, c.saldoPorRango["60+"])

              return (
                <Link
                  key={c.cliente.id}
                  href={`/cobranzas/kardex?clienteId=${c.cliente.id}`}
                  className="group block p-4 hover:bg-slate-50/70 transition space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 group-hover:text-sky-600 transition">
                        {c.cliente.nombre}
                      </h3>
                      <p className="text-xs text-slate-500">
                        Plazo acordado: {c.cliente.diasCredito} días • Total entregado: Bs. {c.totalEntregado.toFixed(2)}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <div className="text-base font-bold text-slate-900 tabular-nums">
                          Bs. {c.saldo.toFixed(2)}
                        </div>
                        <div className="text-[11px] text-slate-400">Saldo por cobrar</div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-slate-600 group-hover:translate-x-0.5 transition" />
                    </div>
                  </div>

                  {/* 4 Buckets Breakdown */}
                  <div className="grid grid-cols-4 gap-2 text-center text-xs">
                    <div className="p-1.5 rounded-lg border border-emerald-100 bg-emerald-50/40">
                      <div className="text-[10px] font-semibold text-emerald-800">0 - 15 días</div>
                      <div className="text-xs font-bold text-emerald-900 tabular-nums mt-0.5">
                        Bs. {d0_15.toFixed(0)}
                      </div>
                    </div>

                    <div className="p-1.5 rounded-lg border border-amber-100 bg-amber-50/40">
                      <div className="text-[10px] font-semibold text-amber-800">16 - 30 días</div>
                      <div className="text-xs font-bold text-amber-900 tabular-nums mt-0.5">
                        Bs. {d16_30.toFixed(0)}
                      </div>
                    </div>

                    <div className="p-1.5 rounded-lg border border-orange-100 bg-orange-50/40">
                      <div className="text-[10px] font-semibold text-orange-800">31 - 60 días</div>
                      <div className="text-xs font-bold text-orange-900 tabular-nums mt-0.5">
                        Bs. {d31_60.toFixed(0)}
                      </div>
                    </div>

                    <div className={`p-1.5 rounded-lg border ${d60plus > 0 ? "border-rose-200 bg-rose-50 text-rose-900" : "border-slate-100 bg-slate-50 text-slate-600"}`}>
                      <div className="text-[10px] font-semibold">Más de 60 días</div>
                      <div className="text-xs font-bold tabular-nums mt-0.5">
                        Bs. {d60plus.toFixed(0)}
                      </div>
                    </div>
                  </div>
                </Link>
              )
            })}

            {clientesConDeuda.length === 0 && (
              <div className="p-8 text-center text-sm text-slate-500">
                ¡Excelente! Todos los clientes se encuentran al día con sus pagos.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
