import Link from "next/link"
import { ArrowDownToLine, ArrowUpFromLine, SlidersHorizontal, Plus } from "lucide-react"
import { getSessionUser } from "@/lib/session"
import { prisma } from "@/lib/prisma"
import { stockPorMaterial } from "@/lib/stock"
import { consultarCartera, resumirCartera } from "@/lib/cartera"
import { kgBuenosFinales } from "@/lib/costos"
import { haceDias } from "@/lib/rechazos"
import { formatBs, formatKg } from "@/lib/formato"
import { AREA_NOMBRE } from "@/lib/etiquetas"
import { horaLaPaz, turnoDeHora, TURNO_NOMBRE } from "@/lib/turno"
import { Card } from "@/components/ui/card"
import { FilaOrden } from "@/components/produccion/fila-orden"
import { FilaTarea, VacioTodoOk, type Prioridad } from "@/components/ui/fila-tarea"
import { Seccion } from "@/components/ui/seccion"
import { consultarResumen } from "@/lib/resumen-cobranzas-db"
import { GraficoMensual } from "../cobranzas/resumen/graficos"

export const dynamic = "force-dynamic"


function saludo(hora: number): string {
  if (hora >= 5 && hora < 12) return "Buenos días"
  if (hora >= 12 && hora < 19) return "Buenas tardes"
  return "Buenas noches"
}

