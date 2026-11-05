import { prisma } from "@/lib/prisma"
import { consultarCartera } from "@/lib/cartera"
import { PagoForm } from "./pago-form"

export const dynamic = "force-dynamic"

export default async function PagoPage({ searchParams }: { searchParams: Promise<{ clienteId?: string }> }) {
  const { clienteId } = await searchParams
  const [cartera, ordenes] = await Promise.all([
    consultarCartera(),
    prisma.ordenTrabajo.findMany({
      where: { entregas: { some: {} } },
      orderBy: { numero: "desc" },
      select: { id: true, numero: true, refExterna: true, producto: true, clienteId: true },
    }),
  ])
  const clientes = cartera.map((c) => ({ id: c.cliente.id, nombre: c.cliente.nombre, saldo: c.saldo, aFavor: c.aFavor }))
  return (
    <PagoForm
      clientes={clientes}
      ordenes={ordenes.map((o) => ({ id: o.id, clienteId: o.clienteId, etiqueta: `OT ${o.refExterna ?? `#${o.numero}`} · ${o.producto}` }))}
      clienteInicial={clientes.some((c) => c.id === clienteId) ? clienteId : undefined}
    />
  )
}
