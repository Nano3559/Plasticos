import { EstadoOrden } from "@/components/ui/estado-orden"
import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowLeft, Plus, FileText } from "lucide-react"
import { auth } from "@/auth"

export default async function OrdenesPage() {
  const session = await auth()
  const rol = session?.user?.rol

  const ordenes = await prisma.ordenTrabajo.findMany({
    orderBy: { numero: "desc" },
    include: {
      cliente: { select: { nombre: true } },
      registros: { select: { kgBuenos: true, kgMerma: true } },
    },
  })

  const totalAbiertas = ordenes.filter((o) => o.estado === "ABIERTA").length
  const totalTerminadas = ordenes.filter((o) => o.estado === "TERMINADA").length
  const totalEntregadas = ordenes.filter((o) => o.estado === "ENTREGADA").length

  return (
    <div className="space-y-5 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b">
        <div className="flex items-center gap-3">
          <Link href="/produccion">
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg border">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Órdenes de Trabajo</h1>
            <p className="text-xs text-muted-foreground">
              {ordenes.length} órdenes en total • {totalAbiertas} en producción • {totalTerminadas} producidas • {totalEntregadas} entregadas
            </p>
          </div>
        </div>

        {(rol === "ADMIN" || rol === "GERENCIA") && (
          <Link href="/produccion/ordenes/nueva">
            <Button size="sm" className="gap-1.5 h-9 rounded-xl font-semibold shadow-xs">
              <Plus className="h-4 w-4" /> Nueva Orden
            </Button>
          </Link>
        )}
      </div>

      {/* Listado con Cards Responsivas (list-page-patterns) */}
      <Card className="rounded-xl border shadow-xs overflow-hidden">
        <CardHeader className="p-4 pb-3 bg-black/[0.03] border-b">
          <CardTitle className="text-sm font-semibold">Listado de Órdenes de Trabajo</CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-1">
          {ordenes.length === 0 ? (
            <div className="py-12 text-center text-xs text-muted-foreground">
              <FileText className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
              No existen órdenes de trabajo creadas todavía.
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
                    className="py-4 flex flex-col gap-2 hover:bg-black/[0.03] -mx-4 px-4 transition-colors block"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-foreground">
                          OT #{ot.numero}
                        </span>
                        <span className="text-xs text-muted-foreground">• {ot.cliente.nombre}</span>
                      </div>
                      <EstadoOrden estado={ot.estado} />
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-xs text-muted-foreground gap-1">
                      <span className="font-medium text-foreground">
                        {ot.producto} {ot.medida ? `• Medida: ${ot.medida}` : ""}
                      </span>
                      <span className="font-semibold text-foreground">
                        {kgFabricados.toFixed(1)} / {kgPedidos.toFixed(1)} kg ({porcentaje}%)
                      </span>
                    </div>

                    {/* Barra de progreso */}
                    <div className="w-full bg-elevated rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-2 rounded-full transition-all duration-300 ${
 porcentaje >= 100 ? "bg-accent" : "bg-info"
 }`}
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
