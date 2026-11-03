import { prisma } from "@/lib/prisma"
import { PagoForm } from "./pago-form"

export default async function PagoPage() {
  const clientes = await prisma.cliente.findMany({
    orderBy: { nombre: "asc" },
  })
  const ordenes = await prisma.ordenTrabajo.findMany({
    orderBy: { fechaIngreso: "desc" },
  })

  return <PagoForm clientes={clientes} ordenes={ordenes} />
}
