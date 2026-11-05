import Link from "next/link"
import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { asignarCostosPorOrden, costoPor100kg, kgBuenosFinales, kgEntradaInicial, rendimientoOrden } from "@/lib/costos"
import { formatBs, formatKg, formatNumero, formatPrecio } from "@/lib/formato"
import { Card } from "@/components/ui/card"
import { Cifras } from "@/components/ui/cifras"
import { Encabezado } from "@/components/ui/encabezado"
import { EstadoOrden } from "@/components/ui/estado-orden"
import { MensajeInfo } from "@/components/ui/mensaje"
import { Seccion } from "@/components/ui/seccion"

export const dynamic = "force-dynamic"

function Fila({ etiqueta, valor, fuerte, tono }: { etiqueta: string; valor: string; fuerte?: boolean; tono?: string }) {
  return (
    <div className={`flex justify-between gap-4 border-b border-line py-2.5 last:border-b-0 ${fuerte ? "font-bold" : ""}`}>
      <span className={fuerte ? "" : "text-subdued"}>{etiqueta}</span>
      <span className={`tabular-nums ${tono ?? ""}`}>{valor}</span>
    </div>
  )
}

export default async function DetalleCostoOtPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const ot = await prisma.ordenTrabajo.findUnique({
    where: { id },
    include: { cliente: { select: { nombre: true } }, registros: { select: { area: true, kgBuenos: true, kgEntrada: true, kgMerma: true, kgRechazado: true } } },
  })
  if (!ot) notFound()

  const kg = kgBuenosFinales(ot.registros)
  const entrada = kgEntradaInicial(ot.registros)
  const merma = ot.registros.reduce((s, r) => s + Number(r.kgMerma), 0)
  const rechazo = ot.registros.reduce((s, r) => s + Number(r.kgRechazado), 0)
  const c = (await asignarCostosPorOrden()).get(ot.id)
  const mp = c?.materiaPrima ?? 0
  const tintas = c?.tintas ?? 0
  const mo = c?.manoObra ?? 0
  const en = c?.energia ?? 0
  const total = mp + tintas + mo + en
  const porKg = kg > 0 ? total / kg : 0
  const precio = Number(ot.precioUnitario)
  const margenKg = precio - porKg
  const etiqueta = ot.refExterna ?? `#${ot.numero}`

  return (
    <div className="space-y-10">
      <Encabezado
        miga={[
          { href: "/costos", texto: "Costos" },
          { href: "/costos/por-ot", texto: "Por orden" },
        ]}
        titulo={
          <span className="flex flex-wrap items-center gap-3">
            OT {etiqueta} · {ot.producto}
            <EstadoOrden estado={ot.estado} />
          </span>
        }
        descripcion={
          <>
            {ot.cliente.nombre} ·{" "}
            <Link href={`/produccion/ordenes/${ot.id}`} className="text-brand-ink hover:underline">
              ver la orden
            </Link>
          </>
        }
      />

      <Cifras
        items={[
          { etiqueta: "Costo por 100 kg", valor: kg > 0 ? formatBs(costoPor100kg(total, kg)) : "—", tono: "brand" },
          { etiqueta: "Costo total", valor: formatBs(total) },
          { etiqueta: "Precio de venta", valor: `${formatPrecio(precio)}/kg` },
          {
            etiqueta: "Margen",
            valor: kg > 0 && total > 0 ? `${formatBs(margenKg)}/kg` : "—",
            nota: kg > 0 && total > 0 ? `${formatNumero((margenKg / precio) * 100, 1)}% del precio` : undefined,
            tono: kg > 0 && total > 0 ? (margenKg < 0 ? "danger" : "accent") : undefined,
          },
        ]}
      />

      {!c?.vales && (
        <MensajeInfo>
          Esta orden no tiene vales de salida: el costo no incluye materia prima ni tintas. Al registrar una salida de almacén, elige esta OT
          para que se sume.
        </MensajeInfo>
      )}

      <div className="grid gap-10 lg:grid-cols-2">
        <Seccion titulo="De dónde sale el costo">
          <Card className="mt-2 px-5 py-1">
            <Fila etiqueta="Materia prima (vales de salida)" valor={formatBs(mp)} />
            <Fila etiqueta="Tintas y solventes" valor={formatBs(tintas)} />
            <Fila etiqueta="Mano de obra (su parte del turno)" valor={formatBs(mo)} />
            <Fila etiqueta="Energía (su parte del turno)" valor={formatBs(en)} />
            <Fila etiqueta="Costo directo" valor={formatBs(total)} fuerte />
            <Fila etiqueta="Por kg bueno" valor={kg > 0 ? `${formatPrecio(porKg)}/kg` : "—"} />
          </Card>
        </Seccion>
        <Seccion titulo="Balance de material">
          <Card className="mt-2 px-5 py-1">
            <Fila etiqueta="Entró a la primera área" valor={formatKg(entrada, 2)} />
            <Fila etiqueta="Producto terminado" valor={formatKg(kg, 2)} tono="text-accent" />
            <Fila etiqueta="Merma (a molienda)" valor={formatKg(merma, 2)} tono="text-warn" />
            <Fila etiqueta="Rechazo" valor={formatKg(rechazo, 2)} tono="text-danger" />
            <Fila etiqueta="Rendimiento" valor={`${formatNumero(rendimientoOrden(ot.registros), 1)}%`} fuerte />
          </Card>
        </Seccion>
      </div>
    </div>
  )
}
