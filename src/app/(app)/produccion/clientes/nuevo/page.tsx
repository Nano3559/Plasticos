import { NuevoClienteForm } from "./nuevo-cliente-form"

export default async function NuevoClientePage({ searchParams }: { searchParams: Promise<{ volver?: string }> }) {
  const { volver } = await searchParams
  return <NuevoClienteForm volverAOrden={volver === "orden"} />
}
