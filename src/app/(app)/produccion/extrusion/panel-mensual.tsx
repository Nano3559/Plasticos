"use client"

import { useState } from "react"
import Link from "next/link"
import { Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import type { resumenMensualExtrusion } from "@/lib/panel-extrusion"

const numero = (v: number) => v.toLocaleString("es-BO", { maximumFractionDigits: 2 })
const colores = ["#6366f1", "#07899b", "#64748b", "#ea8a13", "#8b5cf6", "#0d9488"]
function Barras({ datos, titulo }: { datos: { nombre: string; kg: number }[]; titulo: string }) {
  return <div className="min-w-0 rounded-xl border border-line bg-white p-4"><h3 className="mb-4 font-semibold">{titulo}</h3><div style={{ height: Math.max(260, datos.length * 48) }} role="img" aria-label={`${titulo}: ${datos.map(d => `${d.nombre}: ${numero(d.kg)} kg`).join(", ")}`}><ResponsiveContainer width="100%" height="100%"><BarChart data={datos} layout="vertical" margin={{ left: 5, right: 65 }}><CartesianGrid strokeDasharray="3 3" horizontal={false}/><XAxis type="number" tickFormatter={numero} unit=" kg" tick={{ fontSize: 11 }}/><YAxis type="category" dataKey="nombre" width={125} tick={{ fontSize: 12 }}/><Tooltip formatter={v => [`${numero(Number(v))} kg`, "Cantidad"]}/><Bar dataKey="kg" radius={[0, 6, 6, 0]} maxBarSize={30}>{datos.map((d, i) => <Cell key={d.nombre} fill={colores[i % colores.length]}/>)}<LabelList dataKey="kg" position="right" formatter={v => numero(Number(v))} style={{ fontSize: 12 }}/></Bar></BarChart></ResponsiveContainer></div></div>
}

export function PanelMensualExtrusion({ meses, mesActual }: { meses: ReturnType<typeof resumenMensualExtrusion>; mesActual: string }) {
  const [mes, setMes] = useState(meses.some(m => m.mes === mesActual) ? mesActual : meses[0]?.mes || mesActual)
  const datos = meses.find(m => m.mes === mes)
  const balance = datos ? [{ nombre: "Cantidad a producir", kg: datos.pedido }, { nombre: "Cantidad producida", kg: datos.buenos }, { nombre: "Total material", kg: datos.entrada }, { nombre: "Desperdicio", kg: datos.desperdicio }] : []
  return <section className="space-y-5 rounded-2xl border border-line bg-elevated p-4 sm:p-6" aria-labelledby="panel-mensual">
    <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-sm font-semibold text-brand-ink">EXTRUSIÓN · VISTA MENSUAL</p><h2 id="panel-mensual" className="text-2xl font-bold">Producción y consumo de materiales</h2><p className="mt-1 text-sm text-subdued">Selecciona un mes para comparar los kilos de las OT y su mezcla de materiales.</p></div><label className="font-semibold">Mes del panel<input aria-label="Mes del panel" type="month" value={mes} onChange={e => setMes(e.target.value)} className="mt-1 block rounded-lg border border-line bg-white p-2"/></label></div>
    <p className="text-sm text-subdued">Este panel tiene su propio filtro mensual y respeta la OT seleccionada. Los filtros de máquina, turno, operador y fechas de abajo corresponden al análisis detallado.</p>
    {datos ? <>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{balance.map((d, i) => <div key={d.nombre} className="rounded-xl border border-line bg-white p-4" style={{ borderTop: `4px solid ${colores[i]}` }}><p className="text-sm text-subdued">{d.nombre}</p><p className="mt-2 text-2xl font-bold tabular-nums">{numero(d.kg)} <span className="text-sm font-normal">kg</span></p></div>)}</div>
      <p className="text-sm text-subdued">{datos.ordenes.length} OT con registros en el mes. Cantidad a producir = pedido completo de esas OT, contado una vez por OT; una OT puede aparecer en varios meses. No representa una meta mensual programada. Producido, material y desperdicio corresponden solo a las filas del mes.</p>
      {!datos.entradaCompleta && <p role="status" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">Faltan entradas de material. El total y el desglose muestran únicamente los kilos registrados.</p>}
      <div className="grid gap-4 xl:grid-cols-2"><Barras titulo="Balance del mes (kg)" datos={balance}/><Barras titulo="Material utilizado por tipo (kg)" datos={datos.materiales}/></div>
      <details className="rounded-xl border border-line bg-white p-4"><summary className="cursor-pointer font-semibold">Ver cantidades de cada OT y materiales</summary><div className="mt-4 overflow-x-auto"><table className="w-full text-left text-sm"><caption className="sr-only">Cantidades en kilogramos por OT del mes</caption><thead><tr>{["OT / Cliente", "A producir (pedido completo)", "Producido en el mes", "Material en el mes", "Desperdicio en el mes"].map(t => <th scope="col" key={t} className="p-2">{t}</th>)}</tr></thead><tbody>{datos.ordenes.map(o => <tr key={o.id} className="border-t border-line"><th scope="row" className="p-2"><Link href={`/produccion/ordenes/${o.id}`} className="text-brand-ink">OT {o.ot} · {o.cliente}</Link></th>{[o.pedido, o.buenos, o.entrada, o.desperdicio].map((v, i) => <td key={i} className="p-2">{numero(v)}{i === 2 && !o.entradaCompleta ? " (incompleto)" : ""}</td>)}</tr>)}</tbody></table></div><dl className="mt-4 grid gap-2 sm:grid-cols-3">{datos.materiales.map(d => <div key={d.nombre}><dt className="text-sm text-subdued">{d.nombre}</dt><dd className="font-semibold">{numero(d.kg)} kg</dd></div>)}</dl></details>
    </> : <p className="rounded-xl border border-line bg-white p-6">No hay registros con fecha para este mes. Selecciona otro mes o importa un parte de extrusión.</p>}
    {meses.length > 0 && <p className="text-sm text-subdued">Meses con datos: {meses.map(m => m.mes).join(" · ")}. Se usa la última versión importada de cada OT. Las filas sin fecha quedan fuera del panel.</p>}
  </section>
}
