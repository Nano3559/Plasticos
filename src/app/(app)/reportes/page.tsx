import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import {
  Download,
  Package,
  FileText,
  Receipt,
  Calculator,
  ShieldAlert,
  BarChart3,
  TrendingUp,
  Scale,
  DollarSign,
  Calendar,
  CheckCircle2,
} from "lucide-react"

export const dynamic = "force-dynamic"

export default async function ReportesPage() {
  const session = await auth()
  const rol = (session?.user as any)?.rol

  if (rol !== "GERENCIA" && rol !== "ADMIN") {
    return (
      <div className="max-w-md mx-auto my-12 text-center space-y-4">
        <div className="p-3 rounded-full bg-rose-50 text-rose-600 inline-block">
          <ShieldAlert className="h-8 w-8" />
        </div>
        <h1 className="text-xl font-bold text-slate-900">Acceso Restringido</h1>
        <p className="text-sm text-slate-500">
          El módulo de reportes ejecutivos y exportación contable está reservado para perfiles de Gerencia y Administración.
        </p>
        <Link href="/dashboard">
          <Button variant="outline" size="sm">
            Volver al Dashboard
          </Button>
        </Link>
      </div>
    )
  }

  // Pre-calculate summary totals for executive cards
  const [materiales, registrosProd, pagos, entregas, clientes] = await Promise.all([
    prisma.material.findMany({ select: { id: true, costoPromedio: true } }),
    prisma.registroProduccion.findMany({
      select: { kgBuenos: true, kgMerma: true, kgRechazado: true, kgEntrada: true },
    }),
    prisma.pago.findMany({ select: { monto: true } }),
    prisma.entrega.findMany({
      include: { orden: { select: { precioUnitario: true } } },
    }),
    prisma.cliente.count(),
  ])

  const totalKgBuenos = registrosProd.reduce((s, r) => s + Number(r.kgBuenos), 0)
  const totalKgEntrada = registrosProd.reduce((s, r) => s + Number(r.kgEntrada), 0)
  const totalMerma = registrosProd.reduce((s, r) => s + Number(r.kgMerma), 0)
  const rendimientoPlanta = totalKgEntrada > 0 ? (totalKgBuenos / totalKgEntrada) * 100 : 0

  const totalCobrado = pagos.reduce((s, p) => s + Number(p.monto), 0)
  const totalEntregadoVal = entregas.reduce(
    (s, e) => s + Number(e.kgEntregados) * Number(e.orden.precioUnitario),
    0
  )
  const saldoCartera = Math.max(0, totalEntregadoVal - totalCobrado)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              Reportes & Descarga Contable
            </h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
              Excel / CSV
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500">
            Descarga de planillas de producción, balances de inventario y estado de cartera de clientes
          </p>
        </div>

        <div className="text-xs text-slate-400 flex items-center gap-1.5">
          <Calendar className="h-3.5 w-3.5" />
          <span>Actualizado al {new Date().toLocaleDateString("es-BO")}</span>
        </div>
      </div>

      {/* High-level KPI summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl border border-slate-200/90 bg-white shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-500">Producción Neta</span>
            <Scale className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="mt-1 text-2xl font-bold text-emerald-700 tabular-nums">
            {totalKgBuenos.toLocaleString("es-BO", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} kg
          </div>
          <div className="mt-1 text-[11px] text-slate-400">
            {rendimientoPlanta.toFixed(1)}% eficiencia global
          </div>
        </div>

        <div className="p-3.5 rounded-xl border border-slate-200/90 bg-white shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-500">Saldo Cartera Pendiente</span>
            <DollarSign className="h-4 w-4 text-amber-500" />
          </div>
          <div className="mt-1 text-2xl font-bold text-slate-900 tabular-nums">
            Bs. {saldoCartera.toLocaleString("es-BO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="mt-1 text-[11px] text-slate-400">Por cobrar a clientes</div>
        </div>

        <div className="p-3.5 rounded-xl border border-slate-200/90 bg-white shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-500">Cobranzas Percibidas</span>
            <Receipt className="h-4 w-4 text-sky-500" />
          </div>
          <div className="mt-1 text-2xl font-bold text-slate-900 tabular-nums">
            Bs. {totalCobrado.toLocaleString("es-BO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="mt-1 text-[11px] text-slate-400">Pagos QR y transferencias</div>
        </div>

        <div className="p-3.5 rounded-xl border border-slate-200/90 bg-white shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-500">Materiales en Planta</span>
            <Package className="h-4 w-4 text-purple-500" />
          </div>
          <div className="mt-1 text-2xl font-bold text-slate-900 tabular-nums">
            {materiales.length} Ítems
          </div>
          <div className="mt-1 text-[11px] text-slate-400">Vírgenes, molidos y aditivos</div>
        </div>
      </div>

      {/* 4 Dedicated Export Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Export 1: Inventario */}
        <Card className="border-slate-200/90 hover:border-slate-300 transition shadow-sm bg-white flex flex-col justify-between">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="p-2.5 rounded-xl bg-purple-50 text-purple-700">
                <Package className="h-6 w-6" />
              </div>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                CSV / EXCEL
              </span>
            </div>
            <CardTitle className="text-base font-bold text-slate-900 mt-2">
              Inventario Físico & Valorado
            </CardTitle>
            <p className="text-xs text-slate-500">
              Listado completo de materias primas, saldo en kilogramos por movimientos, costo unitario y alertas de stock mínimo.
            </p>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[11px] text-slate-400">
                {materiales.length} códigos registrados
              </span>
              <a href="/api/export/inventario" download="inventario.csv">
                <Button size="sm" className="bg-slate-900 hover:bg-slate-800 text-white gap-1.5 shadow-xs">
                  <Download className="h-4 w-4" />
                  <span>Descargar Inventario</span>
                </Button>
              </a>
            </div>
          </CardContent>
        </Card>

        {/* Export 2: Producción */}
        <Card className="border-slate-200/90 hover:border-slate-300 transition shadow-sm bg-white flex flex-col justify-between">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-700">
                <FileText className="h-6 w-6" />
              </div>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                CSV / EXCEL
              </span>
            </div>
            <CardTitle className="text-base font-bold text-slate-900 mt-2">
              Producción & Rendimiento por OT
            </CardTitle>
            <p className="text-xs text-slate-500">
              Detalle de órdenes de trabajo, pesajes por turno en Extrusión, Impresión y Confección, mermas recuperables y descarte.
            </p>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[11px] text-slate-400">
                {registrosProd.length} pesajes de balanza
              </span>
              <a href="/api/export/produccion" download="produccion.csv">
                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-500 text-white gap-1.5 shadow-xs">
                  <Download className="h-4 w-4" />
                  <span>Descargar Producción</span>
                </Button>
              </a>
            </div>
          </CardContent>
        </Card>

        {/* Export 3: Cartera */}
        <Card className="border-slate-200/90 hover:border-slate-300 transition shadow-sm bg-white flex flex-col justify-between">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="p-2.5 rounded-xl bg-sky-50 text-sky-700">
                <Receipt className="h-6 w-6" />
              </div>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                CSV / EXCEL
              </span>
            </div>
            <CardTitle className="text-base font-bold text-slate-900 mt-2">
              Cartera de Clientes & Cobranzas
            </CardTitle>
            <p className="text-xs text-slate-500">
              Estado de cuenta por cliente, notas de remisión entregadas, pagos registrados (QR/Efectivo/Banco) y saldos vencidos.
            </p>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[11px] text-slate-400">
                {clientes} clientes en cartera
              </span>
              <a href="/api/export/cartera" download="cartera.csv">
                <Button size="sm" className="bg-sky-600 hover:bg-sky-500 text-white gap-1.5 shadow-xs">
                  <Download className="h-4 w-4" />
                  <span>Descargar Cartera</span>
                </Button>
              </a>
            </div>
          </CardContent>
        </Card>

        {/* Export 4: Costos */}
        <Card className="border-slate-200/90 hover:border-slate-300 transition shadow-sm bg-white flex flex-col justify-between">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="p-2.5 rounded-xl bg-amber-50 text-amber-700">
                <Calculator className="h-6 w-6" />
              </div>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                CSV / EXCEL
              </span>
            </div>
            <CardTitle className="text-base font-bold text-slate-900 mt-2">
              Costos Operativos por Turno
            </CardTitle>
            <p className="text-xs text-slate-500">
              Planilla de operarios por turno, gasto de energía eléctrica asignado y cálculo del costo de conversión por 100 kg.
            </p>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[11px] text-slate-400">
                Mano de obra y energía
              </span>
              <a href="/api/export/costos" download="costos.csv">
                <Button size="sm" className="bg-amber-600 hover:bg-amber-500 text-white gap-1.5 shadow-xs">
                  <Download className="h-4 w-4" />
                  <span>Descargar Costos</span>
                </Button>
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
