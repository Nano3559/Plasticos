import Link from "next/link"
import { ChevronRight, Plus } from "lucide-react"
import { prisma } from "@/lib/prisma"
import { consultarCartera, resumirCartera } from "@/lib/cartera"
import { fechaLaPaz } from "@/lib/session"
import { rangoMes } from "@/lib/gastos"
import { formatBs } from "@/lib/formato"
import { Cifras } from "@/components/ui/cifras"
import { Encabezado } from "@/components/ui/encabezado"
import { FilaTarea, VacioTodoOk } from "@/components/ui/fila-tarea"
import { Seccion } from "@/components/ui/seccion"

export const dynamic = "force-dynamic"

const ACCIONES = [
  { href: "/cobranzas/pago", texto: "Registrar pago" },
  { href: "/cobranzas/entrega", texto: "Registrar entrega" },
  { href: "/cobranzas/nota-credito", texto: "Devolución o descuento" },
]
const SECCIONES = [
  { href: "/cobranzas/cartera", titulo: "Cartera por antigüedad", texto: "Cuánto debe cada cliente y desde hace cuánto" },
  { href: "/cobranzas/resumen", titulo: "Resumen y gráficos", texto: "Cobrado y entregado por mes, medios de pago" },
  { href: "/cobranzas/kardex", titulo: "Kardex de clientes", texto: "Importar los Excel y ver el kardex de cada uno" },
  { href: "/produccion/clientes", titulo: "Clientes", texto: "Lista de clientes y cliente nuevo" },
]

export default async function CobranzasPage() {
  const { desde, hasta } = rangoMes(fechaLaPaz(new Date()).slice(0, 7))
  const [cartera, cobradoMes] = await Promise.all([
    consultarCartera(),
    prisma.pago.aggregate({ where: { fecha: { gte: desde, lt: hasta } }, _sum: { monto: true } }),
  ])
  const r = resumirCartera(cartera)
  const pendientes = cartera.filter((c) => c.saldo > 0.5).sort((a, b) => b.diasMasAntiguo - a.diasMasAntiguo || b.saldo - a.saldo)

  return (
    <div className="space-y-10">
      <Encabezado titulo="Cobranzas" descripcion="Lo que se entrega, lo que pagan los clientes y lo que falta cobrar.">
        <div className="flex flex-wrap gap-x-4 gap-y-1" role="group" aria-label="Registrar">
          {ACCIONES.map((a) => (
            <Link key={a.href} href={a.href} className="group inline-flex h-10 items-center gap-2 text-[14px] text-subdued transition-colors hover:text-brand-ink">
              <span className="grid size-[18px] place-items-center rounded-full text-brand transition-colors group-hover:bg-brand group-hover:text-on-brand">
                <Plus className="size-4" strokeWidth={2.5} />
              </span>
              {a.texto}
            </Link>
          ))}
        </div>
      </Encabezado>

      <Cifras
        items={[
          { etiqueta: "Por cobrar", valor: formatBs(r.totalPorCobrar, 0), nota: `${r.clientesConDeuda} ${r.clientesConDeuda === 1 ? "cliente" : "clientes"}` },
          { etiqueta: "Más de 30 días", valor: formatBs(r.totalEnMora, 0), nota: "en mora", tono: r.totalEnMora > 0.5 ? "danger" : undefined },
          { etiqueta: "Cobrado este mes", valor: formatBs(cobradoMes._sum.monto ?? 0, 0), tono: "brand" },
          { etiqueta: "Devoluciones y descuentos", valor: formatBs(r.totalCreditos, 0), nota: "en total" },
        ]}
      />

      <ul className="grid gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-2">
        {SECCIONES.map((s) => (
          <li key={s.href} className="bg-card">
            <Link href={s.href} className="group flex items-center justify-between gap-3 px-5 py-4 transition-colors hover:bg-elevated">
              <span>
                <span className="block font-semibold group-hover:text-brand-ink">{s.titulo}</span>
                <span className="mt-0.5 block text-[13px] text-subdued">{s.texto}</span>
              </span>
              <ChevronRight className="size-4 shrink-0 text-muted" />
            </Link>
          </li>
        ))}
      </ul>

      <Seccion titulo="Por cobrar" cuenta={pendientes.length} verTodo={{ href: "/cobranzas/cartera", texto: "Ver cartera" }}>
        {pendientes.length === 0 ? (
          <VacioTodoOk>Ningún cliente tiene saldo pendiente.</VacioTodoOk>
        ) : (
          <div>
            {pendientes.slice(0, 10).map((c) => {
              const vencido = c.diasMasAntiguo > c.cliente.diasCredito
              return (
                <FilaTarea
                  key={c.cliente.id}
                  href={`/cobranzas/cliente/${c.cliente.id}`}
                  prioridad={!vencido ? "baja" : c.diasMasAntiguo > 60 ? "alta" : "media"}
                  titulo={c.cliente.nombre}
                  detalle={`${c.diasMasAntiguo} días con saldo · crédito de ${c.cliente.diasCredito}${vencido ? " · vencido" : ""}`}
                  derecha={<span className="font-semibold text-fg">{formatBs(c.saldo)}</span>}
                />
              )
            })}
          </div>
        )}
      </Seccion>
    </div>
  )
}
