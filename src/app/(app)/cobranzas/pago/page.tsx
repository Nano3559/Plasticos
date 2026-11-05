import { prisma } from "@/lib/prisma"
import { PagoForm } from "./pago-form"

export default async function PagoPage({ searchParams }: { searchParams: Promise<{ clienteId?: string }> }) {
  const { clienteId } = await searchParams
  const clientes = await prisma.cliente.findMany({
    orderBy: { nombre: "asc" },
  })
  const ordenes = await prisma.ordenTrabajo.findMany({
    orderBy: { fechaIngreso: "desc" },
  })

  // Desde el resumen de un cliente se llega con ?clienteId=…: el formulario lo trae elegido
  const inicial = clientes.some((c) => c.id === clienteId) ? clienteId : undefined
  return <PagoForm clientes={clientes} ordenes={ordenes} clienteInicial={inicial} />
}
