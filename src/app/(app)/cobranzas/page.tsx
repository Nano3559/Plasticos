import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Plus, Users, Receipt, FileSpreadsheet, Truck, ChevronRight } from "lucide-react"

export default async function CobranzasPage() {
  const clientes = await prisma.cliente.findMany({
    orderBy: { nombre: "asc" },
    include: {
      _count: { select: { ordenes: true, pagos: true } },
    },
  })

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Cobranzas y Cuentas Corrientes</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Registro de notas de remisión, pagos recibidos, cartera y Kardex de clientes
          </p>
        </div>

        <Link href="/cobranzas/kardex">
          <Button size="sm" className="gap-1.5 h-9 rounded-xl font-semibold shadow-xs">
            <FileSpreadsheet className="h-4 w-4" /> Ver Kardex de Clientes
          </Button>
        </Link>
      </div>

      {/* Acciones Rápidas */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <Link href="/cobranzas/kardex" className="block">
          <Button
            variant="outline"
            className="w-full h-16 flex flex-col items-center justify-center gap-1 rounded-xl border hover:border-primary/50 hover:bg-primary/5 transition-all shadow-xs"
          >
            <FileSpreadsheet className="h-5 w-5 text-indigo-600" />
            <span className="text-xs font-semibold">Kardex de Clientes</span>
          </Button>
        </Link>

        <Link href="/cobranzas/pago" className="block">
          <Button
            variant="outline"
            className="w-full h-16 flex flex-col items-center justify-center gap-1 rounded-xl border hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all shadow-xs"
          >
            <Plus className="h-5 w-5 text-emerald-600" />
            <span className="text-xs font-semibold">Registrar Cobro</span>
          </Button>
        </Link>

        <Link href="/cobranzas/entrega" className="block">
          <Button
            variant="outline"
            className="w-full h-16 flex flex-col items-center justify-center gap-1 rounded-xl border hover:border-blue-500/50 hover:bg-blue-500/5 transition-all shadow-xs"
          >
            <Truck className="h-5 w-5 text-blue-600" />
            <span className="text-xs font-semibold">Nueva Entrega</span>
          </Button>
        </Link>

        <Link href="/cobranzas/cartera" className="block">
          <Button
            variant="outline"
            className="w-full h-16 flex flex-col items-center justify-center gap-1 rounded-xl border hover:border-amber-500/50 hover:bg-amber-500/5 transition-all shadow-xs"
          >
            <Users className="h-5 w-5 text-amber-600" />
            <span className="text-xs font-semibold">Cartera por Antigüedad</span>
          </Button>
        </Link>
      </div>

      {/* Listado de Clientes con enlace a Kardex */}
      <Card className="rounded-xl border shadow-xs overflow-hidden">
        <CardHeader className="p-4 pb-3 bg-muted/30 border-b">
          <CardTitle className="text-sm font-semibold">Clientes con Cuenta Corriente</CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-1">
          {clientes.length === 0 ? (
            <div className="py-12 text-center text-xs text-muted-foreground">
              No existen clientes registrados. Importa los archivos Excel desde la pestaña de Kardex.
            </div>
          ) : (
            <div className="divide-y">
              {clientes.map((c) => (
                <Link
                  key={c.id}
                  href={`/cobranzas/kardex?clienteId=${c.id}`}
                  className="py-3.5 flex items-center justify-between hover:bg-muted/50 -mx-4 px-4 transition-colors group"
                >
                  <div>
                    <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                      {c.nombre}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Plazo de crédito: {c.diasCredito} días • {c._count.ordenes} pedidos • {c._count.pagos} pagos
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-semibold text-primary">
                    <span>Ver Kardex</span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
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
