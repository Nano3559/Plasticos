"use client"

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import { COLOR } from "@/lib/colores-graficos"

const bs = (n: number, dec = 0) =>
  new Intl.NumberFormat("es-BO", { style: "currency", currency: "BOB", minimumFractionDigits: dec, maximumFractionDigits: dec }).format(n)
const bsCorto = (n: number) => {
  const a = Math.abs(n)
  if (a >= 1_000_000) return `${(n / 1_000_000).toLocaleString("es-BO", { maximumFractionDigits: 1 })} M`
  if (a >= 1_000) return `${(n / 1_000).toLocaleString("es-BO", { maximumFractionDigits: 1 })} mil`
  return n.toLocaleString("es-BO", { maximumFractionDigits: 0 })
}

function CajaTooltip({ titulo, filas }: { titulo: string; filas: { color: string; texto: string; valor: string }[] }) {
  return (
    <div className="rounded-md border border-line bg-panel px-3 py-2 text-[13px] shadow-[0_4px_16px_rgba(32,32,32,0.10)]">
      <p className="mb-1 font-semibold">{titulo}</p>
      {filas.map((f) => (
        <p key={f.texto} className="flex items-center gap-2 tabular-nums">
          <span className="size-2.5 rounded-full" style={{ backgroundColor: f.color }} aria-hidden />
          <span className="text-subdued">{f.texto}</span>
          <span className="ml-auto pl-4 font-semibold">{f.valor}</span>
        </p>
      ))}
    </div>
  )
}

const ejes = { tick: { fill: COLOR.texto, fontSize: 12 }, tickLine: false, axisLine: false } as const

