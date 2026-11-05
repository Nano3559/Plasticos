import { prisma } from "@/lib/prisma"
import { materialesParaFormulario, textosUsados } from "@/lib/materiales-form"
import { SalidaForm } from "./salida-form"

export const dynamic = "force-dynamic"

export default async function SalidaPage({ searchParams }: { searchParams: Promise<{ material?: string; ot?: string }> }) {
  const { material, ot } = await searchParams
  const [materiales, motivos, ordenes] = await Promise.all([
    materialesParaFormulario(),
    textosUsados("motivo", "SALIDA", 8),
    prisma.ordenTrabajo.findMany({
      where: { estado: "ABIERTA" },
      orderBy: { numero: "desc" },
      select: { id: true, numero: true, refExterna: true, producto: true, cliente: { select: { nombre: true } } },
    }),
  ])
  return (
    <SalidaForm
      materiales={materiales}
      motivosUsados={motivos}
      ordenes={ordenes.map((o) => ({ id: o.id, etiqueta: `OT ${o.refExterna ?? `#${o.numero}`} · ${o.producto} · ${o.cliente.nombre}` }))}
      materialInicial={materiales.some((m) => m.id === material) ? material : undefined}
      ordenInicial={ordenes.some((o) => o.id === ot) ? ot : undefined}
    />
  )
}
