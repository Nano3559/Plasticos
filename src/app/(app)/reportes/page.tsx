import { formatBs } from "@/lib/formato"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { consultarCartera, resumirCartera } from "@/lib/cartera"
import { kgBuenosFinales, kgEntradaInicial } from "@/lib/costos"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Download, Package, FileText, Receipt, Calculator, ShieldAlert, Scale, Banknote, Calendar } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function ReportesPage() {
  const session = await auth()
  const rol = session?.user?.rol

  if (rol !== "GERENCIA" && rol !== "ADMIN") {
    return (
      <div className="max-w-md mx-auto my-12 text-center space-y-4">
        <div className="p-3 rounded-full bg-danger/10 text-danger inline-block">
          <ShieldAlert className="h-8 w-8" />
        </div>
        <h1 className="text-xl font-bold text-fg">Acceso Restringido</h1>
        <p className="text-sm text-subdued">
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

  const [materiales, registrosProd, cartera] = await Promise.all([
    prisma.material.findMany({ select: { id: true, costoPromedio: true } }),
    prisma.registroProduccion.findMany({
      select: { ordenId: true, area: true, kgBuenos: true, kgMerma: true, kgRechazado: true, kgEntrada: true },
    }),
    consultarCartera(),
  ])

  // Producto terminado = kg buenos del último área de cada orden
  const registrosPorOrden = new Map<string, typeof registrosProd>()
  for (const r of registrosProd) registrosPorOrden.set(r.ordenId, [...(registrosPorOrden.get(r.ordenId) ?? []), r])
  const totalKgBuenos = [...registrosPorOrden.values()].reduce((s, regs) => s + kgBuenosFinales(regs), 0)
  const totalKgEntrada = [...registrosPorOrden.values()].reduce((s, regs) => s + kgEntradaInicial(regs), 0)
  const rendimientoPlanta = totalKgEntrada > 0 ? (totalKgBuenos / totalKgEntrada) * 100 : 0

  const resumenCartera = resumirCartera(cartera)
  const totalCobrado = resumenCartera.totalCobrado
  const saldoCartera = resumenCartera.totalPorCobrar

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-fg">
              Reportes & Descarga Contable
            </h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-accent/10 text-accent border border-accent/30">
              Excel (.xlsx)
            </span>
          </div>
          <p className="text-xs sm:text-sm text-subdued">
            Descarga de planillas de producción, balances de inventario y estado de cartera de clientes
          </p>
        </div>

        <div className="text-xs text-muted flex items-center gap-1.5">
          <Calendar className="h-3.5 w-3.5" />
          <span>Actualizado al {new Date().toLocaleDateString("es-BO")}</span>
        </div>
      </div>

      {/* High-level KPI summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl border border-line bg-card shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-subdued">Producción Neta</span>
            <Scale className="h-4 w-4 text-accent" />
          </div>
          <div className="mt-1 text-2xl font-bold text-accent tabular-nums">
            {totalKgBuenos.toLocaleString("es-BO", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} kg
          </div>
          <div className="mt-1 text-[11px] text-muted">
            {rendimientoPlanta.toFixed(1)}% eficiencia global
          </div>
        </div>

        <div className="p-3.5 rounded-xl border border-line bg-card shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-subdued">Saldo Cartera Pendiente</span>
            <Banknote className="h-4 w-4 text-warn" />
          </div>
          <div className="mt-1 text-2xl font-bold text-fg tabular-nums">
            {formatBs(saldoCartera)}
          </div>
          <div className="mt-1 text-[11px] text-muted">Por cobrar a clientes</div>
        </div>

        <div className="p-3.5 rounded-xl border border-line bg-card shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-subdued">Cobranzas Percibidas</span>
            <Receipt className="h-4 w-4 text-info" />
          </div>
          <div className="mt-1 text-2xl font-bold text-fg tabular-nums">
            {formatBs(totalCobrado)}
          </div>
          <div className="mt-1 text-[11px] text-muted">Pagos QR y transferencias</div>
        </div>

        <div className="p-3.5 rounded-xl border border-line bg-card shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-subdued">Materiales en Planta</span>
            <Package className="h-4 w-4 text-info" />
          </div>
          <div className="mt-1 text-2xl font-bold text-fg tabular-nums">
            {materiales.length} Ítems
          </div>
          <div className="mt-1 text-[11px] text-muted">Vírgenes, molidos y aditivos</div>
        </div>
      </div>

      {/* 4 Dedicated Export Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Export 1: Inventario */}
        <Card className="border-line hover:border-line transition shadow-sm bg-card flex flex-col justify-between">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="p-2.5 rounded-xl bg-info/10 text-info">
                <Package className="h-6 w-6" />
              </div>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-highlight text-subdued">
                CSV / EXCEL
              </span>
            </div>
            <CardTitle className="text-base font-bold text-fg mt-2">
              Inventario Físico & Valorado
            </CardTitle>
            <p className="text-xs text-subdued">
              Listado completo de materias primas, saldo en kilogramos por movimientos, costo unitario y alertas de stock mínimo.
            </p>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="pt-3 border-t border-line flex items-center justify-between">
              <span className="text-[11px] text-muted">
                {materiales.length} códigos registrados
              </span>
              <a href="/api/export/inventario" download>
                <Button size="sm" className="gap-1.5 shadow-xs">
                  <Download className="h-4 w-4" />
                  <span>Descargar Inventario</span>
                </Button>
              </a>
            </div>
          </CardContent>
        </Card>

        {/* Export 2: Producción */}
        <Card className="border-line hover:border-line transition shadow-sm bg-card flex flex-col justify-between">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="p-2.5 rounded-xl bg-accent/10 text-accent">
                <FileText className="h-6 w-6" />
              </div>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-highlight text-subdued">
                CSV / EXCEL
              </span>
            </div>
            <CardTitle className="text-base font-bold text-fg mt-2">
              Producción & Rendimiento por OT
            </CardTitle>
            <p className="text-xs text-subdued">
              Detalle de órdenes de trabajo, pesajes por turno en Extrusión, Impresión y Confección, mermas recuperables y descarte.
            </p>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="pt-3 border-t border-line flex items-center justify-between">
              <span className="text-[11px] text-muted">
                {registrosProd.length} pesajes de balanza
              </span>
              <a href="/api/export/produccion" download>
                <Button size="sm" className="bg-brand hover:bg-brand-hover text-on-brand gap-1.5 shadow-xs">
                  <Download className="h-4 w-4" />
                  <span>Descargar Producción</span>
                </Button>
              </a>
            </div>
          </CardContent>
        </Card>

        {/* Export 3: Cartera */}
        <Card className="border-line hover:border-line transition shadow-sm bg-card flex flex-col justify-between">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="p-2.5 rounded-xl bg-info/10 text-info">
                <Receipt className="h-6 w-6" />
              </div>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-highlight text-subdued">
                CSV / EXCEL
              </span>
            </div>
            <CardTitle className="text-base font-bold text-fg mt-2">
              Cartera de Clientes & Cobranzas
            </CardTitle>
            <p className="text-xs text-subdued">
              Estado de cuenta por cliente, notas de remisión entregadas, pagos registrados (QR/Efectivo/Banco) y saldos vencidos.
            </p>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="pt-3 border-t border-line flex items-center justify-between">
              <span className="text-[11px] text-muted">
                {cartera.length} clientes en cartera
              </span>
              <a href="/api/export/cartera" download>
                <Button size="sm" className="bg-brand hover:bg-brand-hover text-on-brand gap-1.5 shadow-xs">
                  <Download className="h-4 w-4" />
                  <span>Descargar Cartera</span>
                </Button>
              </a>
            </div>
          </CardContent>
        </Card>

        {/* Export 4: Costos */}
        <Card className="border-line hover:border-line transition shadow-sm bg-card flex flex-col justify-between">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="p-2.5 rounded-xl bg-warn/10 text-warn">
                <Calculator className="h-6 w-6" />
              </div>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-highlight text-subdued">
                CSV / EXCEL
              </span>
            </div>
            <CardTitle className="text-base font-bold text-fg mt-2">
              Costos Operativos por Turno
            </CardTitle>
            <p className="text-xs text-subdued">
              Planilla de operarios por turno, gasto de energía eléctrica asignado y cálculo del costo de conversión por 100 kg.
            </p>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="pt-3 border-t border-line flex items-center justify-between">
              <span className="text-[11px] text-muted">
                Mano de obra y energía
              </span>
              <a href="/api/export/costos" download>
                <Button size="sm" className="bg-warn hover:bg-warn/90 text-white gap-1.5 shadow-xs">
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
