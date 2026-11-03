import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import {
  Plus,
  FileText,
  Users,
  ClipboardList,
  Factory,
  Layers,
  Printer,
  Scissors,
  TrendingUp,
  ChevronRight,
  CheckCircle2,
  Clock,
} from "lucide-react"

export default async function ProduccionPage() {
  const session = await auth()
  const rol = (session?.user as any)?.rol

  // Consultas en paralelo
  const [ordenes, totalAbiertas, registrosRecientes, totalClientes] = await Promise.all([
    prisma.ordenTrabajo.findMany({
      take: 8,
      orderBy: { fechaIngreso: "desc" },
      include: {
        cliente: { select: { nombre: true } },
        registros: { select: { area: true, kgBuenos: true, kgMerma: true } },
      },
    }),
    prisma.ordenTrabajo.count({ where: { estado: "ABIERTA" } }),
    prisma.registroProduccion.findMany({
      take: 20,
      orderBy: { createdAt: "desc" },
      select: { area: true, kgBuenos: true, kgMerma: true, kgEntrada: true },
    }),
    prisma.cliente.count(),
  ])

  // Métricas agregadas de producción
  const kgEntradaTotal = registrosRecientes.reduce((acc, r) => acc + Number(r.kgEntrada), 0)
  const kgBuenosTotal = registrosRecientes.reduce((acc, r) => acc + Number(r.kgBuenos), 0)
  const kgMermaTotal = registrosRecientes.reduce((acc, r) => acc + Number(r.kgMerma), 0)
  const rendimientoPromedio = kgEntradaTotal > 0 ? Math.round((kgBuenosTotal / kgEntradaTotal) * 100) : 0

  // Desglose por Área
  const porArea = {
    EXTRUSION: { buenos: 0, merma: 0 },
    IMPRESION: { buenos: 0, merma: 0 },
    CONFECCION: { buenos: 0, merma: 0 },
  }
  for (const r of registrosRecientes) {
    if (porArea[r.area]) {
      porArea[r.area].buenos += Number(r.kgBuenos)
      porArea[r.area].merma += Number(r.kgMerma)
    }
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Módulo de Producción</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Gestión de órdenes de trabajo, seguimiento por área y pesajes de turno
          </p>
        </div>

        {(rol === "ADMIN" || rol === "GERENCIA") && (
          <div className="flex items-center gap-2">
            <Link href="/produccion/ordenes/nueva">
              <Button size="sm" className="gap-1.5 h-9 rounded-xl font-semibold shadow-xs">
                <Plus className="h-4 w-4" /> Nueva OT
              </Button>
            </Link>
          </div>
        )}
      </div>

      {/* Acciones Rápidas Ergonómicas (mobile-responsive-ux) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {(rol === "OPERADOR" || rol === "ADMIN" || rol === "GERENCIA") && (
          <Link href="/produccion/registro" className="block">
            <Button
              variant="outline"
              className="w-full h-16 flex flex-col items-center justify-center gap-1 rounded-xl border hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all shadow-xs"
            >
              <ClipboardList className="h-5 w-5 text-emerald-600" />
              <span className="text-xs font-semibold">Registrar Turno</span>
            </Button>
          </Link>
        )}

        <Link href="/produccion/ordenes" className="block">
          <Button
            variant="outline"
            className="w-full h-16 flex flex-col items-center justify-center gap-1 rounded-xl border hover:border-primary/50 hover:bg-primary/5 transition-all shadow-xs"
          >
            <FileText className="h-5 w-5 text-blue-600" />
            <span className="text-xs font-semibold">Ver Órdenes</span>
          </Button>
        </Link>

        {(rol === "ADMIN" || rol === "GERENCIA") && (
          <>
            <Link href="/produccion/ordenes/nueva" className="block">
              <Button
                variant="outline"
                className="w-full h-16 flex flex-col items-center justify-center gap-1 rounded-xl border hover:border-primary/50 hover:bg-primary/5 transition-all shadow-xs"
              >
                <Plus className="h-5 w-5 text-indigo-600" />
                <span className="text-xs font-semibold">Crear Orden</span>
              </Button>
            </Link>

            <Link href="/produccion/clientes" className="block">
              <Button
                variant="outline"
                className="w-full h-16 flex flex-col items-center justify-center gap-1 rounded-xl border hover:border-primary/50 hover:bg-primary/5 transition-all shadow-xs"
              >
                <Users className="h-5 w-5 text-amber-600" />
                <span className="text-xs font-semibold">Clientes ({totalClientes})</span>
              </Button>
            </Link>
          </>
        )}
      </div>

      {/* Tarjetas KPI de Producción (info-card-patterns) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="rounded-xl border shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">OTs Abiertas</p>
              <p className="text-2xl font-bold tracking-tight">{totalAbiertas}</p>
              <p className="text-[11px] text-muted-foreground">En fabricación</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0">
              <FileText className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl border shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Kilos Buenos</p>
              <p className="text-2xl font-bold tracking-tight">
                {kgBuenosTotal.toFixed(0)} <span className="text-sm font-normal text-muted-foreground">kg</span>
              </p>
              <p className="text-[11px] text-emerald-600 font-medium">Calidad aprobada</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
              <Factory className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl border shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Rendimiento</p>
              <p className="text-2xl font-bold tracking-tight">{rendimientoPromedio}%</p>
              <p className="text-[11px] text-muted-foreground">Eficiencia útil</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-violet-500/10 text-violet-600 flex items-center justify-center shrink-0">
              <TrendingUp className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl border shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Scrap / Merma</p>
              <p className="text-2xl font-bold tracking-tight">
                {kgMermaTotal.toFixed(0)} <span className="text-sm font-normal text-muted-foreground">kg</span>
              </p>
              <p className="text-[11px] text-amber-600 font-medium">Recuperable</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
              <Clock className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Resumen por Áreas de la Planta */}
      <Card className="rounded-xl border shadow-xs">
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-sm font-semibold">Producción por Áreas de Planta</CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-1">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3 rounded-xl border bg-amber-500/5 border-amber-500/20 space-y-1">
              <div className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400 font-semibold text-xs">
                <Layers className="h-4 w-4" />
                <span>Extrusión</span>
              </div>
              <p className="text-lg font-bold">{porArea.EXTRUSION.buenos.toFixed(0)} kg</p>
              <p className="text-[11px] text-muted-foreground">
                Merma: {porArea.EXTRUSION.merma.toFixed(0)} kg
              </p>
            </div>

            <div className="p-3 rounded-xl border bg-blue-500/5 border-blue-500/20 space-y-1">
              <div className="flex items-center gap-1.5 text-blue-700 dark:text-blue-400 font-semibold text-xs">
                <Printer className="h-4 w-4" />
                <span>Impresión</span>
              </div>
              <p className="text-lg font-bold">{porArea.IMPRESION.buenos.toFixed(0)} kg</p>
              <p className="text-[11px] text-muted-foreground">
                Merma: {porArea.IMPRESION.merma.toFixed(0)} kg
              </p>
            </div>

            <div className="p-3 rounded-xl border bg-emerald-500/5 border-emerald-500/20 space-y-1">
              <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-semibold text-xs">
                <Scissors className="h-4 w-4" />
                <span>Confección</span>
              </div>
              <p className="text-lg font-bold">{porArea.CONFECCION.buenos.toFixed(0)} kg</p>
              <p className="text-[11px] text-muted-foreground">
                Merma: {porArea.CONFECCION.merma.toFixed(0)} kg
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Listado de Órdenes Recientes con Barra de Progreso */}
      <Card className="rounded-xl border shadow-xs">
        <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold">Órdenes de Trabajo Recientes</CardTitle>
            <p className="text-xs text-muted-foreground">Pedidos activos y su estado de avance</p>
          </div>
          <Link
            href="/produccion/ordenes"
            className="text-xs font-semibold text-primary hover:underline inline-flex items-center gap-0.5"
          >
            Ver catálogo completo <ChevronRight className="h-3 w-3" />
          </Link>
        </CardHeader>
        <CardContent className="p-4 pt-1">
          {ordenes.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground">
              <CheckCircle2 className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
              No existen órdenes registradas aún
            </div>
          ) : (
            <div className="divide-y">
              {ordenes.map((ot) => {
                const kgPedidos = Number(ot.kgPedidos)
                const kgFabricados = ot.registros.reduce((acc, r) => acc + Number(r.kgBuenos), 0)
                const porcentaje = kgPedidos > 0 ? Math.min(100, Math.round((kgFabricados / kgPedidos) * 100)) : 0

                return (
                  <Link
                    key={ot.id}
                    href={`/produccion/ordenes/${ot.id}`}
                    className="py-3.5 flex flex-col gap-1.5 hover:bg-muted/50 -mx-4 px-4 transition-colors block"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-foreground">
                        OT #{ot.numero} — {ot.producto}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          ot.estado === "ABIERTA"
                            ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                            : ot.estado === "TERMINADA"
                            ? "bg-blue-500/10 text-blue-600 border border-blue-500/20"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {ot.estado}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Cliente: {ot.cliente.nombre}</span>
                      <span className="font-semibold text-foreground">
                        {kgFabricados.toFixed(0)} / {kgPedidos.toFixed(0)} kg ({porcentaje}%)
                      </span>
                    </div>

                    {/* Barra de progreso de fabricación */}
                    <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-primary h-2 rounded-full transition-all duration-300"
                        style={{ width: `${porcentaje}%` }}
                      />
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
