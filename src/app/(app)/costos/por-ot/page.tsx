import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { asignarCostosPorOrden, costoPor100kg, kgBuenosFinales, rendimientoOrden } from "@/lib/costos"
import { formatBs, formatKg, formatNumero } from "@/lib/formato"
import { Encabezado } from "@/components/ui/encabezado"
import { EstadoOrden } from "@/components/ui/estado-orden"
import { Vacio } from "@/components/ui/mensaje"

export const dynamic = "force-dynamic"

export default async function CostoPorOtPage() {
  const [ordenes, costos] = await Promise.all([
    prisma.ordenTrabajo.findMany({
      where: { registros: { some: {} } },
      orderBy: { fechaIngreso: "desc" },
      include: { cliente: { select: { nombre: true } }, registros: { select: { area: true, kgBuenos: true, kgEntrada: true } } },
    }),
    asignarCostosPorOrden(),
  ])

  return (
    <div className="space-y-6">
      <Encabezado
        miga={{ href: "/costos", texto: "Costos" }}
        titulo="Costo por orden"
        descripcion="Órdenes con producción registrada. El margen compara el costo por kg con el precio de venta."
      />
      {ordenes.length === 0 ? (
        <Vacio>Todavía no hay órdenes con producción registrada.</Vacio>
      ) : (
        <ul>
          {ordenes.map((ot) => {
            const kg = kgBuenosFinales(ot.registros)
            const c = costos.get(ot.id)
            const total = c?.total ?? 0
            const c100 = costoPor100kg(total, kg)
            const precio = Number(ot.precioUnitario)
            const margen = kg > 0 && total > 0 ? ((precio - total / kg) / precio) * 100 : null
            return (
              <li key={ot.id}>
                <Link href={`/costos/por-ot/${ot.id}`} className="group flex items-start justify-between gap-4 border-b border-line py-3">
                  <span className="min-w-0">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="truncate text-[15px] group-hover:text-brand-ink">
                        OT {ot.refExterna ?? `#${ot.numero}`} · {ot.producto}
                      </span>
                      <EstadoOrden estado={ot.estado} />
                    </span>
                    <span className="mt-0.5 block text-[13px] text-subdued">
                      {ot.cliente.nombre} · {formatKg(kg, 0)} buenos · rinde {formatNumero(rendimientoOrden(ot.registros), 1)}%
                      {!c?.vales && " · sin vales de material"}
                    </span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="block font-bold tabular-nums">{c100 > 0 ? formatBs(c100) : "—"}</span>
                    <span className={`block text-xs ${margen === null ? "text-muted" : margen < 0 ? "font-semibold text-danger" : "text-accent"}`}>
                      {margen === null ? "sin costo" : `margen ${formatNumero(margen, 0)}%`}
                    </span>
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
