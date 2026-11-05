import { prisma } from "@/lib/prisma"
import { kgBuenosFinales } from "@/lib/costos"
import { EntregaForm } from "./entrega-form"

export const dynamic = "force-dynamic"

export default async function EntregaPage({ searchParams }: { searchParams: Promise<{ ot?: string }> }) {
  const { ot } = await searchParams
  const ordenes = await prisma.ordenTrabajo.findMany({
    where: { estado: { not: "ENTREGADA" } },
    orderBy: { numero: "desc" },
    select: {
      id: true,
      numero: true,
      refExterna: true,
      producto: true,
      kgPedidos: true,
      precioUnitario: true,
      cliente: { select: { nombre: true } },
      registros: { select: { area: true, kgBuenos: true } },
      entregas: { select: { kgEntregados: true } },
    },
  })
  const opciones = ordenes.map((o) => ({
    id: o.id,
    etiqueta: `OT ${o.refExterna ?? `#${o.numero}`} · ${o.producto} · ${o.cliente.nombre}`,
    pedido: Number(o.kgPedidos),
    producido: kgBuenosFinales(o.registros),
    entregado: o.entregas.reduce((s, e) => s + Number(e.kgEntregados), 0),
    precio: Number(o.precioUnitario),
  }))
  return <EntregaForm ordenes={opciones} ordenInicial={opciones.some((o) => o.id === ot) ? ot : undefined} />
}
