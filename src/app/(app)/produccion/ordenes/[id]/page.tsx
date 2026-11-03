import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  ArrowLeft,
  Factory,
  Layers,
  Printer,
  Scissors,
  CheckCircle2,
  Clock,
  Sparkles,
  Calendar,
  User,
  PlusCircle,
} from "lucide-react"
import Link from "next/link"
import { notFound } from "next/navigation"
import { cambiarEstadoOrden } from "@/actions/produccion"

export default async function DetalleOrdenPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()
  const rol = (session?.user as any)?.rol

  const ot = await prisma.ordenTrabajo.findUnique({
    where: { id },
    include: {
      cliente: true,
      registros: {
        include: { user: { select: { nombre: true } } },
        orderBy: { createdAt: "desc" },
      },
      entregas: true,
    },
  })

  if (!ot) notFound()

  const kgPedidos = Number(ot.kgPedidos)
  const kgBuenos = ot.registros.reduce((acc, r) => acc + Number(r.kgBuenos), 0)
  const kgMerma = ot.registros.reduce((acc, r) => acc + Number(r.kgMerma), 0)
  const kgRechazado = ot.registros.reduce((acc, r) => acc + Number(r.kgRechazado), 0)
  const porcentaje = kgPedidos > 0 ? Math.min(100, Math.round((kgBuenos / kgPedidos) * 100)) : 0
  const restante = Math.max(0, kgPedidos - kgBuenos)

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header con información principal y botón atrás */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b">
        <div className="flex items-center gap-3">
          <Link href="/produccion/ordenes">
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg border">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight">
                OT #{ot.numero} — {ot.producto}
              </h1>
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
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
            <p className="text-xs text-muted-foreground mt-0.5">
              Cliente: <span className="font-semibold text-foreground">{ot.cliente.nombre}</span> • Registrada el{" "}
              {new Date(ot.fechaIngreso).toLocaleDateString("es-BO")}
            </p>
          </div>
        </div>

        {/* Acciones para Admin / Gerencia / Operario */}
        <div className="flex items-center gap-2">
          <Link href="/produccion/registro">
            <Button size="sm" className="gap-1.5 h-9 rounded-xl font-semibold shadow-xs">
              <PlusCircle className="h-4 w-4" /> Registrar Turno
            </Button>
          </Link>

          {(rol === "ADMIN" || rol === "GERENCIA") && (
            <form
              action={async () => {
                "use server"
                const nuevoEstado = ot.estado === "ABIERTA" ? "TERMINADA" : "ABIERTA"
                await cambiarEstadoOrden(ot.id, nuevoEstado)
              }}
            >
              <Button variant="outline" size="sm" className="h-9 rounded-xl text-xs font-medium">
                {ot.estado === "ABIERTA" ? "Marcar Terminada" : "Reabrir Orden"}
              </Button>
            </form>
          )}
        </div>
      </div>

      {/* Tarjetas KPI de Estado de la Orden (info-card-patterns) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="rounded-xl border shadow-xs">
          <CardContent className="p-4 space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Kilos Pedidos</p>
            <p className="text-2xl font-bold tracking-tight">
              {kgPedidos.toFixed(1)} <span className="text-xs font-normal text-muted-foreground">kg</span>
            </p>
            <p className="text-[11px] text-muted-foreground">
              Precio: ${Number(ot.precioUnitario).toFixed(2)}/kg
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-xl border shadow-xs">
          <CardContent className="p-4 space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Fabricados (Buenos)</p>
            <p className="text-2xl font-bold tracking-tight text-emerald-600">
              {kgBuenos.toFixed(1)} <span className="text-xs font-normal text-muted-foreground">kg</span>
            </p>
            <p className="text-[11px] font-semibold text-emerald-700">
              {porcentaje}% completado
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-xl border shadow-xs">
          <CardContent className="p-4 space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Falta Fabricar</p>
            <p className="text-2xl font-bold tracking-tight">
              {restante.toFixed(1)} <span className="text-xs font-normal text-muted-foreground">kg</span>
            </p>
            <p className="text-[11px] text-muted-foreground">
              {restante === 0 ? "Meta alcanzada" : "Pendiente en planta"}
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-xl border shadow-xs">
          <CardContent className="p-4 space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Merma / Desperdicio</p>
            <p className="text-2xl font-bold tracking-tight text-amber-600">
              {kgMerma.toFixed(1)} <span className="text-xs font-normal text-muted-foreground">kg</span>
            </p>
            <p className="text-[11px] text-muted-foreground">
              Rechazos: {kgRechazado.toFixed(1)} kg
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Barra de progreso de avance general */}
      <Card className="rounded-xl border shadow-xs p-4">
        <div className="space-y-2">
          <div className="flex justify-between text-xs font-medium">
            <span>Progreso de Fabricación de la Orden</span>
            <span className="font-bold text-foreground">
              {kgBuenos.toFixed(1)} / {kgPedidos.toFixed(1)} kg ({porcentaje}%)
            </span>
          </div>
          <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
            <div
              className={`h-3 rounded-full transition-all duration-300 ${
                porcentaje >= 100 ? "bg-emerald-500" : "bg-primary"
              }`}
              style={{ width: `${porcentaje}%` }}
            />
          </div>
        </div>
      </Card>

      {/* Ficha técnica del pedido */}
      <Card className="rounded-xl border shadow-xs">
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-sm font-semibold">Especificaciones Técnicas</CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-1">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3 bg-muted/40 rounded-xl">
              <span className="text-muted-foreground block text-[11px]">Producto</span>
              <span className="font-semibold text-foreground text-sm">{ot.producto}</span>
            </div>
            <div className="p-3 bg-muted/40 rounded-xl">
              <span className="text-muted-foreground block text-[11px]">Medida / Espesor</span>
              <span className="font-semibold text-foreground text-sm">{ot.medida || "Estándar"}</span>
            </div>
            <div className="p-3 bg-muted/40 rounded-xl">
              <span className="text-muted-foreground block text-[11px]">Fórmula / Mezcla Nota</span>
              <span className="font-semibold text-foreground text-sm flex items-center gap-1">
                <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                {ot.mezclaNota || "Sin nota de mezcla"}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Historial de Turnos y Pesajes Registrados (Timeline) */}
      <Card className="rounded-xl border shadow-xs">
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-sm font-semibold">Registros de Turno en Planta ({ot.registros.length})</CardTitle>
          <p className="text-xs text-muted-foreground">Historial de pesajes por área</p>
        </CardHeader>
        <CardContent className="p-4 pt-1">
          {ot.registros.length === 0 ? (
            <div className="py-10 text-center text-xs text-muted-foreground">
              <Clock className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
              Aún no se han registrado turnos de producción para esta orden.
            </div>
          ) : (
            <div className="divide-y">
              {ot.registros.map((r) => {
                const entrada = Number(r.kgEntrada)
                const buenos = Number(r.kgBuenos)
                const merma = Number(r.kgMerma)
                const rechazado = Number(r.kgRechazado)
                const rend = entrada > 0 ? Math.round((buenos / entrada) * 100) : 0

                return (
                  <div key={r.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold flex items-center gap-1 ${
                            r.area === "EXTRUSION"
                              ? "bg-amber-500/10 text-amber-700 dark:text-amber-400"
                              : r.area === "IMPRESION"
                              ? "bg-blue-500/10 text-blue-700 dark:text-blue-400"
                              : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                          }`}
                        >
                          {r.area === "EXTRUSION" ? (
                            <Layers className="h-3 w-3" />
                          ) : r.area === "IMPRESION" ? (
                            <Printer className="h-3 w-3" />
                          ) : (
                            <Scissors className="h-3 w-3" />
                          )}
                          {r.area}
                        </span>

                        <span className="text-xs font-semibold text-foreground">
                          Turno {r.turno}
                        </span>

                        <span className="text-xs text-muted-foreground">
                          • Operario: {r.user.nombre}
                        </span>
                      </div>

                      <p className="text-[11px] text-muted-foreground">
                        {new Date(r.createdAt).toLocaleString("es-BO", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                        {r.horasMaquina && ` • ${Number(r.horasMaquina)} hrs máquina`}
                      </p>
                    </div>

                    <div className="flex items-center gap-4 text-xs font-mono">
                      <div>
                        <span className="text-[10px] text-muted-foreground block">Entrada</span>
                        <span className="font-semibold">{entrada.toFixed(1)} kg</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-emerald-600 block">Buenos</span>
                        <span className="font-bold text-emerald-600">{buenos.toFixed(1)} kg</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-amber-600 block">Merma</span>
                        <span className="font-semibold text-amber-600">{merma.toFixed(1)} kg</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-muted-foreground block">Rend.</span>
                        <span className="font-bold text-foreground">{rend}%</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
