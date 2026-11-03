import { prisma } from "@/lib/prisma"
import { EntregaForm } from "./entrega-form"

export const dynamic = "force-dynamic"

export default async function EntregaPage() {
  const ordenes = await prisma.ordenTrabajo.findMany({
    orderBy: { fechaIngreso: "desc" },
    include: { cliente: true },
  })

  const serialized = ordenes.map((ot) => ({
    id: ot.id,
    numero: ot.numero,
    producto: ot.producto,
    kgPedidos: Number(ot.kgPedidos),
    precioUnitario: Number(ot.precioUnitario),
    cliente: {
      id: ot.cliente.id,
      nombre: ot.cliente.nombre,
    },
  }))

  return <EntregaForm ordenes={serialized} />
}
