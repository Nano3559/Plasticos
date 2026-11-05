import Link from "next/link"
import { FileText, Plus } from "lucide-react"
import { getSessionUser } from "@/lib/session"
import { prisma } from "@/lib/prisma"
import { Button } from "@/components/ui/button"
import { Encabezado } from "@/components/ui/encabezado"
import { Vacio } from "@/components/ui/mensaje"
import { FilaOrden } from "@/components/produccion/fila-orden"

export const dynamic = "force-dynamic"

const PESTANAS = [
  { valor: "ABIERTA", texto: "En producción" },
  { valor: "TERMINADA", texto: "Producidas" },
  { valor: "ENTREGADA", texto: "Entregadas" },
  { valor: "TODAS", texto: "Todas" },
] as const

export default async function OrdenesPage({ searchParams }: { searchParams: Promise<{ estado?: string }> }) {
  const user = await getSessionUser()
  const gestiona = user?.rol === "ADMIN" || user?.rol === "GERENCIA"
  const pedido = (await searchParams).estado
  const estado = PESTANAS.some((p) => p.valor === pedido) ? pedido! : "ABIERTA"

  const [ordenes, conteo] = await Promise.all([
    prisma.ordenTrabajo.findMany({
      where: estado === "TODAS" ? {} : { estado },
      orderBy: { numero: "desc" },
      include: { cliente: { select: { nombre: true } }, registros: { select: { area: true, kgBuenos: true } } },
    }),
    prisma.ordenTrabajo.groupBy({ by: ["estado"], _count: true }),
  ])
  const cuenta = (v: string) =>
    v === "TODAS" ? conteo.reduce((s, c) => s + c._count, 0) : (conteo.find((c) => c.estado === v)?._count ?? 0)

  return (
    <div className="space-y-6">
      <Encabezado
        miga={{ href: "/produccion", texto: "Producción" }}
        titulo="Órdenes de trabajo"
        descripcion="Cada pedido con su avance: kg buenos del último proceso frente a los kg pedidos."
        acciones={
          gestiona && (
            <Button asChild size="sm">
              <Link href="/produccion/ordenes/nueva">
                <Plus /> Nueva orden
              </Link>
            </Button>
          )
        }
      />

      <nav aria-label="Estado" className="flex flex-wrap gap-2 border-b border-line pb-3">
        {PESTANAS.map((p) => {
          const activo = p.valor === estado
          return (
            <Link
              key={p.valor}
              href={p.valor === "ABIERTA" ? "/produccion/ordenes" : `/produccion/ordenes?estado=${p.valor}`}
              aria-current={activo ? "page" : undefined}
              className={`inline-flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium transition ${
                activo ? "border-brand bg-brand-soft text-brand-ink" : "border-line text-subdued hover:bg-elevated"
              }`}
            >
              {p.texto}
              <span className="text-xs tabular-nums opacity-70">{cuenta(p.valor)}</span>
            </Link>
          )
        })}
      </nav>

      {ordenes.length === 0 ? (
        <Vacio icono={FileText}>No hay órdenes en este estado.</Vacio>
      ) : (
        <div>
          {ordenes.map((ot) => (
            <FilaOrden key={ot.id} ot={ot} />
          ))}
        </div>
      )}
    </div>
  )
}