/** Barras de lo entregado y lo cobrado cada mes, con la línea del saldo acumulado. */
export function GraficoMensual({
  datos,
  alto = 280,
  conSaldo = true,
}: {
  datos: { etiqueta: string; entregado: number; cobrado: number; saldo: number }[]
  alto?: number
  conSaldo?: boolean
}) {
  return (
    <div style={{ height: alto }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={datos} margin={{ top: 8, right: 4, bottom: 0, left: 0 }} barGap={2}>
          <CartesianGrid vertical={false} stroke={COLOR.linea} />
          <XAxis dataKey="etiqueta" {...ejes} interval="preserveStartEnd" minTickGap={8} />
          <YAxis {...ejes} tickFormatter={bsCorto} width={56} />
          <Tooltip
            cursor={{ fill: "rgba(32,32,32,0.04)" }}
            content={({ active, payload, label }) =>
              active && payload?.length ? (
                <CajaTooltip
                  titulo={String(label)}
                  filas={[
                    { color: COLOR.entregado, texto: "Entregado", valor: bs(Number(payload[0]?.payload.entregado)) },
                    { color: COLOR.cobrado, texto: "Cobrado", valor: bs(Number(payload[0]?.payload.cobrado)) },
                    ...(conSaldo ? [{ color: COLOR.saldo, texto: "Saldo al cierre", valor: bs(Number(payload[0]?.payload.saldo)) }] : []),
                  ]}
                />
              ) : null
            }
          />
          <Bar dataKey="entregado" name="Entregado" fill={COLOR.entregado} radius={[3, 3, 0, 0]} maxBarSize={22} />
          <Bar dataKey="cobrado" name="Cobrado" fill={COLOR.cobrado} radius={[3, 3, 0, 0]} maxBarSize={22} />
          {conSaldo && <Line dataKey="saldo" name="Saldo" stroke={COLOR.saldo} strokeWidth={2} dot={false} type="monotone" />}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}

/** Cuánto de lo pendiente tiene 0-15, 16-30, 31-60 y más de 60 días. */
export function GraficoAntiguedad({ datos }: { datos: { rango: string; monto: number }[] }) {
  const colores = [COLOR.verde, COLOR.azul, COLOR.ambar, COLOR.rojo]
  return (
    <div style={{ height: 200 }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={datos} layout="vertical" margin={{ top: 0, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid horizontal={false} stroke={COLOR.linea} />
          <XAxis type="number" {...ejes} tickFormatter={bsCorto} />
          <YAxis type="category" dataKey="rango" {...ejes} width={84} />
          <Tooltip
            cursor={{ fill: "rgba(32,32,32,0.04)" }}
            content={({ active, payload }) =>
              active && payload?.length ? (
                <CajaTooltip
                  titulo={String(payload[0].payload.rango)}
                  filas={[{ color: colores[datos.findIndex((d) => d.rango === payload[0].payload.rango)], texto: "Pendiente", valor: bs(Number(payload[0].value)) }]}
                />
              ) : null
            }
          />
          <Bar dataKey="monto" radius={[0, 3, 3, 0]} maxBarSize={26}>
            {datos.map((d, i) => (
              <Cell key={d.rango} fill={colores[i]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

const COLORES_MEDIO: Record<string, string> = { QR: "#884dff", EFECTIVO: "#058527", TRANSFERENCIA: "#246fe0", OTRO: "#a8a29e" }
const NOMBRE_MEDIO: Record<string, string> = { QR: "QR", EFECTIVO: "Efectivo", TRANSFERENCIA: "Transferencia", OTRO: "Otro / sin dato" }

/** Dona con cómo pagaron los clientes en el periodo. */
export function GraficoMedios({ datos }: { datos: { medio: string; monto: number }[] }) {
  const total = datos.reduce((s, d) => s + d.monto, 0)
  if (total <= 0) return <p className="py-10 text-center text-sm text-subdued">Sin pagos en este periodo.</p>
  return (
    <div className="flex items-center gap-4">
      <div style={{ height: 160, width: 160 }} className="shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={datos} dataKey="monto" nameKey="medio" innerRadius={48} outerRadius={76} paddingAngle={1.5} stroke="none">
              {datos.map((d) => (
                <Cell key={d.medio} fill={COLORES_MEDIO[d.medio] ?? COLORES_MEDIO.OTRO} />
              ))}
            </Pie>
            <Tooltip
              content={({ active, payload }) =>
                active && payload?.length ? (
                  <CajaTooltip
                    titulo={NOMBRE_MEDIO[String(payload[0].name)] ?? String(payload[0].name)}
                    filas={[{ color: COLORES_MEDIO[String(payload[0].name)] ?? COLORES_MEDIO.OTRO, texto: "Cobrado", valor: bs(Number(payload[0].value)) }]}
                  />
                ) : null
              }
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="min-w-0 flex-1 space-y-2 text-[13px]">
        {datos.map((d) => (
          <li key={d.medio} className="flex items-center gap-2">
            <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: COLORES_MEDIO[d.medio] ?? COLORES_MEDIO.OTRO }} aria-hidden />
            <span className="truncate">{NOMBRE_MEDIO[d.medio] ?? d.medio}</span>
            <span className="ml-auto tabular-nums text-subdued">{Math.round((d.monto / total) * 100)} %</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

/** Barras horizontales: quién debe más (todos) o qué productos lleva (un cliente). */
export function GraficoRanking({
  datos,
  color = COLOR.saldo,
  formato = "bs",
  etiquetaValor = "Saldo",
}: {
  datos: { nombre: string; valor: number }[]
  color?: string
  formato?: "bs" | "kg"
  etiquetaValor?: string
}) {
  const fmt = (n: number) => (formato === "bs" ? bs(n) : `${n.toLocaleString("es-BO", { maximumFractionDigits: 1 })} kg`)
  const alto = Math.max(120, datos.length * 34 + 24)
  return (
    <div style={{ height: alto }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={datos} layout="vertical" margin={{ top: 0, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid horizontal={false} stroke={COLOR.linea} />
          <XAxis type="number" {...ejes} tickFormatter={formato === "bs" ? bsCorto : (n: number) => `${bsCorto(n)}`} />
          <YAxis
            type="category"
            dataKey="nombre"
            {...ejes}
            width={150}
            tickFormatter={(t: string) => (t.length > 22 ? `${t.slice(0, 21)}…` : t)}
          />
          <Tooltip
            cursor={{ fill: "rgba(32,32,32,0.04)" }}
            content={({ active, payload }) =>
              active && payload?.length ? (
                <CajaTooltip titulo={String(payload[0].payload.nombre)} filas={[{ color, texto: etiquetaValor, valor: fmt(Number(payload[0].value)) }]} />
              ) : null
            }
          />
          <Bar dataKey="valor" fill={color} radius={[0, 3, 3, 0]} maxBarSize={22} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
