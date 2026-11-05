import Link from "next/link"
import { Plus, Users } from "lucide-react"
import { prisma } from "@/lib/prisma"
import { Button } from "@/components/ui/button"
import { Encabezado } from "@/components/ui/encabezado"
import { Vacio } from "@/components/ui/mensaje"

export const dynamic = "force-dynamic"

export default async function ClientesPage() {
  const clientes = await prisma.cliente.findMany({
    orderBy: { nombre: "asc" },
    include: { _count: { select: { ordenes: true } } },
  })

  return (
    <div className="space-y-6">
      <Encabezado
        miga={{ href: "/produccion", texto: "Producción" }}
        titulo="Clientes"
        descripcion={`${clientes.length} ${clientes.length === 1 ? "cliente" : "clientes"}. Toca uno para ver su cuenta y sus órdenes.`}
        acciones={
          <Button asChild size="sm">
            <Link href="/produccion/clientes/nuevo">
              <Plus /> Cliente nuevo
            </Link>
          </Button>
        }
      />

      {clientes.length === 0 ? (
        <Vacio icono={Users}>Todavía no hay clientes.</Vacio>
      ) : (
        <ul>
          {clientes.map((c) => (
            <li key={c.id}>
              <Link
                href={`/cobranzas/cliente/${c.id}`}
                className="group flex items-start justify-between gap-4 border-b border-line py-3"
              >
                <span className="min-w-0">
                  <span className="block truncate text-[15px] group-hover:text-brand-ink">{c.nombre}</span>
                  <span className="mt-0.5 block text-[13px] text-subdued">
                    {[c.contacto, c.telefono, c.direccion].filter(Boolean).join(" · ") || "Sin datos de contacto"}
                  </span>
                </span>
                <span className="shrink-0 text-right text-[13px] text-subdued">
                  <span className="block">
                    {c._count.ordenes} {c._count.ordenes === 1 ? "orden" : "órdenes"}
                  </span>
                  <span className="block text-xs text-muted">{c.diasCredito} días de crédito</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
