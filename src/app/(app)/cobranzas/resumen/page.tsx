import { Suspense } from "react"
import Link from "next/link"
import { notFound } from "next/navigation"
import { MessageCircle, Plus } from "lucide-react"
import { prisma } from "@/lib/prisma"
import { formatBs, formatKg } from "@/lib/formato"
import { consultarResumen, leerPeriodo, PERIODOS } from "@/lib/resumen-cobranzas-db"
import { calcularCartera } from "@/lib/cartera-calculo"
import { Card } from "@/components/ui/card"
import { Seccion } from "@/components/ui/seccion"
import { COLOR } from "@/lib/colores-graficos"
import { GraficoAntiguedad, GraficoMedios, GraficoMensual, GraficoRanking } from "./graficos"
import { SelectorResumen } from "./selector"

export const dynamic = "force-dynamic"

const fecha = (d: Date) => d.toLocaleDateString("es-BO", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" })
const dias = (n: number) => `${n} ${n === 1 ? "día" : "días"}`

function Cifra({ etiqueta, valor, nota, tono }: { etiqueta: string; valor: string; nota?: React.ReactNode; tono?: "danger" | "brand" | "accent" }) {
  const color = tono === "danger" ? "text-danger" : tono === "brand" ? "text-brand-ink" : tono === "accent" ? "text-accent" : ""
  return (
    <div className="px-5 py-4">
      <p className="text-[13px] text-subdued">{etiqueta}</p>
      <p className={`mt-1 text-[22px] font-extrabold leading-tight tracking-tight tabular-nums ${color}`}>{valor}</p>
      {nota && <p className="mt-0.5 text-xs text-muted">{nota}</p>}
    </div>
  )
}

export default async function ResumenCobranzasPage({
  searchParams,
}: {
  searchParams: Promise<{ cliente?: string; meses?: string }>
}) {
  const { cliente: clienteParam, meses: mesesParam } = await searchParams
  const meses = leerPeriodo(mesesParam)
  const clienteId = clienteParam || null

  // Lista para el selector, con el saldo de cada uno
  const paraSelector = await prisma.cliente.findMany({
    orderBy: { nombre: "asc" },
    select: {
      id: true, nombre: true, telefono: true, diasCredito: true,
      ordenes: { select: { numero: true, precioUnitario: true, entregas: { select: { fecha: true, kgEntregados: true } } } },
      pagos: { select: { monto: true } },
    },
  })
  const opciones = paraSelector
    .map((c) => ({ id: c.id, nombre: c.nombre, saldo: calcularCartera(c).saldo }))
    .sort((a, b) => b.saldo - a.saldo || a.nombre.localeCompare(b.nombre, "es"))
  if (clienteId && !opciones.some((o) => o.id === clienteId)) notFound()

  const r = await consultarResumen(clienteId, meses)
  const uno = r.alcance === "cliente" ? r.clientes[0] : null
  const periodoTexto = meses === 0 ? "todo el historial" : `los últimos ${meses} meses`
  const pendienteTotal = r.antiguedad["0-15"] + r.antiguedad["16-30"] + r.antiguedad["31-60"] + r.antiguedad["60+"]

  const mensajeWhatsapp =
    uno && uno.saldo > 0.5 && uno.cliente.telefono
      ? `https://wa.me/591${uno.cliente.telefono.replace(/\D/g, "").replace(/^591/, "")}?text=${encodeURIComponent(
          `Hola, ${uno.cliente.nombre}. Le escribimos de Plásticos para recordarle su saldo pendiente de ${formatBs(uno.saldo)}. ¡Gracias!`
        )}`
      : null

  return (
    <div className="space-y-10">
      <header className="space-y-4">
        <div>
          <p className="text-sm font-medium text-subdued">
            <Link href="/cobranzas" className="hover:text-brand-ink hover:underline">
              Cobranzas
            </Link>
          </p>
          <h1 className="mt-1 text-[26px] font-bold leading-tight sm:text-[28px]">{uno ? uno.cliente.nombre : "Resumen de cobranzas"}</h1>
          <p className="mt-1 text-subdued">
            {uno
              ? `${uno.enMora ? "En mora" : uno.saldo > 0.5 ? "Con saldo dentro del crédito" : "Al día"} · crédito de ${dias(uno.cliente.diasCredito)}`
              : `${opciones.length} clientes · ${r.clientesConDeuda} con saldo · ${r.clientesEnMora} en mora`}
          </p>
        </div>
        <Suspense>
          <SelectorResumen clientes={opciones} clienteId={clienteId} meses={meses} periodos={PERIODOS} />
        </Suspense>
      </header>

      {/* ── Cifras principales ─────────────────────────────────── */}
      <Card className="grid grid-cols-2 gap-0 py-0 lg:grid-cols-4" aria-label="Cifras principales">
        {[
          <Cifra
            key="falta"
            etiqueta="Falta cobrar"
            valor={formatBs(r.porCobrar, 0)}
            tono={r.enMora > 0.5 ? "danger" : undefined}
            nota={r.enMora > 0.5 ? `${formatBs(r.enMora, 0)} de clientes en mora` : r.aFavor > 0.5 ? `${formatBs(r.aFavor, 0)} a favor del cliente` : "Nada vencido"}
          />,
          <Cifra key="cobrado" etiqueta="Cobrado" valor={formatBs(r.cobradoPeriodo, 0)} tono="brand" nota={`en ${periodoTexto}`} />,
          <Cifra key="entregado" etiqueta="Entregado" valor={formatBs(r.entregadoPeriodo, 0)} nota={`${formatKg(r.kgPeriodo, 0)} en ${periodoTexto}`} />,
          <Cifra
            key="dias"
            etiqueta="Tardan en pagar"
            valor={r.diasPromedioPago === null ? "—" : dias(r.diasPromedioPago)}
            nota={uno ? `el crédito es de ${dias(uno.cliente.diasCredito)}` : "promedio desde la entrega"}
            tono={uno && r.diasPromedioPago !== null && r.diasPromedioPago > uno.cliente.diasCredito ? "danger" : undefined}
          />,
        ].map((c, i) => (
          <div
            key={i}
            className={`${i % 2 === 1 ? "border-l border-line" : ""} ${i >= 2 ? "border-t border-line lg:border-t-0" : ""} ${i > 0 ? "lg:border-l" : ""}`}
          >
            {c}
          </div>
        ))}
      </Card>

      {/* Avance de cobro y proyección: lo que más ayuda a decidir a quién llamar */}
      <section aria-label="Avance de cobro" className="space-y-2">
        <div className="flex items-baseline justify-between gap-3 text-[14px]">
          <span>
            Pagado <strong className="tabular-nums">{formatBs(r.cobradoHistorico, 0)}</strong> de{" "}
            <strong className="tabular-nums">{formatBs(r.entregadoHistorico, 0)}</strong> entregados en total
          </span>
          <span className="shrink-0 whitespace-nowrap tabular-nums text-subdued">
            {r.entregadoHistorico > 0 ? Math.min(100, Math.round((r.cobradoHistorico / r.entregadoHistorico) * 100)) : 100} %
          </span>
        </div>
        <div
          className="h-2 overflow-hidden rounded-full bg-black/[0.07]"
          role="progressbar"
          aria-label="Porcentaje cobrado"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={r.entregadoHistorico > 0 ? Math.round((r.cobradoHistorico / r.entregadoHistorico) * 100) : 100}
        >
          <div
            className="h-full rounded-full bg-brand"
            style={{ width: `${r.entregadoHistorico > 0 ? Math.min(100, (r.cobradoHistorico / r.entregadoHistorico) * 100) : 100}%` }}
          />
        </div>
        <p className="text-[13px] text-subdued">
          {r.porCobrar <= 0.5
            ? "No hay nada pendiente de cobro."
            : r.mesesParaCobrar === null
              ? "No hubo cobros en los últimos 3 meses: lo pendiente no se está reduciendo."
              : `Al ritmo de los últimos 3 meses (${formatBs(r.ritmoCobroMensual, 0)} por mes), lo pendiente se cobraría en unos ${r.mesesParaCobrar.toLocaleString("es-BO")} ${r.mesesParaCobrar === 1 ? "mes" : "meses"}, si no hay entregas nuevas.`}
          {r.ultimoPago && ` Último pago: ${formatBs(r.ultimoPago.monto, 0)} el ${fecha(r.ultimoPago.fecha)}${uno ? "" : ` (${r.ultimoPago.cliente})`}.`}
        </p>
        {uno && (
          <div className="flex flex-wrap gap-x-5 gap-y-1 pt-1">
            <Link href={`/cobranzas/pago?clienteId=${uno.cliente.id}`} className="group inline-flex h-10 items-center gap-2 text-[14px] text-subdued hover:text-brand-ink">
              <span className="grid size-[18px] place-items-center rounded-full text-brand group-hover:bg-brand group-hover:text-on-brand">
                <Plus className="size-4" strokeWidth={2.5} />
              </span>
              Registrar pago
            </Link>
            <Link href={`/cobranzas/cliente/${uno.cliente.id}`} className="inline-flex h-10 items-center text-[14px] text-subdued hover:text-brand-ink">
              Ficha del cliente
            </Link>
            <Link href={`/cobranzas/kardex?clienteId=${uno.cliente.id}`} className="inline-flex h-10 items-center text-[14px] text-subdued hover:text-brand-ink">
              Kardex
            </Link>
            {mensajeWhatsapp && (
              <a href={mensajeWhatsapp} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center gap-1.5 text-[14px] text-subdued hover:text-brand-ink">
                <MessageCircle className="size-4" /> Recordar por WhatsApp
              </a>
            )}
          </div>
        )}
      </section>

      {/* ── Evolución mensual ─────────────────────────────────── */}
      <Seccion titulo="Entregado y cobrado por mes">
        <div className="flex flex-wrap gap-x-4 gap-y-1 pb-3 pt-2 text-[13px] text-subdued">
          <span className="inline-flex items-center gap-1.5"><span className="inline-block size-2.5 rounded-sm" style={{ background: COLOR.entregado }} /> Entregado</span>
          <span className="inline-flex items-center gap-1.5"><span className="inline-block size-2.5 rounded-sm" style={{ background: COLOR.cobrado }} /> Cobrado</span>
          <span className="inline-flex items-center gap-1.5"><span className="inline-block h-0.5 w-3 rounded" style={{ background: COLOR.saldo }} /> Saldo pendiente al cierre del mes</span>
        </div>
        <GraficoMensual datos={r.serie} />
      </Seccion>

      <div className="grid gap-10 lg:grid-cols-2">
        <Seccion titulo="¿Hace cuánto se debe?">
          {pendienteTotal <= 0.5 ? (
            <p className="py-8 text-subdued">No hay saldo pendiente.</p>
          ) : (
            <div className="pt-3">
              <GraficoAntiguedad
                datos={[
                  { rango: "0 a 15 días", monto: r.antiguedad["0-15"] },
                  { rango: "16 a 30 días", monto: r.antiguedad["16-30"] },
                  { rango: "31 a 60 días", monto: r.antiguedad["31-60"] },
                  { rango: "Más de 60", monto: r.antiguedad["60+"] },
                ]}
              />
            </div>
          )}
        </Seccion>

        <Seccion titulo="¿Cómo pagan?">
          <div className="pt-4">
            <GraficoMedios datos={r.porMedio} />
          </div>
        </Seccion>
      </div>

      {r.alcance === "todos" ? (
        <>
          {r.clientes.some((c) => c.saldo > 0.5) && (
            <Seccion titulo="Quién debe más" cuenta={r.clientesConDeuda}>
              <div className="pt-3">
                <GraficoRanking
                  datos={r.clientes.filter((c) => c.saldo > 0.5).slice(0, 10).map((c) => ({ nombre: c.cliente.nombre, valor: c.saldo }))}
                />
              </div>
            </Seccion>
          )}

          <Seccion titulo="Todos los clientes" cuenta={r.clientes.length} verTodo={{ href: "/api/export/cartera", texto: "Descargar Excel" }}>
            <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
              <table className="w-full min-w-[720px] text-[14px]">
                <thead>
                  <tr className="border-b border-line text-left text-[12px] text-subdued">
                    <th className="py-2 pr-3 font-semibold">Cliente</th>
                    <th className="py-2 pr-3 text-right font-semibold">Entregado</th>
                    <th className="py-2 pr-3 font-semibold">Pagado</th>
                    <th className="py-2 pr-3 text-right font-semibold">Falta cobrar</th>
                    <th className="py-2 pr-3 text-right font-semibold">Deuda más antigua</th>
                    <th className="py-2 text-right font-semibold">Último pago</th>
                  </tr>
                </thead>
                <tbody>
                  {r.clientes.map((c) => (
                    <tr key={c.cliente.id} className="border-b border-line last:border-b-0 hover:bg-black/[0.025]">
                      <td className="py-2.5 pr-3">
                        <Link
                          href={`/cobranzas/resumen?cliente=${c.cliente.id}${meses !== 12 ? `&meses=${meses}` : ""}`}
                          className="flex items-center gap-2.5 hover:text-brand-ink"
                        >
                          <span
                            className={`size-[14px] shrink-0 rounded-full border-[1.5px] ${
                              c.enMora ? "border-danger bg-danger/10" : c.saldo > 0.5 ? "border-warn bg-warn/10" : "border-accent bg-accent/15"
                            }`}
                            aria-hidden
                          />
                          <span className="sr-only">{c.enMora ? "En mora:" : c.saldo > 0.5 ? "Con saldo:" : "Al día:"}</span>
                          <span className="truncate">{c.cliente.nombre}</span>
                        </Link>
                      </td>
                      <td className="py-2.5 pr-3 text-right tabular-nums text-subdued">{formatBs(c.totalEntregado, 0)}</td>
                      <td className="py-2.5 pr-3">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-20 overflow-hidden rounded-full bg-black/[0.07]" aria-hidden>
                            <div className="h-full rounded-full bg-brand" style={{ width: `${c.porcentajeCobrado}%` }} />
                          </div>
                          <span className="tabular-nums text-subdued">{c.porcentajeCobrado} %</span>
                        </div>
                      </td>
                      <td className={`py-2.5 pr-3 text-right font-semibold tabular-nums ${c.enMora ? "text-danger" : ""}`}>
                        {c.saldo > 0.5 ? formatBs(c.saldo, 0) : c.aFavor > 0.5 ? <span className="font-normal text-accent">{formatBs(c.aFavor, 0)} a favor</span> : "—"}
                      </td>
                      <td className="py-2.5 pr-3 text-right tabular-nums text-subdued">{c.saldo > 0.5 ? dias(c.diasMasAntiguo) : "—"}</td>
                      <td className="py-2.5 text-right tabular-nums text-subdued">{c.ultimoPago ? fecha(c.ultimoPago.fecha) : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Seccion>
        </>
      ) : (
        <>
          {r.porProducto.length > 0 && (
            <Seccion titulo="Qué compra" cuenta={r.porProducto.length}>
              <div className="pt-3">
                <GraficoRanking
                  datos={r.porProducto.slice(0, 8).map((p) => ({ nombre: p.producto, valor: p.kg }))}
                  color={COLOR.entregado}
                  formato="kg"
                  etiquetaValor="Entregado"
                />
              </div>
            </Seccion>
          )}

          <Seccion titulo="Últimos movimientos" cuenta={r.movimientos.length} verTodo={uno ? { href: `/cobranzas/kardex?clienteId=${uno.cliente.id}`, texto: "Ver kardex completo" } : undefined}>
            {r.movimientos.length === 0 ? (
              <p className="py-6 text-subdued">Este cliente todavía no tiene entregas ni pagos.</p>
            ) : (
              <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
                <table className="w-full min-w-[620px] text-[14px]">
                  <thead>
                    <tr className="border-b border-line text-left text-[12px] text-subdued">
                      <th className="py-2 pr-3 font-semibold">Fecha</th>
                      <th className="py-2 pr-3 font-semibold">Detalle</th>
                      <th className="py-2 pr-3 text-right font-semibold">Entregado</th>
                      <th className="py-2 pr-3 text-right font-semibold">Pagado</th>
                      <th className="py-2 text-right font-semibold">Saldo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {r.movimientos.slice(-15).reverse().map((m, i) => (
                      <tr key={`${m.fecha.toISOString()}-${i}`} className="border-b border-line last:border-b-0">
                        <td className="py-2.5 pr-3 tabular-nums text-subdued">{fecha(m.fecha)}</td>
                        <td className="max-w-[280px] truncate py-2.5 pr-3" title={m.detalle}>{m.detalle}</td>
                        <td className="py-2.5 pr-3 text-right tabular-nums">{m.cargo ? formatBs(m.cargo, 0) : ""}</td>
                        <td className="py-2.5 pr-3 text-right tabular-nums text-brand-ink">{m.abono ? formatBs(m.abono, 0) : ""}</td>
                        <td className={`py-2.5 text-right font-semibold tabular-nums ${m.saldo < -0.5 ? "text-accent" : ""}`}>{formatBs(m.saldo, 0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Seccion>
        </>
      )}

      <p className="text-xs text-muted">
        Los saldos se calculan con todas las entregas y pagos registrados; el periodo solo cambia los gráficos y las cifras de cobrado y entregado.
      </p>
    </div>
  )
}