function mayuscula(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

type Atencion = { clave: string; href: string; prioridad: Prioridad; titulo: string; detalle: string; derecha?: string; orden: number }

export default async function DashboardPage() {
  const user = await getSessionUser()
  const rol = user?.rol ?? "OPERADOR"
  const hora = horaLaPaz()
  const veInventario = rol === "ALMACEN" || rol === "ADMIN" || rol === "GERENCIA"
  const veProduccion = rol !== "ALMACEN"
  const veCobranzas = rol === "ADMIN" || rol === "GERENCIA"

  const [ordenesEnCurso, materiales, stockMap, registros30d, cartera, movimientos, pesajes] = await Promise.all([
    veProduccion
      ? prisma.ordenTrabajo.findMany({
          where: { estado: "ABIERTA" },
          orderBy: { fechaIngreso: "desc" },
          take: 8,
          include: { cliente: { select: { nombre: true } }, registros: { select: { area: true, kgBuenos: true } } },
        })
      : Promise.resolve([]),
    prisma.material.findMany({ select: { id: true, nombre: true, unidad: true, stockMinimo: true } }),
    stockPorMaterial(),
    prisma.registroProduccion.findMany({
      where: { createdAt: { gte: haceDias(30) } },
      select: { ordenId: true, area: true, kgBuenos: true, kgMerma: true },
    }),
    veCobranzas ? consultarCartera() : Promise.resolve([]),
    veInventario
      ? prisma.movimientoInventario.findMany({
          take: 5,
          orderBy: { createdAt: "desc" },
          include: { material: { select: { nombre: true, unidad: true } }, user: { select: { nombre: true } } },
        })
      : Promise.resolve([]),
    rol === "OPERADOR"
      ? prisma.registroProduccion.findMany({
          where: { userId: user?.id },
          take: 5,
          orderBy: { createdAt: "desc" },
          include: { orden: { select: { id: true, numero: true, producto: true } } },
        })
      : Promise.resolve([]),
  ])

  // Resumen de cobranzas de los últimos 6 meses (solo Administración y Gerencia)
  const resumenCobros = veCobranzas ? await consultarResumen(null, 6) : null

  // ── Lo que hay que atender hoy ───────────────────────────────────────────
  const atencion: Atencion[] = []

  if (veInventario) {
    for (const m of materiales) {
      const stock = stockMap.get(m.id) ?? 0
      const minimo = Number(m.stockMinimo)
      if (minimo > 0 && stock <= minimo) {
        atencion.push({
          clave: `mat-${m.id}`,
          href: `/inventario/${m.id}`,
          prioridad: "alta",
          titulo: `Stock bajo: ${m.nombre}`,
          detalle: `Quedan ${formatKg(stock, 1).replace("kg", m.unidad)} · el mínimo es ${minimo.toLocaleString("es-BO")} ${m.unidad}`,
          orden: 0,
        })
      }
    }
  }

  if (veCobranzas) {
    for (const c of cartera) {
      if (c.saldo > 0.5 && c.diasMasAntiguo > c.cliente.diasCredito) {
        atencion.push({
          clave: `cobro-${c.cliente.id}`,
          href: `/cobranzas/cliente/${c.cliente.id}`,
          prioridad: c.diasMasAntiguo > 60 ? "alta" : "media",
          titulo: `Cobrar a ${c.cliente.nombre}`,
          detalle: `Deuda de ${c.diasMasAntiguo} días · crédito pactado de ${c.cliente.diasCredito}`,
          derecha: formatBs(c.saldo),
          orden: 1 + (1 - Math.min(c.diasMasAntiguo, 365) / 365),
        })
      }
    }
  }

  const progreso = ordenesEnCurso.map((ot) => {
    const hecho = kgBuenosFinales(ot.registros)
    const pedido = Number(ot.kgPedidos)
    return { ot, hecho, pedido, pct: pedido > 0 ? Math.min(100, Math.round((hecho / pedido) * 100)) : 0 }
  })
  for (const p of progreso) {
    if (p.pedido > 0 && p.hecho >= p.pedido) {
      atencion.push({
        clave: `ot-${p.ot.id}`,
        href: `/produccion/ordenes/${p.ot.id}`,
        prioridad: "baja",
        titulo: `OT #${p.ot.numero} lista para cerrar`,
        detalle: `${p.ot.cliente.nombre} · ${formatKg(p.hecho, 0)} producidos de ${formatKg(p.pedido, 0)}`,
        orden: 3,
      })
    }
  }
  atencion.sort((a, b) => a.orden - b.orden)

  // ── Cifras de los últimos 30 días ─────────────────────────────────────────
  const porOrden = new Map<string, typeof registros30d>()
  for (const r of registros30d) porOrden.set(r.ordenId, [...(porOrden.get(r.ordenId) ?? []), r])
  const kgTerminados = [...porOrden.values()].reduce((s, regs) => s + kgBuenosFinales(regs), 0)
  const kgMerma = registros30d.reduce((s, r) => s + Number(r.kgMerma), 0)
  const resumen = resumirCartera(cartera)
  const insumosEnAlerta = atencion.filter((a) => a.clave.startsWith("mat-")).length
  const cobrosPorCobrar = cartera
    .filter((c) => c.saldo > 0.5)
    .sort((a, b) => b.saldo - a.saldo)
    .slice(0, 5)

  const cifras: { etiqueta: string; valor: string; nota: string }[] = [
    { etiqueta: "Producido", valor: formatKg(kgTerminados, 0), nota: "producto terminado, 30 días" },
    { etiqueta: "Merma", valor: formatKg(kgMerma, 0), nota: "material a reciclar, 30 días" },
    veCobranzas
      ? { etiqueta: "Por cobrar", valor: formatBs(resumen.totalPorCobrar, 0), nota: `${resumen.clientesConDeuda} cliente${resumen.clientesConDeuda === 1 ? "" : "s"} con saldo` }
      : { etiqueta: "Insumos en alerta", valor: String(insumosEnAlerta), nota: "bajo el stock mínimo" },
    { etiqueta: "En producción", valor: String(ordenesEnCurso.length), nota: ordenesEnCurso.length === 1 ? "orden abierta" : "órdenes abiertas" },
  ]

  const acciones = [
    veProduccion && { href: "/produccion/registro", texto: "Registrar producción" },
    veCobranzas && { href: "/produccion/ordenes/nueva", texto: "Nueva orden" },
    veInventario && { href: "/inventario/entrada", texto: "Entrada de material" },
    veInventario && { href: "/inventario/salida", texto: "Salida de material" },
    veCobranzas && { href: "/cobranzas/pago", texto: "Registrar pago" },
  ].filter(Boolean) as { href: string; texto: string }[]

  const nombre = (user?.name || "equipo").split(" ")[0]
  const fecha = mayuscula(
    new Date().toLocaleDateString("es-BO", { weekday: "long", day: "numeric", month: "long", timeZone: "America/La_Paz" })
  )

  return (
    <div className="space-y-10">
      <header>
        <p className="text-sm font-medium text-subdued">
          {saludo(hora)}, {nombre}
        </p>
        <h1 className="mt-1 text-[26px] font-bold leading-tight sm:text-[28px]">Hoy</h1>
        <p className="mt-1 text-subdued">
          {fecha} · turno {TURNO_NOMBRE[turnoDeHora(hora)]}
        </p>

        {acciones.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1" role="group" aria-label="Acciones rápidas">
            {/* Igual que el "+ Añadir tarea" de Todoist: el + se rellena al pasar el mouse */}
            {acciones.map((a) => (
              <Link
                key={a.href}
                href={a.href}
                className="group inline-flex h-10 items-center gap-2 rounded-md text-[14px] text-subdued transition-colors hover:text-brand-ink"
              >
                <span className="grid size-[18px] place-items-center rounded-full text-brand transition-colors group-hover:bg-brand group-hover:text-on-brand">
                  <Plus className="size-4" strokeWidth={2.5} />
                </span>
                {a.texto}
              </Link>
            ))}
          </div>
        )}
      </header>

      <Seccion titulo="Requiere tu atención" cuenta={atencion.length}>
        {atencion.length === 0 ? (
          <VacioTodoOk>Todo en orden. No hay nada pendiente por ahora.</VacioTodoOk>
        ) : (
          <div>
            {atencion.slice(0, 8).map((a) => (
              <FilaTarea key={a.clave} href={a.href} prioridad={a.prioridad} titulo={a.titulo} detalle={a.detalle} derecha={a.derecha} />
            ))}
          </div>
        )}
      </Seccion>

      <Card className="grid grid-cols-2 gap-0 py-0 lg:grid-cols-4" aria-label="Cifras de los últimos 30 días">
        {cifras.map((c, i) => (
          <div
            key={c.etiqueta}
            className={`px-5 py-5 ${i % 2 === 1 ? "border-l border-line" : ""} ${i >= 2 ? "border-t border-line lg:border-t-0" : ""} ${i > 0 ? "lg:border-l" : ""}`}
          >
            <p className="text-sm text-subdued">{c.etiqueta}</p>
            <p className="mt-1 text-2xl font-extrabold tracking-tight tabular-nums">{c.valor}</p>
            <p className="mt-0.5 text-xs text-muted">{c.nota}</p>
          </div>
        ))}
      </Card>

      {resumenCobros && (
        <Seccion titulo="Cobranzas, últimos 6 meses" verTodo={{ href: "/cobranzas/resumen", texto: "Ver por cliente" }}>
          <p className="pb-3 pt-2 text-[14px] text-subdued">
            Falta cobrar <strong className="font-semibold text-fg tabular-nums">{formatBs(resumenCobros.porCobrar, 0)}</strong>
            {resumenCobros.enMora > 0.5 && (
              <>
                {" "}· <span className="text-danger">{formatBs(resumenCobros.enMora, 0)} vencidos</span>
              </>
            )}{" "}
            · cobrado en 6 meses <strong className="font-semibold text-brand-ink tabular-nums">{formatBs(resumenCobros.cobradoPeriodo, 0)}</strong>
          </p>
          <GraficoMensual datos={resumenCobros.serie} alto={220} />
        </Seccion>
      )}

      <div className="grid gap-10 lg:grid-cols-2">
        {veProduccion && (
          <Seccion titulo="En producción" cuenta={ordenesEnCurso.length} verTodo={{ href: "/produccion/ordenes" }}>
            {progreso.length === 0 ? (
              <p className="py-6 text-subdued">No hay órdenes abiertas.</p>
            ) : (
              <div>
                {progreso.slice(0, 5).map(({ ot }) => (
                  <FilaOrden key={ot.id} ot={ot} />
                ))}
              </div>
            )}
          </Seccion>
        )}

        {veCobranzas ? (
          <Seccion titulo="Por cobrar" cuenta={resumen.clientesConDeuda} verTodo={{ href: "/cobranzas/cartera", texto: "Ver cartera" }}>
            {cobrosPorCobrar.length === 0 ? (
              <VacioTodoOk>Ningún cliente tiene saldo pendiente.</VacioTodoOk>
            ) : (
              <div>
                {cobrosPorCobrar.map((c) => (
                  <FilaTarea
                    key={c.cliente.id}
                    href={`/cobranzas/cliente/${c.cliente.id}`}
                    prioridad={c.diasMasAntiguo > c.cliente.diasCredito ? "media" : "baja"}
                    titulo={c.cliente.nombre}
                    detalle={`${c.diasMasAntiguo} días con saldo · crédito de ${c.cliente.diasCredito}`}
                    derecha={<span className="font-semibold text-fg">{formatBs(c.saldo)}</span>}
                  />
                ))}
              </div>
            )}
          </Seccion>
        ) : rol === "OPERADOR" ? (
          <Seccion titulo="Tus últimos pesajes" cuenta={pesajes.length} verTodo={{ href: "/produccion" }}>
            {pesajes.length === 0 ? (
              <p className="py-6 text-subdued">Todavía no registraste producción.</p>
            ) : (
              <div>
                {pesajes.map((r) => (
                  <FilaTarea
                    key={r.id}
                    href={`/produccion/ordenes/${r.orden.id}`}
                    prioridad="ok"
                    titulo={`OT #${r.orden.numero} · ${r.orden.producto}`}
                    detalle={`${AREA_NOMBRE[r.area]} · turno ${TURNO_NOMBRE[r.turno]}`}
                    derecha={formatKg(r.kgBuenos, 1)}
                  />
                ))}
              </div>
            )}
          </Seccion>
        ) : null}

        {veInventario && (
          <Seccion titulo="Movimientos de almacén" cuenta={movimientos.length} verTodo={{ href: "/inventario", texto: "Ver inventario" }}>
            {movimientos.length === 0 ? (
              <p className="py-6 text-subdued">Todavía no hay movimientos.</p>
            ) : (
              <ul>
                {movimientos.map((m) => {
                  const Icono = m.tipo === "ENTRADA" ? ArrowDownToLine : m.tipo === "SALIDA" ? ArrowUpFromLine : SlidersHorizontal
                  const color = m.tipo === "ENTRADA" ? "bg-accent/12 text-accent" : m.tipo === "SALIDA" ? "bg-warn/12 text-warn" : "bg-info/12 text-info"
                  return (
                    <li key={m.id} className="flex items-center gap-3 border-b border-line py-3 last:border-b-0">
                      <span className={`grid size-9 shrink-0 place-items-center rounded-lg ${color}`} aria-hidden>
                        <Icono className="size-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold">{m.material.nombre}</p>
                        <p className="text-sm text-subdued">
                          {m.tipo === "ENTRADA" ? "Entrada" : m.tipo === "SALIDA" ? "Salida" : "Ajuste"} · turno {TURNO_NOMBRE[m.turno]} · {m.user.nombre}
                        </p>
                      </div>
                      <span className="shrink-0 font-semibold tabular-nums">
                        {m.tipo === "SALIDA" ? "−" : Number(m.cantidad) < 0 ? "−" : "+"}
                        {Math.abs(Number(m.cantidad)).toLocaleString("es-BO", { maximumFractionDigits: 1 })} {m.material.unidad}
                      </span>
                    </li>
                  )
                })}
              </ul>
            )}
          </Seccion>
        )}
      </div>
    </div>
  )
}
