import Link from "next/link"
import { notFound } from "next/navigation"
import { Plus } from "lucide-react"
import { prisma } from "@/lib/prisma"
import { getSessionUser } from "@/lib/session"
import { cambiarEstadoOrden } from "@/actions/produccion"
import { kgBuenosFinales } from "@/lib/costos"
import { formatKg, formatNumero, formatPrecio } from "@/lib/formato"
import { AREA_NOMBRE, TURNO_ETIQUETA } from "@/lib/etiquetas"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Cifras } from "@/components/ui/cifras"
import { Encabezado } from "@/components/ui/encabezado"
import { EstadoOrden } from "@/components/ui/estado-orden"
import { Seccion } from "@/components/ui/seccion"

export const dynamic = "force-dynamic"

const AREAS = ["EXTRUSION", "IMPRESION", "CONFECCION"] as const
const fechaHora = (d: Date) =>
  d.toLocaleString("es-BO", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "America/La_Paz" }).replace(".", "")
const fecha = (d: Date) => d.toLocaleDateString("es-BO", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }).replace(".", "")

export default async function DetalleOrdenPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getSessionUser()
  const gestiona = user?.rol === "ADMIN" || user?.rol === "GERENCIA"

  const ot = await prisma.ordenTrabajo.findUnique({
    where: { id },
    include: {
      cliente: true,
      registros: { include: { user: { select: { nombre: true } } }, orderBy: { createdAt: "desc" } },
      entregas: { orderBy: { fecha: "desc" } },
      movimientos: {
        where: { tipo: "SALIDA" },
        orderBy: { createdAt: "desc" },
        include: { material: { select: { nombre: true, unidad: true } } },
      },
    },
  })
  if (!ot) notFound()

  const pedido = Number(ot.kgPedidos)
  const terminado = kgBuenosFinales(ot.registros)
  const pct = pedido > 0 ? Math.min(100, Math.round((terminado / pedido) * 100)) : 0
  const merma = ot.registros.reduce((s, r) => s + Number(r.kgMerma), 0)
  const rechazo = ot.registros.reduce((s, r) => s + Number(r.kgRechazado), 0)
  const entregado = ot.entregas.reduce((s, e) => s + Number(e.kgEntregados), 0)
  const porArea = AREAS.map((a) => {
    const regs = ot.registros.filter((r) => r.area === a)
    return { area: a, buenos: regs.reduce((s, r) => s + Number(r.kgBuenos), 0), pesajes: regs.length }
  })
  const etiquetaOT = ot.refExterna ?? `#${ot.numero}`
  const siguiente = ot.estado === "ABIERTA" ? "TERMINADA" : "ABIERTA"

  return (
    <div className="space-y-10">
      <Encabezado
        miga={[
          { href: "/produccion", texto: "Producción" },
          { href: "/produccion/ordenes", texto: "Órdenes" },
        ]}
        titulo={
          <span className="flex flex-wrap items-center gap-3">
            OT {etiquetaOT} · {ot.producto}
            <EstadoOrden estado={ot.estado} />
          </span>
        }
        descripcion={
          <>
            {ot.cliente.nombre}
            {ot.medida && ` · ${ot.medida}`} · ingresó el {fecha(ot.fechaIngreso)}
            {gestiona && ` · ${formatPrecio(ot.precioUnitario)}/kg`}
          </>
        }
        acciones={
          <>
            <Button asChild size="sm" variant="outline"><Link href={`/produccion/extrusion?ot=${ot.id}`}>Parte de extrusión</Link></Button>
            <Button asChild size="sm" variant="outline"><Link href={`/produccion/impresion?ot=${ot.id}`}>Parte de impresión</Link></Button>
            <Button asChild size="sm" variant="outline"><Link href={`/produccion/confeccion?ot=${ot.id}`}>Parte de confección</Link></Button>
            {ot.estado === "ABIERTA" && (
              <Button asChild size="sm">
                <Link href={`/produccion/registro?ot=${ot.id}`}>
                  <Plus /> Registrar producción
                </Link>
              </Button>
            )}
            {gestiona && ot.estado !== "ENTREGADA" && terminado > entregado + 0.5 && (
              <Button asChild size="sm" variant="outline">
                <Link href={`/cobranzas/entrega?ot=${ot.id}`}>Registrar entrega</Link>
              </Button>
            )}
            {gestiona && ot.estado !== "ENTREGADA" && (
              <form
                action={async () => {
                  "use server"
                  await cambiarEstadoOrden(ot.id, siguiente)
                }}
              >
                <Button variant="outline" size="sm">
                  {ot.estado === "ABIERTA" ? "Marcar como producida" : "Reabrir"}
                </Button>
              </form>
            )}
          </>
        }
      />

      {ot.mezclaNota && (
        <p className="rounded-lg bg-elevated px-4 py-3 text-sm">
          <span className="font-semibold">Mezcla:</span> {ot.mezclaNota}
        </p>
      )}

      <div className="space-y-3">
        <Cifras
          items={[
            { etiqueta: "Pedido", valor: formatKg(pedido, 0) },
            { etiqueta: "Producto terminado", valor: formatKg(terminado, 1), nota: `${pct}% del pedido`, tono: pct >= 100 ? "accent" : undefined },
            { etiqueta: "Falta", valor: formatKg(Math.max(0, pedido - terminado), 1), nota: pct >= 100 ? "Pedido completo" : undefined },
            { etiqueta: "Entregado", valor: formatKg(entregado, 1), nota: `${ot.entregas.length} ${ot.entregas.length === 1 ? "entrega" : "entregas"}` },
          ]}
        />
        <div
          className="h-2 overflow-hidden rounded-full bg-black/[0.07]"
          role="progressbar"
          aria-label="Avance del pedido"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={pct}
        >
          <div className={`h-full rounded-full ${pct >= 100 ? "bg-accent" : "bg-info"}`} style={{ width: `${pct}%` }} />
        </div>
      </div>

      <Seccion titulo="Por área">
        <Card className="mt-2 grid gap-0 py-0 sm:grid-cols-3">
          {porArea.map((a, i) => (
            <div key={a.area} className={`px-5 py-4 ${i > 0 ? "border-t border-line sm:border-l sm:border-t-0" : ""}`}>
              <p className="text-sm font-semibold">{AREA_NOMBRE[a.area]}</p>
              <p className="mt-1 text-[20px] font-extrabold tabular-nums">{formatKg(a.buenos, 1)}</p>
              <p className="mt-0.5 text-xs text-muted">
                {a.pesajes === 0 ? "Sin pesajes" : `${a.pesajes} ${a.pesajes === 1 ? "pesaje" : "pesajes"}`}
              </p>
            </div>
          ))}
        </Card>
        <p className="mt-2 text-xs text-muted">
          Merma total {formatKg(merma, 1)} · rechazo {formatKg(rechazo, 1)}
        </p>
      </Seccion>

      <Seccion titulo="Pesajes" cuenta={ot.registros.length}>
        {ot.registros.length === 0 ? (
          <p className="py-6 text-subdued">Todavía no se registró producción para esta orden.</p>
        ) : (
          <ul>
            {ot.registros.map((r) => {
              const entrada = Number(r.kgEntrada)
              const rend = entrada > 0 ? (Number(r.kgBuenos) / entrada) * 100 : 0
              const rech = Number(r.kgRechazado)
              return (
                <li key={r.id} className="flex items-start justify-between gap-4 border-b border-line py-3 last:border-b-0">
                  <div className="min-w-0">
                    <p className="font-semibold">
                      {AREA_NOMBRE[r.area]} <span className="font-normal text-subdued">· turno {TURNO_ETIQUETA[r.turno].toLowerCase()}</span>
                    </p>
                    <p className="mt-0.5 text-[13px] text-subdued">
                      Entraron {formatKg(entrada, 1)} · merma {formatKg(r.kgMerma, 1)}
                      {r.horasMaquina && ` · ${formatNumero(r.horasMaquina, 1)} h de máquina`}
                    </p>
                    {rech > 0 && (
                      <p className="mt-0.5 text-[13px] font-medium text-danger">
                        Rechazo {formatKg(rech, 1)}
                        {r.rechazoProveedor && ` · ${r.rechazoProveedor}`}
                        {r.rechazoLote && ` · lote ${r.rechazoLote}`}
                        {r.rechazoMotivo && ` · ${r.rechazoMotivo}`}
                      </p>
                    )}
                    <p className="mt-0.5 text-xs text-muted">
                      {fechaHora(r.createdAt)} · {r.user.nombre}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-bold tabular-nums">{formatKg(r.kgBuenos, 1)}</p>
                    <p className="text-xs text-muted">rinde {formatNumero(rend, 0)}%</p>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </Seccion>

      <div className="grid gap-10 lg:grid-cols-2">
        <Seccion titulo="Material de almacén" cuenta={ot.movimientos.length}>
          {ot.movimientos.length === 0 ? (
            <p className="py-6 text-subdued">No hay vales de salida ligados a esta orden.</p>
          ) : (
            <ul>
              {ot.movimientos.map((m) => (
                <li key={m.id} className="flex items-center justify-between gap-3 border-b border-line py-3 last:border-b-0">
                  <span className="min-w-0">
                    <span className="block truncate">{m.material.nombre}</span>
                    <span className="text-xs text-muted">{fechaHora(m.createdAt)}</span>
                  </span>
                  <span className="shrink-0 font-semibold tabular-nums">
                    {formatNumero(m.cantidad, 1)} {m.material.unidad}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Seccion>

        <Seccion titulo="Entregas al cliente" cuenta={ot.entregas.length}>
          {ot.entregas.length === 0 ? (
            <p className="py-6 text-subdued">Todavía no se entregó nada de esta orden.</p>
          ) : (
            <ul>
              {ot.entregas.map((e) => (
                <li key={e.id} className="flex items-center justify-between gap-3 border-b border-line py-3 last:border-b-0">
                  <span>
                    {fecha(e.fecha)}
                    {e.notaRemision && <span className="text-subdued"> · N.R. {e.notaRemision}</span>}
                    {e.bultos && <span className="text-subdued"> · {formatNumero(e.bultos, 1)} bultos</span>}
                  </span>
                  <span className="shrink-0 font-semibold tabular-nums">{formatKg(e.kgEntregados, 1)}</span>
                </li>
              ))}
            </ul>
          )}
        </Seccion>
      </div>
    </div>
  )
}
