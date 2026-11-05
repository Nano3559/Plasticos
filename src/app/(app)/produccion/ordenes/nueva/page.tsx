import { prisma } from "@/lib/prisma"
import { NuevaOrdenForm } from "./nueva-orden-form"

export const dynamic = "force-dynamic"

export default async function NuevaOrdenPage({ searchParams }: { searchParams: Promise<{ cliente?: string }> }) {
  const { cliente } = await searchParams
  const clientes = await prisma.cliente.findMany({ orderBy: { nombre: "asc" }, select: { id: true, nombre: true } })
  // Mezclas usadas antes, para escribirlas siempre igual
  const mezclas = await prisma.ordenTrabajo.findMany({
    where: { mezclaNota: { not: null } },
    distinct: ["mezclaNota"],
    orderBy: { fechaIngreso: "desc" },
    take: 20,
    select: { mezclaNota: true },
  })
  return (
    <NuevaOrdenForm
      clientes={clientes}
      clienteInicial={clientes.some((c) => c.id === cliente) ? cliente : undefined}
      mezclas={mezclas.map((m) => m.mezclaNota!).filter(Boolean)}
    />
  )
}
