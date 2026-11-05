import { formatBs } from "@/lib/formato"
import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft, FileSpreadsheet, Plus, Truck, Banknote } from "lucide-react"
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
      notasCredito: {
        where: { anuladaEn: null },
        orderBy: { fecha: "desc" },
        include: { orden: { select: { numero: true, refExterna: true } } },
      },
    },
  })

  if (!cliente) notFound()

  let totalEntregado = 0
  const entregas: { id: string; ot: number; producto: string; notaRemision: string | null; bultos: number | null; kg: number; precio: number; monto: number; fecha: Date }[] = []
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
        bultos: e.bultos === null ? null : Number(e.bultos),
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
  const totalCreditos = cliente.notasCredito.reduce((sum, n) => sum + Number(n.monto), 0)
  const saldo = Math.max(0, totalEntregado - totalPagado - totalCreditos)

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
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-fg">
                {cliente.nombre}
              </h1>
              <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-highlight text-subdued">
                Crédito: {cliente.diasCredito} días
              </span>
            </div>
            <p className="text-xs text-subdued">
              {cliente.telefono ? `Tel: ${cliente.telefono} • ` : ""}
              {cliente.direccion ? `Dir: ${cliente.direccion} • ` : ""}
              Estado de cuenta de cliente
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link href={`/cobranzas/kardex?clienteId=${cliente.id}`}>
            <Button size="sm" className="bg-brand hover:bg-brand-hover text-on-brand gap-1.5 shadow-xs font-semibold">
              <FileSpreadsheet className="h-4 w-4" />
              <span>Ver Kardex Completo</span>
            </Button>
          </Link>
          <Link href={`/cobranzas/pago?clienteId=${cliente.id}`}>
            <Button size="sm" variant="outline" className="gap-1.5 text-xs text-accent border-accent/30 hover:bg-accent/10">
              <Plus className="h-3.5 w-3.5" />
              <span>Abonar</span>
            </Button>
          </Link>
          <Link href={`/cobranzas/nota-credito?clienteId=${cliente.id}`}>
            <Button size="sm" variant="outline" className="gap-1.5 text-xs">
              <span>Devolución / descuento</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Balance Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-3.5 rounded-xl border border-line bg-card shadow-xs">
          <div className="text-[11px] font-medium text-subdued">Total Remisiones Entregadas</div>
          <div className="mt-1 text-2xl font-bold text-fg tabular-nums">
            {formatBs(totalEntregado)}
          </div>
          <div className="mt-1 text-[11px] text-muted">{entregas.length} notas de entrega</div>
        </div>

        <div className="p-3.5 rounded-xl border border-line bg-card shadow-xs">
          <div className="text-[11px] font-medium text-subdued">Total Pagos & Cobros</div>
          <div className="mt-1 text-2xl font-bold text-accent tabular-nums">
            {formatBs(totalPagado)}
          </div>
          <div className="mt-1 text-[11px] text-muted">
            {cliente.pagos.length} abonos asentados
            {totalCreditos > 0.005 ? ` · ${formatBs(totalCreditos)} en devoluciones y descuentos` : ""}
          </div>
        </div>

        <div
          className={`p-3.5 rounded-xl border shadow-xs ${
 saldo > 0
 ? "border-warn/30 bg-warn/10"
 : "border-accent/30 bg-accent/10"
 }`}
        >
          <div className="text-[11px] font-semibold text-subdued">Saldo Pendiente de Cobro</div>
          <div
            className={`mt-1 text-2xl font-extrabold tabular-nums ${
 saldo > 0 ? "text-warn" : "text-accent"
 }`}
          >
            {formatBs(saldo)}
          </div>
          <div className="mt-1 text-[11px] text-subdued">
            {saldo > 0 ? "Facturas pendientes de liquidar" : "Cuenta al día (Saldo 0.00)"}
          </div>
        </div>
      </div>

      {/* Two columns: Entregas on Left, Pagos on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Entregas List */}
        <Card className="border-line shadow-sm bg-card overflow-hidden">
          <CardHeader className="pb-3 border-b border-line flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <Truck className="h-4 w-4 text-info" />
              <CardTitle className="text-base font-semibold text-fg">
                Remisiones & Entregas ({entregas.length})
              </CardTitle>
            </div>
            <Link href="/cobranzas/entrega">
              <Button size="sm" variant="ghost" className="h-8 text-xs text-info">
                + Nueva Entrega
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-line max-h-96 overflow-y-auto">
              {entregas.map((e) => (
                <div key={e.id} className="p-3.5 hover:bg-elevated/50 transition flex items-center justify-between text-xs">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-fg">
                        {e.notaRemision ? `Remisión #${e.notaRemision}` : `OT #${e.ot}`}
                      </span>
                      <span className="text-muted">
                        {new Date(e.fecha).toLocaleDateString("es-BO")}
                      </span>
                    </div>
                    <div className="text-subdued">
                      {e.producto} • {e.kg.toFixed(2)} kg @ {formatBs(e.precio)}
                      {e.bultos ? ` (${e.bultos.toLocaleString("es-BO")} bultos)` : ""}
                    </div>
                  </div>

                  <div className="text-right font-bold text-fg tabular-nums">
                    {formatBs(e.monto)}
                  </div>
                </div>
              ))}

              {entregas.length === 0 && (
                <div className="p-6 text-center text-xs text-subdued">
                  Sin entregas registradas para este cliente
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Pagos List */}
        <Card className="border-line shadow-sm bg-card overflow-hidden">
          <CardHeader className="pb-3 border-b border-line flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <Banknote className="h-4 w-4 text-accent" />
              <CardTitle className="text-base font-semibold text-fg">
                Abonos & Pagos ({cliente.pagos.length})
              </CardTitle>
            </div>
            <Link href="/cobranzas/pago">
              <Button size="sm" variant="ghost" className="h-8 text-xs text-accent">
                + Registrar Abono
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-line max-h-96 overflow-y-auto">
              {cliente.pagos.map((p) => (
                <div key={p.id} className="p-3.5 hover:bg-elevated/50 transition flex items-center justify-between text-xs">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-accent bg-accent/10 px-2 py-0.5 rounded border border-accent/30">
                        {p.medio}
                      </span>
                      <span className="text-muted">
                        {new Date(p.fecha).toLocaleDateString("es-BO")}
                      </span>
                    </div>
                    {p.referencia && (
                      <p className="text-subdued">Ref: {p.referencia}</p>
                    )}
                  </div>

                  <div className="text-right font-bold text-accent tabular-nums">
                    +{formatBs(Number(p.monto))}
                  </div>
                </div>
              ))}

              {cliente.pagos.length === 0 && (
                <div className="p-6 text-center text-xs text-subdued">
                  Sin pagos registrados para este cliente
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {cliente.notasCredito.length > 0 && (
        <Card className="border-line shadow-sm bg-card overflow-hidden">
          <CardHeader className="pb-3 border-b border-line">
            <CardTitle className="text-base font-semibold text-fg">
              Devoluciones y descuentos ({cliente.notasCredito.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-line">
              {cliente.notasCredito.map((n) => (
                <div key={n.id} className="p-3.5 flex items-center justify-between text-xs">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-warn bg-warn/10 px-2 py-0.5 rounded border border-warn/30">
                        {n.tipo === "DEVOLUCION" ? "DEVOLUCIÓN" : "DESCUENTO"}
                      </span>
                      <span className="text-muted">{new Date(n.fecha).toLocaleDateString("es-BO", { timeZone: "UTC" })}</span>
                    </div>
                    <p className="text-subdued">
                      {n.motivo}
                      {n.kg ? ` · ${Number(n.kg).toLocaleString("es-BO")} kg` : ""}
                      {n.orden ? ` · OT ${n.orden.refExterna ?? `#${n.orden.numero}`}` : ""}
                      {n.notaRemision ? ` · N.R. ${n.notaRemision}` : ""}
                    </p>
                  </div>
                  <div className="text-right font-bold text-warn tabular-nums">−{formatBs(Number(n.monto))}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
