import Link from "next/link"
import { Download, PackageX } from "lucide-react"
import { prisma } from "@/lib/prisma"
import { formatKg, formatNumero } from "@/lib/formato"
import { claveProveedor, leerPeriodoRechazo, PERIODOS_RECHAZO, resumirPorProveedor } from "@/lib/rechazos"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Seccion } from "@/components/ui/seccion"

export const dynamic = "force-dynamic"

const fecha = (d: Date) =>
  d.toLocaleDateString("es-BO", { day: "2-digit", month: "short", year: "numeric", timeZone: "America/La_Paz" }).replace(".", "")
const pct = (n: number | null) => (n === null ? "—" : `${formatNumero(n, 1)}%`)

/** Por encima de este % de rechazo, el proveedor se marca en rojo. */
const UMBRAL_ALTO = 5

export default async function RechazosPage({ searchParams }: { searchParams: Promise<{ meses?: string; proveedor?: string }> }) {
  const { meses: mesesParam, proveedor: filtro } = await searchParams
  const meses = leerPeriodoRechazo(mesesParam)
  const desde = new Date()
  desde.setMonth(desde.getMonth() - meses)

  const [entradas, rechazos] = await Promise.all([
    prisma.movimientoInventario.findMany({
      where: { tipo: "ENTRADA", createdAt: { gte: desde } },
      select: { proveedor: true, cantidad: true },
    }),
    prisma.registroProduccion.findMany({
      where: { area: "EXTRUSION", kgRechazado: { gt: 0 }, createdAt: { gte: desde } },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        createdAt: true,
        kgRechazado: true,
        rechazoProveedor: true,
        rechazoLote: true,
        rechazoMotivo: true,
        rechazoNota: true,
        turno: true,
        user: { select: { nombre: true } },
        orden: { select: { id: true, numero: true, refExterna: true, cliente: { select: { nombre: true } } } },
        rechazoEntrada: { select: { material: { select: { nombre: true } } } },
      },
    }),
  ])

  const filas = resumirPorProveedor(
    entradas,
    rechazos.map((r) => ({ proveedor: r.rechazoProveedor, kgRechazado: r.kgRechazado, motivo: r.rechazoMotivo, lote: r.rechazoLote }))
  )
  const conRechazo = filas.filter((f) => f.rechazos > 0)
  const totalRechazado = conRechazo.reduce((s, f) => s + f.kgRechazados, 0)
  const totalRecibido = filas.reduce((s, f) => s + f.kgRecibidos, 0)

  const seleccion = filtro ? filas.find((f) => f.clave === filtro) : undefined
  const detalle = seleccion
    ? rechazos.filter((r) => claveProveedor(r.rechazoProveedor?.trim() || "Sin proveedor") === seleccion.clave)
    : rechazos
  const url = (p: { meses?: number; proveedor?: string | null }) => {
    const q = new URLSearchParams()
    const m = p.meses ?? meses
    if (m !== 6) q.set("meses", String(m))
    const prov = p.proveedor === undefined ? filtro : p.proveedor
    if (prov) q.set("proveedor", prov)
    const s = q.toString()
    return `/inventario/rechazos${s ? `?${s}` : ""}`
  }

  return (
    <div className="max-w-5xl space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-subdued">
            <Link href="/inventario" className="hover:text-brand-ink hover:underline">
              Inventario
            </Link>
          </p>
          <h1 className="mt-1 text-[26px] font-bold leading-tight sm:text-[28px]">Rechazos por proveedor</h1>
          <p className="mt-1 text-subdued">Material rechazado en extrusión, comparado con lo que entregó cada proveedor en el mismo periodo.</p>
        </div>
        <Button asChild variant="outline" size="sm">
          <a href={`/api/export/rechazos?meses=${meses}`} download>
            <Download /> Excel
          </a>
        </Button>
      </header>

      <nav aria-label="Periodo" className="flex flex-wrap gap-2">
        {PERIODOS_RECHAZO.map((m) => (
          <Link
            key={m}
            href={url({ meses: m })}
            aria-current={m === meses ? "page" : undefined}
            className={`h-9 rounded-full border px-3.5 text-sm font-medium leading-9 transition ${
              m === meses ? "border-brand bg-brand-soft text-brand-ink" : "border-line text-subdued hover:bg-elevated"
            }`}
          >
            Últimos {m} meses
          </Link>
        ))}
      </nav>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="px-5 py-4">
          <p className="text-[13px] text-subdued">Rechazado</p>
          <p className="mt-1 text-[24px] font-extrabold tabular-nums text-danger">{formatKg(totalRechazado)}</p>
          <p className="mt-0.5 text-xs text-muted">
            {rechazos.length} {rechazos.length === 1 ? "rechazo" : "rechazos"}
          </p>
        </Card>
        <Card className="px-5 py-4">
          <p className="text-[13px] text-subdued">Recibido de proveedores</p>
          <p className="mt-1 text-[24px] font-extrabold tabular-nums">{formatKg(totalRecibido)}</p>
          <p className="mt-0.5 text-xs text-muted">entradas de almacén del periodo</p>
        </Card>
        <Card className="px-5 py-4">
          <p className="text-[13px] text-subdued">Rechazo general</p>
          <p className="mt-1 text-[24px] font-extrabold tabular-nums">{pct(totalRecibido > 0 ? (totalRechazado / totalRecibido) * 100 : null)}</p>
          <p className="mt-0.5 text-xs text-muted">de cada 100 kg recibidos</p>
        </Card>
      </div>

      <Seccion titulo="Por proveedor" cuenta={conRechazo.length}>
        {conRechazo.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-12 text-center text-subdued">
            <PackageX className="size-8 text-muted" aria-hidden />
            <p>No hubo rechazos en extrusión en los últimos {meses} meses.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs text-subdued">
                  <th className="py-2 pr-3 font-medium">Proveedor</th>
                  <th className="py-2 pr-3 text-right font-medium">Recibido</th>
                  <th className="py-2 pr-3 text-right font-medium">Rechazado</th>
                  <th className="py-2 pr-3 text-right font-medium">% rechazo</th>
                  <th className="py-2 pr-3 font-medium">Motivo más común</th>
                  <th className="py-2 font-medium">Lotes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {conRechazo.map((f) => {
                  const alto = f.porcentaje === null || f.porcentaje > UMBRAL_ALTO
                  const activo = f.clave === seleccion?.clave
                  return (
                    <tr key={f.clave} className={activo ? "bg-brand-soft" : "hover:bg-elevated"}>
                      <td className="py-2.5 pr-3">
                        <Link href={url({ proveedor: activo ? null : f.clave })} className="font-semibold hover:text-brand-ink hover:underline">
                          {f.proveedor}
                        </Link>
                      </td>
                      <td className="py-2.5 pr-3 text-right tabular-nums text-subdued">{f.kgRecibidos > 0 ? formatKg(f.kgRecibidos) : "—"}</td>
                      <td className="py-2.5 pr-3 text-right font-semibold tabular-nums">{formatKg(f.kgRechazados)}</td>
                      <td className={`py-2.5 pr-3 text-right font-bold tabular-nums ${alto ? "text-danger" : ""}`}>
                        {f.porcentaje === null ? <span title="No hay entradas de este proveedor en el periodo">sin entradas</span> : pct(f.porcentaje)}
                      </td>
                      <td className="py-2.5 pr-3 text-subdued">{f.motivoPrincipal ?? "—"}</td>
                      <td className="py-2.5 text-xs text-muted">{f.lotes.slice(0, 4).join(", ") || "—"}{f.lotes.length > 4 ? ` y ${f.lotes.length - 4} más` : ""}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            <p className="mt-2 text-xs text-muted">
              En rojo, más de {UMBRAL_ALTO}% de rechazo. Toca un proveedor para ver solo sus rechazos.
              {filas.some((f) => f.proveedor === "Sin proveedor" && f.rechazos > 0) &&
                " “Sin proveedor” agrupa rechazos registrados antes de pedir el lote."}
            </p>
          </div>
        )}
      </Seccion>

      {rechazos.length > 0 && (
        <Seccion titulo={seleccion ? `Rechazos de ${seleccion.proveedor}` : "Todos los rechazos"} cuenta={detalle.length}>
          {seleccion && (
            <Link href={url({ proveedor: null })} className="mb-2 inline-block text-[13px] font-semibold text-brand-ink hover:underline">
              Ver todos los proveedores
            </Link>
          )}
          <ul className="divide-y divide-line">
            {detalle.map((r) => (
              <li key={r.id} className="flex items-start justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold">
                    {r.rechazoProveedor ?? "Sin proveedor"}
                    {r.rechazoLote && <span className="font-normal text-subdued"> · lote {r.rechazoLote}</span>}
                    {r.rechazoEntrada && <span className="font-normal text-subdued"> · {r.rechazoEntrada.material.nombre}</span>}
                  </p>
                  <p className="mt-0.5 text-[13px] text-subdued">
                    {r.rechazoMotivo ?? "Sin motivo"}
                    {r.rechazoNota && ` — ${r.rechazoNota}`}
                  </p>
                  <p className="mt-0.5 text-xs text-muted">
                    {fecha(r.createdAt)} · OT {r.orden.refExterna ?? `#${r.orden.numero}`} ({r.orden.cliente.nombre}) · {r.user.nombre}
                  </p>
                </div>
                <span className="shrink-0 text-sm font-bold tabular-nums text-danger">{formatKg(r.kgRechazado)}</span>
              </li>
            ))}
          </ul>
        </Seccion>
      )}
    </div>
  )
}
