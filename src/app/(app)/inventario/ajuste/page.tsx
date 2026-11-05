import { materialesParaFormulario } from "@/lib/materiales-form"
import { AjusteForm } from "./ajuste-form"

export const dynamic = "force-dynamic"

export default async function AjustePage({ searchParams }: { searchParams: Promise<{ material?: string }> }) {
  const { material } = await searchParams
  const materiales = await materialesParaFormulario()
  return <AjusteForm materiales={materiales} materialInicial={materiales.some((m) => m.id === material) ? material : undefined} />
}
