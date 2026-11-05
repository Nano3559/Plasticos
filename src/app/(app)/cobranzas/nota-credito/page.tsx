import { prisma } from "@/lib/prisma"
import { NotaCreditoForm, type OrdenParaNota } from "./nota-credito-form"

export const dynamic = "force-dynamic"

export default async function NotaCreditoPage({ searchParams }: { searchParams: Promise<{ clienteId?: string }> }) {
  const { clienteId } = await searchParams
  const clientes = await prisma.cliente.findMany({ orderBy: { nombre: "asc" }, select: { id: true, nombre: true } })
  const ordenes = await prisma.ordenTrabajo.findMany({
    where: { entregas: { some: {} } },
    orderBy: { fechaIngreso: "desc" },
    select: {
      id: true, numero: true, refExterna: true, clienteId: true, producto: true, medida: true, precioUnitario: true,
      entregas: { select: { kgEntregados: true, notaRemision: true, fecha: true }, orderBy: { fecha: "desc" } },
      notasCredito: { where: { tipo: "DEVOLUCION", anuladaEn: null }, select: { kg: true } },
    },
  })

  const opciones: OrdenParaNota[] = ordenes.map((o) => {
    const entregado = o.entregas.reduce((s, e) => s + Number(e.kgEntregados), 0)
    const devuelto = o.notasCredito.reduce((s, n) => s + Number(n.kg ?? 0), 0)
    return {
      id: o.id,
      clienteId: o.clienteId,
      etiqueta: `OT ${o.refExterna ?? `#${o.numero}`} · ${o.producto}${o.medida ? ` ${o.medida}` : ""}`,
      precio: Number(o.precioUnitario),
      disponibleKg: Math.round((entregado - devuelto) * 100) / 100,
      remisiones: [...new Set(o.entregas.map((e) => e.notaRemision).filter((x): x is string => !!x))],
      ultimaEntrega: o.entregas[0]?.fecha.toISOString() ?? null,
    }
  })

  const inicial = clientes.some((c) => c.id === clienteId) ? clienteId : undefined
  return <NotaCreditoForm clientes={clientes} ordenes={opciones} clienteInicial={inicial} />
}
