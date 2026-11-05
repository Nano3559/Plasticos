import { materialesParaFormulario, textosUsados } from "@/lib/materiales-form"
import { EntradaForm } from "./entrada-form"

export const dynamic = "force-dynamic"

export default async function EntradaPage({ searchParams }: { searchParams: Promise<{ material?: string }> }) {
  const { material } = await searchParams
  const [materiales, proveedores] = await Promise.all([materialesParaFormulario(), textosUsados("proveedor", "ENTRADA")])
  return (
    <EntradaForm
      materiales={materiales}
      proveedores={proveedores}
      materialInicial={materiales.some((m) => m.id === material) ? material : undefined}
    />
  )
}
