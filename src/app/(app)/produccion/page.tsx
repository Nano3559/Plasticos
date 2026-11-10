import Link from "next/link"
import { Plus } from "lucide-react"
import { getSessionUser } from "@/lib/session"
import { prisma } from "@/lib/prisma"
import { kgBuenosFinales } from "@/lib/costos"
import { formatKg, formatNumero } from "@/lib/formato"
import { haceDias } from "@/lib/rechazos"
import { AREA_NOMBRE } from "@/lib/etiquetas"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Cifras } from "@/components/ui/cifras"
import { Encabezado } from "@/components/ui/encabezado"
import { Seccion } from "@/components/ui/seccion"
import { Vacio } from "@/components/ui/mensaje"
import { FilaOrden } from "@/components/produccion/fila-orden"

export const dynamic = "force-dynamic"

const AREAS = ["EXTRUSION", "IMPRESION", "CONFECCION"] as const
const DIAS = 30

export default async function ProduccionPage() {
  const user = await getSessionUser()
  const gestiona = user?.rol === "ADMIN" || user?.rol === "GERENCIA"

  const [enCurso, registros, totalClientes] = await Promise.all([
    prisma.ordenTrabajo.findMany({
      where: { estado: "ABIERTA" },
      orderBy: { fechaIngreso: "desc" },
      include: { cliente: { select: { nombre: true } }, registros: { select: { area: true, kgBuenos: true } } },
    }),
    prisma.registroProduccion.findMany({
      where: { createdAt: { gte: haceDias(DIAS) } },
      select: { ordenId: true, area: true, kgEntrada: true, kgBuenos: true, kgMerma: true, kgRechazado: true },
    }),
    gestiona ? prisma.cliente.count() : Promise.resolve(0),
  ])

  // Producto terminado = kg buenos del último proceso de cada orden
  const porOrden = new Map<string, typeof registros>()
  for (const r of registros) porOrden.set(r.ordenId, [...(porOrden.get(r.ordenId) ?? []), r])
  const terminado = [...porOrden.values()].reduce((s, regs) => s + kgBuenosFinales(regs), 0)
  const merma = registros.reduce((s, r) => s + Number(r.kgMerma) + Number(r.kgRechazado), 0)

  const areas = AREAS.map((a) => {
    const regs = registros.filter((r) => r.area === a)
    const entrada = regs.reduce((s, r) => s + Number(r.kgEntrada), 0)
    const buenos = regs.reduce((s, r) => s + Number(r.kgBuenos), 0)
    const perdida = regs.reduce((s, r) => s + Number(r.kgMerma) + Number(r.kgRechazado), 0)
    return { area: a, entrada, buenos, perdida, rend: entrada > 0 ? (buenos / entrada) * 100 : null, pesajes: regs.length }
  })

  const accesos = [
    { href: "/produccion/registro", texto: "Registrar producción" },
    gestiona && { href: "/produccion/ordenes/nueva", texto: "Nueva orden" },
    gestiona && { href: "/produccion/clientes", texto: `Clientes (${totalClientes})` },
  ].filter(Boolean) as { href: string; texto: string }[]

  return (
    <div className="space-y-10">
      <Encabezado
        titulo="Producción"
        descripcion="Órdenes de trabajo, pesajes por área y avance de cada pedido."
        acciones={
          <Button asChild size="sm">
            <Link href="/produccion/registro">
              <Plus /> Registrar producción
            </Link>
          </Button>
        }
      >
        <div className="flex flex-wrap gap-x-4 gap-y-1" role="group" aria-label="Accesos">
          {accesos.slice(1).map((a) => (
            <Link key={a.href} href={a.href} className="inline-flex h-10 items-center text-[14px] font-medium text-brand-ink hover:underline">
              {a.texto}
            </Link>
          ))}
          <Link href="/produccion/ordenes" className="inline-flex h-10 items-center text-[14px] font-medium text-brand-ink hover:underline">
            Todas las órdenes
          </Link>
          <Link href="/produccion/extrusion" className="inline-flex h-10 items-center text-[14px] font-medium text-brand-ink hover:underline">Extrusión · importar y reportes</Link>
        </div>
      </Encabezado>

      <Cifras
        etiqueta={`Últimos ${DIAS} días`}
        items={[
          { etiqueta: "En producción", valor: String(enCurso.length), nota: enCurso.length === 1 ? "orden abierta" : "órdenes abiertas" },
          { etiqueta: "Producto terminado", valor: formatKg(terminado, 0), nota: `últimos ${DIAS} días` },
          { etiqueta: "Merma y rechazo", valor: formatKg(merma, 0), nota: `últimos ${DIAS} días`, tono: merma > 0 ? "warn" : undefined },
          { etiqueta: "Pesajes", valor: String(registros.length), nota: `últimos ${DIAS} días` },
        ]}
      />

      <Seccion titulo="Por área" cuenta={undefined}>
        <Card className="mt-2 grid gap-0 py-0 sm:grid-cols-3">
          {areas.map((a, i) => (
            <div key={a.area} className={`px-5 py-4 ${i > 0 ? "border-t border-line sm:border-l sm:border-t-0" : ""}`}>
              <p className="text-sm font-semibold">{AREA_NOMBRE[a.area]}</p>
              <p className="mt-1 text-[22px] font-extrabold tabular-nums">{formatKg(a.buenos, 0)}</p>
              <p className="mt-0.5 text-xs text-muted">
                {a.pesajes === 0
                  ? "Sin pesajes"
                  : `Rendimiento ${formatNumero(a.rend ?? 0, 1)}% · pérdida ${formatKg(a.perdida, 0)}`}
              </p>
            </div>
          ))}
        </Card>
      </Seccion>

      <Seccion titulo="En producción" cuenta={enCurso.length} verTodo={{ href: "/produccion/ordenes", texto: "Todas las órdenes" }}>
        {enCurso.length === 0 ? (
          <Vacio>
            No hay órdenes abiertas.
            {gestiona && (
              <>
                {" "}
                <Link href="/produccion/ordenes/nueva" className="font-semibold text-brand-ink hover:underline">
                  Crear una orden
                </Link>
              </>
            )}
          </Vacio>
        ) : (
          <div>
            {enCurso.map((ot) => (
              <FilaOrden key={ot.id} ot={ot} />
            ))}
          </div>
        )}
      </Seccion>
    </div>
  )
}
