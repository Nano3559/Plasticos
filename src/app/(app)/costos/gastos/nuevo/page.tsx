import { prisma } from "@/lib/prisma"
import { CATEGORIAS_GASTO } from "@/lib/schemas/gastos"
import { GastoForm } from "./gasto-form"

export const dynamic = "force-dynamic"

export default async function NuevoGastoPage() {
  // Las categorías sugeridas más las que ya se usaron, para escribir siempre igual
  const usadas = await prisma.gasto.findMany({ distinct: ["categoria"], select: { categoria: true } })
  const extra = usadas.map((u) => u.categoria).filter((c) => !(CATEGORIAS_GASTO as readonly string[]).includes(c))
  return <GastoForm categorias={[...CATEGORIAS_GASTO, ...extra.sort((a, b) => a.localeCompare(b, "es"))]} />
}
