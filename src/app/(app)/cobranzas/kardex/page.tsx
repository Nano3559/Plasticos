import { prisma } from "@/lib/prisma"
import { obtenerKardexCompleto } from "@/actions/kardex"
import { KardexView } from "./kardex-view"
import { getSessionUser } from "@/lib/session"

export default async function KardexPage({
  searchParams,
}: {
  searchParams: Promise<{ clienteId?: string }>
}) {
  const { clienteId } = await searchParams

  const clientes = await prisma.cliente.findMany({
    orderBy: { nombre: "asc" },
    select: { id: true, nombre: true, telefono: true, diasCredito: true },
  })

  const selectedClienteId = clienteId || clientes[0]?.id || ""

  let kardexData = null
  if (selectedClienteId) {
    kardexData = await obtenerKardexCompleto(selectedClienteId)
  }

  const user = await getSessionUser()

  return (
    <KardexView
      puedeAnular={user?.rol === "GERENCIA"}
      clientes={clientes}
      selectedClienteId={selectedClienteId}
      kardexData={kardexData}
    />
  )
}
