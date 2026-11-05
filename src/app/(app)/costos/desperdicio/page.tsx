import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { formatKg, formatNumero } from "@/lib/formato"
import { AREA_NOMBRE } from "@/lib/etiquetas"
import { Card } from "@/components/ui/card"
import { Cifras } from "@/components/ui/cifras"
import { Encabezado } from "@/components/ui/encabezado"
import { Vacio } from "@/components/ui/mensaje"
import { Seccion } from "@/components/ui/seccion"

export const dynamic = "force-dynamic"

const AREAS = ["EXTRUSION", "IMPRESION", "CONFECCION"] as const
type Suma = { entrada: number; buenos: number; merma: number; rechazo: number }
const vacia = (): Suma => ({ entrada: 0, buenos: 0, merma: 0, rechazo: 0 })
const pct = (s: Suma) => (s.entrada > 0 ? ((s.merma + s.rechazo) / s.entrada) * 100 : 0)
/** Rojo por encima de este % de desperdicio en un área. */
const ALTO = 8

export default async function DesperdicioPage() {
  const ordenes = await prisma.ordenTrabajo.findMany({
    where: { registros: { some: {} } },
    orderBy: { fechaIngreso: "desc" },
    include: { cliente: { select: { nombre: true } }, registros: { select: { area: true, kgEntrada: true, kgBuenos: true, kgMerma: true, kgRechazado: true } } },
  })

  const planta = Object.fromEntries(AREAS.map((a) => [a, vacia()])) as Record<(typeof AREAS)[number], Suma>
  const filas = ordenes.map((ot) => {
    const porArea = Object.fromEntries(AREAS.map((a) => [a, vacia()])) as Record<(typeof AREAS)[number], Suma>
    for (const r of ot.registros) {
      for (const s of [porArea[r.area], planta[r.area]]) {
        s.entrada += Number(r.kgEntrada)
        s.buenos += Number(r.kgBuenos)
        s.merma += Number(r.kgMerma)
        s.rechazo += Number(r.kgRechazado)
      }
    }
    const total = AREAS.reduce((acc, a) => ({ entrada: acc.entrada + porArea[a].entrada, buenos: 0, merma: acc.merma + porArea[a].merma, rechazo: acc.rechazo + porArea[a].rechazo }), vacia())
    return { ot, porArea, total }
  })
  const totalPlanta = AREAS.reduce(
    (acc, a) => ({ entrada: acc.entrada + planta[a].entrada, buenos: acc.buenos + planta[a].buenos, merma: acc.merma + planta[a].merma, rechazo: acc.rechazo + planta[a].rechazo }),
    vacia()
  )

  return (
    <div className="space-y-10">
      <Encabezado
        miga={{ href: "/costos", texto: "Costos" }}
        titulo="Desperdicio"
        descripcion="Lo que entra a cada área menos lo bueno que sale. La merma vuelve a molienda; el rechazo es material malo."
      />

      <Cifras
        items={[
          { etiqueta: "Desperdicio de planta", valor: `${formatNumero(pct(totalPlanta), 1)}%`, nota: "de lo que entra a las áreas", tono: pct(totalPlanta) > ALTO ? "danger" : undefined },
          { etiqueta: "Merma", valor: formatKg(totalPlanta.merma, 0), nota: "recuperable" },
          { etiqueta: "Rechazo", valor: formatKg(totalPlanta.rechazo, 0), nota: "material malo" },
          { etiqueta: "Procesado", valor: formatKg(totalPlanta.entrada, 0), nota: "suma de las tres áreas" },
        ]}
      />

      <Seccion titulo="Por área">
        <Card className="mt-2 grid gap-0 py-0 sm:grid-cols-3">
          {AREAS.map((a, i) => (
            <div key={a} className={`px-5 py-4 ${i > 0 ? "border-t border-line sm:border-l sm:border-t-0" : ""}`}>
              <p className="text-sm font-semibold">{AREA_NOMBRE[a]}</p>
              <p className={`mt-1 text-[22px] font-extrabold tabular-nums ${pct(planta[a]) > ALTO ? "text-danger" : ""}`}>{formatNumero(pct(planta[a]), 1)}%</p>
              <p className="mt-0.5 text-xs text-muted">
                merma {formatKg(planta[a].merma, 0)} · rechazo {formatKg(planta[a].rechazo, 0)}
              </p>
            </div>
          ))}
        </Card>
        <p className="mt-2 text-xs text-muted">En rojo, más de {ALTO}% de desperdicio.</p>
      </Seccion>

      <Seccion titulo="Por orden" cuenta={filas.length}>
        {filas.length === 0 ? (
          <Vacio>Todavía no hay producción registrada.</Vacio>
        ) : (
          <ul>
            {filas.map(({ ot, porArea, total }) => (
              <li key={ot.id}>
                <Link href={`/costos/por-ot/${ot.id}`} className="group flex items-start justify-between gap-4 border-b border-line py-3">
                  <span className="min-w-0">
                    <span className="block truncate text-[15px] group-hover:text-brand-ink">
                      OT {ot.refExterna ?? `#${ot.numero}`} · {ot.producto}
                    </span>
                    <span className="mt-0.5 block text-[13px] text-subdued">
                      {ot.cliente.nombre} ·{" "}
                      {AREAS.filter((a) => porArea[a].entrada > 0)
                        .map((a) => `${AREA_NOMBRE[a]} ${formatNumero(pct(porArea[a]), 1)}%`)
                        .join(" · ")}
                    </span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className={`block font-bold tabular-nums ${pct(total) > ALTO ? "text-danger" : ""}`}>{formatNumero(pct(total), 1)}%</span>
                    <span className="block text-xs text-muted">{formatKg(total.merma + total.rechazo, 1)}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Seccion>
    </div>
  )
}
