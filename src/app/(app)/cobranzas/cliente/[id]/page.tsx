import Link from "next/link"
import { notFound } from "next/navigation"
import { Plus } from "lucide-react"
import { prisma } from "@/lib/prisma"
import { calcularCartera } from "@/lib/cartera"
import { formatBs, formatKg, formatPrecio } from "@/lib/formato"
import { MEDIO_PAGO } from "@/lib/etiquetas"
import { Cifras } from "@/components/ui/cifras"
import { Encabezado } from "@/components/ui/encabezado"
import { Seccion } from "@/components/ui/seccion"
import { FilaOrden } from "@/components/produccion/fila-orden"

export const dynamic = "force-dynamic"

const MAX_MOVIMIENTOS = 60
const fecha = (d: Date) => d.toLocaleDateString("es-BO", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }).replace(".", "")

type Mov = { id: string; fecha: Date; tipo: "ENTREGA" | "PAGO" | "NOTA"; titulo: string; detalle: string; monto: number; saldo: number }

export default async function ClientePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const c = await prisma.cliente.findUnique({
    where: { id },
    include: {
      ordenes: {
        orderBy: { numero: "desc" },
        include: { entregas: true, registros: { select: { area: true, kgBuenos: true } }, cliente: { select: { nombre: true } } },
      },
      pagos: true,
      notasCredito: { where: { anuladaEn: null }, include: { orden: { select: { numero: true, refExterna: true } } } },
    },
  })
  if (!c) notFound()

  const cartera = calcularCartera(c)
  const ot = (o: { numero: number; refExterna: string | null } | null | undefined) => (o ? `OT ${o.refExterna ?? `#${o.numero}`}` : null)
  const ordenPorId = new Map(c.ordenes.map((o) => [o.id, o]))

  // Todos los movimientos en orden, con el saldo que dejó cada uno
  const movs: Omit<Mov, "saldo">[] = [
    ...c.ordenes.flatMap((o) =>
      o.entregas.map((e) => ({
        id: e.id,
        fecha: e.fecha,
        tipo: "ENTREGA" as const,
        titulo: `Entrega · ${ot(o)}`,
        detalle: [`${formatKg(e.kgEntregados, 1)} × ${formatPrecio(o.precioUnitario)}`, e.notaRemision && `N.R. ${e.notaRemision}`, o.producto].filter(Boolean).join(" · "),
        monto: Number(e.kgEntregados) * Number(o.precioUnitario),
      }))
    ),
    ...c.pagos.map((p) => ({
      id: p.id,
      fecha: p.fecha,
      tipo: "PAGO" as const,
      titulo: `Pago · ${MEDIO_PAGO[p.medio] ?? p.medio}`,
      detalle: [p.referencia && `ref. ${p.referencia}`, ot(p.ordenId ? ordenPorId.get(p.ordenId) : null)].filter(Boolean).join(" · "),
      monto: -Number(p.monto),
    })),
    ...c.notasCredito.map((n) => ({
      id: n.id,
      fecha: n.fecha,
      tipo: "NOTA" as const,
      titulo: n.tipo === "DEVOLUCION" ? "Devolución" : "Descuento",
      detalle: [n.motivo, n.kg && formatKg(n.kg, 1), ot(n.orden)].filter(Boolean).join(" · "),
      monto: -Number(n.monto),
    })),
  ].sort((a, b) => a.fecha.getTime() - b.fecha.getTime() || (a.monto > 0 ? -1 : 1))
  const conSaldo: Mov[] = movs
    .reduce<Mov[]>((acc, m) => [...acc, { ...m, saldo: (acc.at(-1)?.saldo ?? 0) + m.monto }], [])
    .reverse()

  const vencido = cartera.saldo > 0.5 && cartera.diasMasAntiguo > c.diasCredito
  const enCurso = c.ordenes.filter((o) => o.estado !== "ENTREGADA")

  return (
    <div className="space-y-10">
      <Encabezado
        miga={{ href: "/cobranzas", texto: "Cobranzas" }}
        titulo={c.nombre}
        descripcion={[c.contacto, c.telefono, c.direccion, `crédito de ${c.diasCredito} días`].filter(Boolean).join(" · ")}
      >
        <div className="flex flex-wrap gap-x-4 gap-y-1" role="group" aria-label="Acciones">
          {[
            { href: `/cobranzas/pago?clienteId=${c.id}`, texto: "Registrar pago", mas: true },
            { href: `/cobranzas/nota-credito?clienteId=${c.id}`, texto: "Devolución o descuento", mas: true },
            { href: `/cobranzas/resumen?cliente=${c.id}`, texto: "Gráficos" },
            { href: `/cobranzas/kardex?clienteId=${c.id}`, texto: "Kardex" },
          ].map((a) => (
            <Link key={a.href} href={a.href} className="group inline-flex h-10 items-center gap-2 text-[14px] text-subdued transition-colors hover:text-brand-ink">
              {a.mas && (
                <span className="grid size-[18px] place-items-center rounded-full text-brand transition-colors group-hover:bg-brand group-hover:text-on-brand">
                  <Plus className="size-4" strokeWidth={2.5} />
                </span>
              )}
              {a.texto}
            </Link>
          ))}
        </div>
      </Encabezado>

      <Cifras
        items={[
          {
            etiqueta: cartera.aFavor > 0 ? "A favor del cliente" : "Saldo",
            valor: formatBs(cartera.aFavor > 0 ? cartera.aFavor : cartera.saldo),
            nota: cartera.saldo > 0.5 ? `${cartera.diasMasAntiguo} días desde la entrega más antigua${vencido ? " · vencido" : ""}` : "al día",
            tono: vencido ? "danger" : cartera.saldo > 0.5 ? undefined : "accent",
          },
          { etiqueta: "Entregado", valor: formatBs(cartera.totalEntregado, 0) },
          { etiqueta: "Pagado", valor: formatBs(cartera.totalPagado, 0), tono: "brand" },
          { etiqueta: "Devoluciones y descuentos", valor: formatBs(cartera.totalCreditos, 0) },
        ]}
      />

      {cartera.saldo > 0.5 && (
        <p className="-mt-6 text-[13px] text-subdued">
          Por antigüedad: 0–15 días {formatBs(cartera.saldoPorRango["0-15"], 0)} · 16–30 {formatBs(cartera.saldoPorRango["16-30"], 0)} ·{" "}
          <span className={cartera.saldoPorRango["31-60"] > 0.5 ? "text-warn" : ""}>31–60 {formatBs(cartera.saldoPorRango["31-60"], 0)}</span> ·{" "}
          <span className={cartera.saldoPorRango["60+"] > 0.5 ? "font-semibold text-danger" : ""}>más de 60 {formatBs(cartera.saldoPorRango["60+"], 0)}</span>
        </p>
      )}

      {enCurso.length > 0 && (
        <Seccion titulo="Órdenes sin entregar del todo" cuenta={enCurso.length}>
          <div>
            {enCurso.slice(0, 6).map((o) => (
              <FilaOrden key={o.id} ot={o} />
            ))}
          </div>
        </Seccion>
      )}

      <Seccion titulo="Movimientos" cuenta={conSaldo.length}>
        {conSaldo.length === 0 ? (
          <p className="py-6 text-subdued">Todavía no hay entregas ni pagos.</p>
        ) : (
          <ul>
            {conSaldo.slice(0, MAX_MOVIMIENTOS).map((m) => (
              <li key={m.id} className="flex items-start justify-between gap-4 border-b border-line py-3 last:border-b-0">
                <span className="min-w-0">
                  <span className="block font-semibold">{m.titulo}</span>
                  {m.detalle && <span className="mt-0.5 block text-[13px] text-subdued">{m.detalle}</span>}
                  <span className="mt-0.5 block text-xs text-muted">{fecha(m.fecha)}</span>
                </span>
                <span className="shrink-0 text-right tabular-nums">
                  <span className={`block font-bold ${m.monto < 0 ? "text-accent" : ""}`}>
                    {m.monto < 0 ? "−" : "+"}
                    {formatBs(Math.abs(m.monto))}
                  </span>
                  <span className="block text-xs text-muted">saldo {formatBs(m.saldo)}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
        {conSaldo.length > MAX_MOVIMIENTOS && (
          <Link href={`/cobranzas/kardex?clienteId=${c.id}`} className="mt-3 inline-block text-[13px] font-semibold text-brand-ink hover:underline">
            Ver los {conSaldo.length} movimientos en el kardex
          </Link>
        )}
      </Seccion>
    </div>
  )
}
