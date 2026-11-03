import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft, FileSpreadsheet, Plus, Truck, Banknote, Clock, QrCode } from "lucide-react"
import Link from "next/link"
import { notFound } from "next/navigation"

export const dynamic = "force-dynamic"

export default async function ClienteDetallePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const cliente = await prisma.cliente.findUnique({
    where: { id },
    include: {
      ordenes: {
        include: {
          entregas: true,
        },
      },
      pagos: {
        orderBy: { fecha: "desc" },
      },
    },
  })

  if (!cliente) notFound()

  let totalEntregado = 0
  const entregas: any[] = []
  for (const orden of cliente.ordenes) {
    const precio = Number(orden.precioUnitario)
    for (const e of orden.entregas) {
      const kg = Number(e.kgEntregados)
      const monto = kg * precio
      totalEntregado += monto
      entregas.push({
        id: e.id,
        ot: orden.numero,
        producto: orden.producto,
        notaRemision: e.notaRemision,
        bultos: e.bultos,
        kg,
        precio,
        monto,
        fecha: e.fecha,
      })
    }
  }

  // Sort deliveries newest first
  entregas.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())

  const totalPagado = cliente.pagos.reduce((sum, p) => sum + Number(p.monto), 0)
  const saldo = Math.max(0, totalEntregado - totalPagado)

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
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                {cliente.nombre}
              </h1>
              <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-slate-100 text-slate-700">
                Crédito: {cliente.diasCredito} días
              </span>
            </div>
            <p className="text-xs text-slate-500">
              {cliente.telefono ? `Tel: ${cliente.telefono} • ` : ""}
              {cliente.direccion ? `Dir: ${cliente.direccion} • ` : ""}
              Estado de cuenta de cliente
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link href={`/cobranzas/kardex?clienteId=${cliente.id}`}>
            <Button size="sm" className="bg-sky-600 hover:bg-sky-500 text-white gap-1.5 shadow-xs font-semibold">
              <FileSpreadsheet className="h-4 w-4" />
              <span>Ver Kardex Completo</span>
            </Button>
          </Link>
          <Link href="/cobranzas/pago">
            <Button size="sm" variant="outline" className="gap-1.5 text-xs text-emerald-700 border-emerald-200 hover:bg-emerald-50">
              <Plus className="h-3.5 w-3.5" />
              <span>Abonar</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Balance Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-3.5 rounded-xl border border-slate-200/90 bg-white shadow-xs">
          <div className="text-[11px] font-medium text-slate-500">Total Remisiones Entregadas</div>
          <div className="mt-1 text-2xl font-bold text-slate-900 tabular-nums">
            Bs. {totalEntregado.toLocaleString("es-BO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="mt-1 text-[11px] text-slate-400">{entregas.length} notas de entrega</div>
        </div>

        <div className="p-3.5 rounded-xl border border-slate-200/90 bg-white shadow-xs">
          <div className="text-[11px] font-medium text-slate-500">Total Pagos & Cobros</div>
          <div className="mt-1 text-2xl font-bold text-emerald-700 tabular-nums">
            Bs. {totalPagado.toLocaleString("es-BO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="mt-1 text-[11px] text-slate-400">{cliente.pagos.length} abonos asentados</div>
        </div>

        <div
          className={`p-3.5 rounded-xl border shadow-xs ${
            saldo > 0
              ? "border-amber-200 bg-amber-50/50"
              : "border-emerald-200 bg-emerald-50/50"
          }`}
        >
          <div className="text-[11px] font-semibold text-slate-700">Saldo Pendiente de Cobro</div>
          <div
            className={`mt-1 text-2xl font-extrabold tabular-nums ${
              saldo > 0 ? "text-amber-900" : "text-emerald-800"
            }`}
          >
            Bs. {saldo.toLocaleString("es-BO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            {saldo > 0 ? "Facturas pendientes de liquidar" : "Cuenta al día (Saldo 0.00)"}
          </div>
        </div>
      </div>

      {/* Two columns: Entregas on Left, Pagos on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Entregas List */}
        <Card className="border-slate-200/90 shadow-sm bg-white overflow-hidden">
          <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <Truck className="h-4 w-4 text-sky-600" />
              <CardTitle className="text-base font-semibold text-slate-900">
                Remisiones & Entregas ({entregas.length})
              </CardTitle>
            </div>
            <Link href="/cobranzas/entrega">
              <Button size="sm" variant="ghost" className="h-8 text-xs text-sky-600">
                + Nueva Entrega
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
              {entregas.map((e) => (
                <div key={e.id} className="p-3.5 hover:bg-slate-50/50 transition flex items-center justify-between text-xs">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">
                        {e.notaRemision ? `Remisión #${e.notaRemision}` : `OT #${e.ot}`}
                      </span>
                      <span className="text-slate-400">
                        {new Date(e.fecha).toLocaleDateString("es-BO")}
                      </span>
                    </div>
                    <div className="text-slate-500">
                      {e.producto} • {e.kg.toFixed(2)} kg @ Bs. {e.precio.toFixed(2)}
                      {e.bultos ? ` (${e.bultos} bultos)` : ""}
                    </div>
                  </div>

                  <div className="text-right font-bold text-slate-900 tabular-nums">
                    Bs. {e.monto.toFixed(2)}
                  </div>
                </div>
              ))}

              {entregas.length === 0 && (
                <div className="p-6 text-center text-xs text-slate-500">
                  Sin entregas registradas para este cliente
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Pagos List */}
        <Card className="border-slate-200/90 shadow-sm bg-white overflow-hidden">
          <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <Banknote className="h-4 w-4 text-emerald-600" />
              <CardTitle className="text-base font-semibold text-slate-900">
                Abonos & Pagos ({cliente.pagos.length})
              </CardTitle>
            </div>
            <Link href="/cobranzas/pago">
              <Button size="sm" variant="ghost" className="h-8 text-xs text-emerald-600">
                + Registrar Abono
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
              {cliente.pagos.map((p) => (
                <div key={p.id} className="p-3.5 hover:bg-slate-50/50 transition flex items-center justify-between text-xs">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        {p.medio}
                      </span>
                      <span className="text-slate-400">
                        {new Date(p.fecha).toLocaleDateString("es-BO")}
                      </span>
                    </div>
                    {p.referencia && (
                      <p className="text-slate-500">Ref: {p.referencia}</p>
                    )}
                  </div>

                  <div className="text-right font-bold text-emerald-700 tabular-nums">
                    +Bs. {Number(p.monto).toFixed(2)}
                  </div>
                </div>
              ))}

              {cliente.pagos.length === 0 && (
                <div className="p-6 text-center text-xs text-slate-500">
                  Sin pagos registrados para este cliente
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
