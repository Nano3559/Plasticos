import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowLeft, Plus, Users, Phone, MapPin, ChevronRight, Clock } from "lucide-react"

export default async function ClientesPage() {
  const clientes = await prisma.cliente.findMany({
    orderBy: { nombre: "asc" },
    include: {
      _count: { select: { ordenes: true } },
    },
  })

  return (
    <div className="space-y-5 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b">
        <div className="flex items-center gap-3">
          <Link href="/produccion">
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg border">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Directorio de Clientes</h1>
            <p className="text-xs text-muted-foreground">{clientes.length} clientes registrados</p>
          </div>
        </div>

        <Link href="/produccion/clientes/nuevo">
          <Button size="sm" className="gap-1.5 h-9 rounded-xl font-semibold shadow-xs">
            <Plus className="h-4 w-4" /> Nuevo Cliente
          </Button>
        </Link>
      </div>

      {/* Lista de Clientes (list-page-patterns) */}
      <Card className="rounded-xl border shadow-xs overflow-hidden">
        <CardHeader className="p-4 pb-3 bg-muted/30 border-b">
          <CardTitle className="text-sm font-semibold">Clientes Activos</CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-1">
          {clientes.length === 0 ? (
            <div className="py-12 text-center text-xs text-muted-foreground">
              <Users className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
              No existen clientes registrados todavía.
            </div>
          ) : (
            <div className="divide-y">
              {clientes.map((c) => (
                <Link
                  key={c.id}
                  href={`/cobranzas/cliente/${c.id}`}
                  className="py-3.5 flex items-center justify-between hover:bg-muted/50 -mx-4 px-4 transition-colors group"
                >
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                      {c.nombre}
                    </p>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      {c.contacto && <span>Contacto: {c.contacto}</span>}
                      {c.telefono && (
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3" /> {c.telefono}
                        </span>
                      )}
                      {c.direccion && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" /> {c.direccion}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-right">
                    <div>
                      <span className="text-xs font-semibold text-foreground block">
                        {c._count.ordenes} {c._count.ordenes === 1 ? "orden" : "órdenes"}
                      </span>
                      <span className="text-[11px] text-muted-foreground flex items-center gap-1 justify-end">
                        <Clock className="h-2.5 w-2.5" /> {c.diasCredito} días crédito
                      </span>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
