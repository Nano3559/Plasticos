import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import {
  Factory,
  Package,
  AlertTriangle,
  Clock,
  TrendingUp,
  Receipt,
  ArrowDownToLine,
  ArrowUpFromLine,
  SlidersHorizontal,
  PlusCircle,
  FileText,
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react"

async function getStockMap() {
  const movimientos = await prisma.movimientoInventario.findMany({
    select: { materialId: true, tipo: true, cantidad: true },
  })
  const map: Record<string, number> = {}
  for (const m of movimientos) {
    const cant = Number(m.cantidad)
    if (!map[m.materialId]) map[m.materialId] = 0
    if (m.tipo === "ENTRADA") map[m.materialId] += cant
    if (m.tipo === "SALIDA") map[m.materialId] -= cant
    if (m.tipo === "AJUSTE") map[m.materialId] += cant
  }
  return map
}

function getTurnoActual(): string {
  const hour = new Date().getHours()
  if (hour >= 6 && hour < 14) return "Turno Mañana"
  if (hour >= 14 && hour < 22) return "Turno Tarde"
  return "Turno Noche"
}

export default async function DashboardPage() {
  const session = await auth()
  const user = session?.user
  const rol = (user as any)?.rol || "OPERADOR"
  const turnoActual = getTurnoActual()

  // Consultas optimizadas en paralelo
  const [
    totalClientes,
    ordenesAbiertas,
    ordenesRecientes,
    materiales,
    registrosProduccion,
    allClientes,
    stockMap,
    ultimosMovimientos,
  ] = await Promise.all([
    prisma.cliente.count(),
    prisma.ordenTrabajo.count({ where: { estado: "ABIERTA" } }),
    prisma.ordenTrabajo.findMany({
      take: 5,
      orderBy: { fechaIngreso: "desc" },
      include: {
        cliente: { select: { nombre: true } },
        registros: { select: { kgBuenos: true, kgMerma: true } },
      },
    }),
    prisma.material.findMany({
      select: { id: true, nombre: true, unidad: true, stockMinimo: true },
    }),
    prisma.registroProduccion.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
      include: { orden: { select: { numero: true, producto: true } } },
    }),
    (rol === "GERENCIA" || rol === "ADMIN")
      ? prisma.cliente.findMany({
          include: {
            ordenes: { include: { entregas: true } },
            pagos: true,
          },
        })
      : Promise.resolve([]),
    getStockMap(),
    (rol === "ALMACEN" || rol === "ADMIN" || rol === "GERENCIA")
      ? prisma.movimientoInventario.findMany({
          take: 4,
          orderBy: { createdAt: "desc" },
          include: { material: { select: { nombre: true, unidad: true } }, user: { select: { nombre: true } } },
        })
      : Promise.resolve([]),
  ])

  // Cálculo de alertas de stock crítico
  const materialesConStock = materiales.map((m) => {
    const stockActual = stockMap[m.id] ?? 0
    const stockMin = Number(m.stockMinimo)
    return {
      ...m,
      stockActual,
      stockMinimo: stockMin,
      esCritico: stockMin > 0 && stockActual <= stockMin,
    }
  })
  const materialesCriticos = materialesConStock.filter((m) => m.esCritico)

  // Kilos de producción total registrados
  const kgBuenosTotal = registrosProduccion.reduce((acc, r) => acc + Number(r.kgBuenos), 0)
  const kgMermasTotal = registrosProduccion.reduce((acc, r) => acc + Number(r.kgMerma), 0)

  // Cálculo de Cartera de clientes
  let carteraTotal = 0
  const clientesConDeuda: { id: string; nombre: string; saldo: number; diasCredito: number }[] = []
  if (rol === "GERENCIA" || rol === "ADMIN") {
    for (const c of allClientes) {
      let entregadoValor = 0
      for (const o of c.ordenes) {
        const precio = Number(o.precioUnitario)
        for (const e of o.entregas) {
          entregadoValor += Number(e.kgEntregados) * precio
        }
      }
      const pagadoTotal = c.pagos.reduce((s, p) => s + Number(p.monto), 0)
      const saldo = entregadoValor - pagadoTotal
      if (saldo > 0.05) {
        carteraTotal += saldo
        clientesConDeuda.push({ id: c.id, nombre: c.nombre, saldo, diasCredito: c.diasCredito })
      }
    }
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* 1. Header con jerarquía visual y contexto de turno */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">Panel de Control</h1>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20">
              {rol}
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Bienvenido, <span className="font-medium text-foreground">{user?.name || "Usuario"}</span> •{" "}
            <span className="inline-flex items-center gap-1 font-medium text-emerald-600">
              <Clock className="h-3.5 w-3.5" /> {turnoActual}
            </span>
          </p>
        </div>

        {/* Acceso rápido a perfil o estado */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground bg-muted px-2.5 py-1 rounded-md">
            {new Date().toLocaleDateString("es-BO", { weekday: "short", day: "numeric", month: "short" })}
          </span>
        </div>
      </div>

      {/* 2. Banner de Alerta Crítica (Status Visualization Pattern) */}
      {materialesCriticos.length > 0 && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-amber-900 dark:text-amber-200">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-amber-500/20 rounded-lg shrink-0">
              <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-semibold text-sm">
                  {materialesCriticos.length} material(es) en Stock Crítico
                </h3>
                <Link
                  href="/inventario"
                  className="text-xs font-semibold text-amber-700 dark:text-amber-300 hover:underline inline-flex items-center gap-0.5"
                >
                  Ver todos <ChevronRight className="h-3 w-3" />
                </Link>
              </div>
              <p className="text-xs text-amber-800/80 dark:text-amber-300/80 mt-0.5">
                Los siguientes insumos están en o por debajo de su stock mínimo de seguridad:
              </p>
              <div className="mt-2.5 flex flex-wrap gap-2">
                {materialesCriticos.slice(0, 4).map((m) => (
                  <div
                    key={m.id}
                    className="inline-flex items-center gap-2 bg-background/80 border border-amber-300/40 rounded-lg px-2.5 py-1 text-xs"
                  >
                    <span className="font-medium text-foreground">{m.nombre}:</span>
                    <span className="font-bold text-destructive">
                      {m.stockActual.toFixed(1)} {m.unidad}
                    </span>
                    <span className="text-muted-foreground text-[10px]">(mín. {m.stockMinimo.toFixed(0)})</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. Acciones Rápidas Ergonómicas (Mobile Responsive UX: Touch targets >= 48px) */}
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2.5">
          Acciones Rápidas
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {(rol === "OPERADOR" || rol === "ADMIN" || rol === "GERENCIA") && (
            <Link href="/produccion/registro" className="block">
              <Button
                variant="outline"
                className="w-full h-16 flex flex-col items-center justify-center gap-1.5 rounded-xl border hover:border-primary/50 hover:bg-primary/5 transition-all shadow-xs"
              >
                <Factory className="h-5 w-5 text-emerald-600" />
                <span className="text-xs font-semibold">Registrar Producción</span>
              </Button>
            </Link>
          )}

          {(rol === "ADMIN" || rol === "GERENCIA") && (
            <Link href="/produccion/ordenes/nueva" className="block">
              <Button
                variant="outline"
                className="w-full h-16 flex flex-col items-center justify-center gap-1.5 rounded-xl border hover:border-primary/50 hover:bg-primary/5 transition-all shadow-xs"
              >
                <PlusCircle className="h-5 w-5 text-blue-600" />
                <span className="text-xs font-semibold">Nueva Orden (OT)</span>
              </Button>
            </Link>
          )}

          {(rol === "ALMACEN" || rol === "ADMIN" || rol === "GERENCIA") && (
            <>
              <Link href="/inventario/entrada" className="block">
                <Button
                  variant="outline"
                  className="w-full h-16 flex flex-col items-center justify-center gap-1.5 rounded-xl border hover:border-primary/50 hover:bg-primary/5 transition-all shadow-xs"
                >
                  <ArrowDownToLine className="h-5 w-5 text-indigo-600" />
                  <span className="text-xs font-semibold">Entrada Material</span>
                </Button>
              </Link>
              <Link href="/inventario/salida" className="block">
                <Button
                  variant="outline"
                  className="w-full h-16 flex flex-col items-center justify-center gap-1.5 rounded-xl border hover:border-primary/50 hover:bg-primary/5 transition-all shadow-xs"
                >
                  <ArrowUpFromLine className="h-5 w-5 text-amber-600" />
                  <span className="text-xs font-semibold">Vale de Salida</span>
                </Button>
              </Link>
            </>
          )}

          {(rol === "ADMIN" || rol === "GERENCIA") && (
            <Link href="/cobranzas/pago" className="block">
              <Button
                variant="outline"
                className="w-full h-16 flex flex-col items-center justify-center gap-1.5 rounded-xl border hover:border-primary/50 hover:bg-primary/5 transition-all shadow-xs"
              >
                <Receipt className="h-5 w-5 text-violet-600" />
                <span className="text-xs font-semibold">Registrar Cobro</span>
              </Button>
            </Link>
          )}

          {rol === "OPERADOR" && (
            <Link href="/produccion/ordenes" className="block">
              <Button
                variant="outline"
                className="w-full h-16 flex flex-col items-center justify-center gap-1.5 rounded-xl border hover:border-primary/50 hover:bg-primary/5 transition-all shadow-xs"
              >
                <FileText className="h-5 w-5 text-blue-600" />
                <span className="text-xs font-semibold">Ver Mis Órdenes</span>
              </Button>
            </Link>
          )}

          {rol === "ALMACEN" && (
            <Link href="/inventario/ajuste" className="block">
              <Button
                variant="outline"
                className="w-full h-16 flex flex-col items-center justify-center gap-1.5 rounded-xl border hover:border-primary/50 hover:bg-primary/5 transition-all shadow-xs"
              >
                <SlidersHorizontal className="h-5 w-5 text-purple-600" />
                <span className="text-xs font-semibold">Ajuste de Stock</span>
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* 4. Tarjetas KPI (Info Card Patterns - Stat Block Variant) */}
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2.5">
          Métricas Clave
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Card 1: Órdenes */}
          <Card className="rounded-xl border shadow-xs hover:shadow-sm transition-shadow">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Órdenes Activas</p>
                <p className="text-2xl font-bold tracking-tight">{ordenesAbiertas}</p>
                <p className="text-[11px] text-muted-foreground">En producción/taller</p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0">
                <FileText className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>

          {/* Card 2: Producción reciente */}
          <Card className="rounded-xl border shadow-xs hover:shadow-sm transition-shadow">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Kg Buenos</p>
                <p className="text-2xl font-bold tracking-tight">{kgBuenosTotal.toFixed(0)} <span className="text-sm font-normal text-muted-foreground">kg</span></p>
                <p className="text-[11px] text-emerald-600 font-medium">Últimos registros</p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                <Factory className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>

          {/* Card 3: Materiales & Alertas */}
          <Card className="rounded-xl border shadow-xs hover:shadow-sm transition-shadow">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Catálogo Insumos</p>
                <p className="text-2xl font-bold tracking-tight">{materiales.length}</p>
                <p className="text-[11px] text-muted-foreground">
                  {materialesCriticos.length > 0 ? (
                    <span className="text-destructive font-medium">{materialesCriticos.length} en mínimo</span>
                  ) : (
                    <span className="text-emerald-600 font-medium">Stock saludable</span>
                  )}
                </p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center shrink-0">
                <Package className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>

          {/* Card 4: Cartera o Mermas según rol */}
          {rol === "GERENCIA" || rol === "ADMIN" ? (
            <Card className="rounded-xl border shadow-xs hover:shadow-sm transition-shadow">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">Cartera por Cobrar</p>
                  <p className="text-2xl font-bold tracking-tight">
                    ${carteraTotal.toLocaleString("es-BO", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </p>
                  <p className="text-[11px] text-muted-foreground">{clientesConDeuda.length} clientes pendientes</p>
                </div>
                <div className="h-10 w-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
                  <Receipt className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="rounded-xl border shadow-xs hover:shadow-sm transition-shadow">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">Mermas / Scrap</p>
                  <p className="text-2xl font-bold tracking-tight">{kgMermasTotal.toFixed(0)} <span className="text-sm font-normal text-muted-foreground">kg</span></p>
                  <p className="text-[11px] text-muted-foreground">Material a reciclar</p>
                </div>
                <div className="h-10 w-10 rounded-xl bg-rose-500/10 text-rose-600 flex items-center justify-center shrink-0">
                  <TrendingUp className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* 5. Secciones de Datos (Órdenes Activas + Cartera / Almacén) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Bloque: Órdenes de Trabajo en Curso */}
        <Card className="rounded-xl border shadow-xs">
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold">Órdenes de Trabajo Activas</CardTitle>
              <p className="text-xs text-muted-foreground">Últimos pedidos en planta</p>
            </div>
            <Link
              href="/produccion/ordenes"
              className="text-xs text-primary font-medium hover:underline inline-flex items-center"
            >
              Ver todas <ChevronRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent className="p-4 pt-2">
            {ordenesRecientes.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground">
                <CheckCircle2 className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                No hay órdenes abiertas en este momento
              </div>
            ) : (
              <div className="divide-y">
                {ordenesRecientes.map((ot) => {
                  const kgPedidos = Number(ot.kgPedidos)
                  const kgFabricados = ot.registros.reduce((acc, r) => acc + Number(r.kgBuenos), 0)
                  const porcentaje = kgPedidos > 0 ? Math.min(100, Math.round((kgFabricados / kgPedidos) * 100)) : 0

                  return (
                    <Link
                      key={ot.id}
                      href={`/produccion/ordenes/${ot.id}`}
                      className="py-3 flex flex-col gap-1.5 hover:bg-muted/50 -mx-4 px-4 transition-colors block"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-foreground">
                          OT #{ot.numero} • {ot.cliente.nombre}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            ot.estado === "ABIERTA"
                              ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {ot.estado}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{ot.producto} {ot.medida ? `(${ot.medida})` : ""}</span>
                        <span className="font-medium text-foreground">
                          {kgFabricados.toFixed(0)} / {kgPedidos.toFixed(0)} kg ({porcentaje}%)
                        </span>
                      </div>
                      {/* Barra de Progreso (Status Visualization Pattern) */}
                      <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-primary h-1.5 rounded-full transition-all duration-300"
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

        {/* Bloque según Rol: Cartera (Admin/Gerencia) o Movimientos (Almacén/Operador) */}
        {rol === "GERENCIA" || rol === "ADMIN" ? (
          <Card className="rounded-xl border shadow-xs">
            <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold">Cuentas por Cobrar</CardTitle>
                <p className="text-xs text-muted-foreground">Saldos pendientes con clientes</p>
              </div>
              <Link
                href="/cobranzas/cartera"
                className="text-xs text-primary font-medium hover:underline inline-flex items-center"
              >
                Ver cartera <ChevronRight className="h-3 w-3" />
              </Link>
            </CardHeader>
            <CardContent className="p-4 pt-2">
              {clientesConDeuda.length === 0 ? (
                <div className="py-8 text-center text-xs text-muted-foreground">
                  <ShieldCheck className="h-8 w-8 text-emerald-500/40 mx-auto mb-2" />
                  No existen cuentas vencidas ni saldos pendientes
                </div>
              ) : (
                <div className="divide-y">
                  {clientesConDeuda.slice(0, 5).map((c) => (
                    <Link
                      key={c.id}
                      href={`/cobranzas/cliente/${c.id}`}
                      className="py-3 flex items-center justify-between hover:bg-muted/50 -mx-4 px-4 transition-colors"
                    >
                      <div>
                        <p className="text-xs font-semibold text-foreground">{c.nombre}</p>
                        <p className="text-[11px] text-muted-foreground">Crédito pactado: {c.diasCredito} días</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-bold text-destructive">
                          ${c.saldo.toLocaleString("es-BO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                        <span className="text-[10px] text-muted-foreground">Pendiente</span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card className="rounded-xl border shadow-xs">
            <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold">Movimientos Recientes</CardTitle>
                <p className="text-xs text-muted-foreground">Actividad en almacén</p>
              </div>
              <Link
                href="/inventario"
                className="text-xs text-primary font-medium hover:underline inline-flex items-center"
              >
                Inventario <ChevronRight className="h-3 w-3" />
              </Link>
            </CardHeader>
            <CardContent className="p-4 pt-2">
              {ultimosMovimientos.length === 0 ? (
                <div className="py-8 text-center text-xs text-muted-foreground">
                  Sin movimientos registrados recientemente
                </div>
              ) : (
                <div className="divide-y">
                  {ultimosMovimientos.map((m) => (
                    <div key={m.id} className="py-3 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`p-1.5 rounded-lg text-xs ${
                            m.tipo === "ENTRADA"
                              ? "bg-emerald-500/10 text-emerald-600"
                              : m.tipo === "SALIDA"
                              ? "bg-amber-500/10 text-amber-600"
                              : "bg-blue-500/10 text-blue-600"
                          }`}
                        >
                          {m.tipo === "ENTRADA" ? (
                            <ArrowDownToLine className="h-3.5 w-3.5" />
                          ) : (
                            <ArrowUpFromLine className="h-3.5 w-3.5" />
                          )}
                        </div>
                        <div>
                          <p className="text-xs font-medium text-foreground">{m.material.nombre}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {m.turno} • {m.user.nombre}
                          </p>
                        </div>
                      </div>
                      <span className="text-xs font-semibold">
                        {m.tipo === "SALIDA" ? "-" : "+"}
                        {Number(m.cantidad).toFixed(1)} {m.material.unidad}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
