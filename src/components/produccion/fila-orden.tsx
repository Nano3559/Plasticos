import Link from "next/link"
import { EstadoOrden } from "@/components/ui/estado-orden"
import { kgBuenosFinales } from "@/lib/costos"
import { formatKg } from "@/lib/formato"

type OrdenFila = {
  id: string
  numero: number
  refExterna?: string | null
  producto: string
  medida?: string | null
  estado: string
  kgPedidos: unknown
  cliente: { nombre: string }
  registros: { area: "EXTRUSION" | "IMPRESION" | "CONFECCION"; kgBuenos: unknown }[]
}

/**
 * Una OT con su barra de avance. El avance cuenta los kg buenos del último proceso
 * (no la suma de las tres áreas: el mismo material pasa por extrusión, impresión y confección).
 */
export function FilaOrden({ ot }: { ot: OrdenFila }) {
  const hecho = kgBuenosFinales(ot.registros)
  const pedido = Number(ot.kgPedidos)
  const pct = pedido > 0 ? Math.min(100, Math.round((hecho / pedido) * 100)) : 0
  return (
    <Link href={`/produccion/ordenes/${ot.id}`} className="group block border-b border-line py-3 last:border-b-0">
      <div className="flex items-center justify-between gap-3">
        <span className="min-w-0 truncate text-[15px] group-hover:text-brand-ink">
          OT {ot.refExterna ?? `#${ot.numero}`} · {ot.cliente.nombre}
        </span>
        <EstadoOrden estado={ot.estado} />
      </div>
      <p className="mt-0.5 truncate text-sm text-subdued">
        {ot.producto}
        {ot.medida ? ` (${ot.medida})` : ""}
      </p>
      <div className="mt-2 flex items-center gap-3">
        <div
          className="h-1.5 flex-1 overflow-hidden rounded-full bg-black/[0.07]"
          role="progressbar"
          aria-label={`Avance de la OT ${ot.numero}`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={pct}
        >
          <div className={`h-full rounded-full ${pct >= 100 ? "bg-accent" : "bg-info"}`} style={{ width: `${pct}%` }} />
        </div>
        <span className="shrink-0 text-xs tabular-nums text-subdued">
          {formatKg(hecho, 0)} / {formatKg(pedido, 0)}
        </span>
      </div>
    </Link>
  )
}
