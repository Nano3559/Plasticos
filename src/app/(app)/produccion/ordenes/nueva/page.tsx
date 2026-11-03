import { prisma } from "@/lib/prisma"
import { NuevaOrdenForm } from "./nueva-orden-form"

export default async function NuevaOrdenPage() {
  const clientes = await prisma.cliente.findMany({
    orderBy: { nombre: "asc" },
  })

  return <NuevaOrdenForm clientes={clientes} />
}
