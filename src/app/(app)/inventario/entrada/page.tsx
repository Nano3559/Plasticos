import { prisma } from "@/lib/prisma"
import { EntradaForm } from "./entrada-form"

export const dynamic = "force-dynamic"

export default async function EntradaPage() {
  const materiales = await prisma.material.findMany({
    orderBy: { nombre: "asc" },
    select: {
      id: true,
      nombre: true,
      categoria: true,
      unidad: true,
      costoPromedio: true,
    },
  })

  const serialized = materiales.map((m) => ({
    ...m,
    costoPromedio: Number(m.costoPromedio),
  }))

  return <EntradaForm materiales={serialized} />
}
