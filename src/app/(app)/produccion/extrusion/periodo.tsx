"use client"

import { useState } from "react"
import { rangoProduccion } from "@/lib/periodo-produccion"

export function PeriodoProduccion({ desde = "", hasta = "", hoy }: { desde?: string; hasta?: string; hoy: string }) {
  const [tipo, setTipo] = useState(() => {
    if (!desde || !hasta) return "rango"
    const mes = rangoProduccion("mes", desde.slice(0, 7))
    if (mes.desde === desde && mes.hasta === hasta) return "mes"
    const semana = rangoProduccion("semana", desde)
    return semana.desde === desde && semana.hasta === hasta ? "semana" : "rango"
  })
  const [mes, setMes] = useState((desde || hoy).slice(0, 7))
  const [dia, setDia] = useState(desde || hoy)
  const [inicio, setInicio] = useState(desde)
  const [fin, setFin] = useState(hasta)
  const rango = tipo === "rango" ? { desde: inicio, hasta: fin } : rangoProduccion(tipo as "mes" | "semana", tipo === "mes" ? mes : dia)
  return <fieldset className="grid gap-3 sm:col-span-2 sm:grid-cols-3">
    <legend className="mb-2 font-semibold">Periodo de producción</legend>
    <label>Ver por<select value={tipo} onChange={e => setTipo(e.target.value)} className="block w-full rounded border p-2"><option value="rango">Rango de fechas / todo</option><option value="mes">Mes</option><option value="semana">Semana</option></select></label>
    {tipo === "mes" ? <label>Mes<input type="month" required value={mes} onChange={e => setMes(e.target.value)} className="block w-full rounded border p-2"/></label> : tipo === "semana" ? <label>Día de la semana<input type="date" required value={dia} onChange={e => setDia(e.target.value)} className="block w-full rounded border p-2"/></label> : <><label>Desde<input type="date" value={inicio} onChange={e => setInicio(e.target.value)} className="block w-full rounded border p-2"/></label><label>Hasta<input type="date" value={fin} min={inicio || undefined} onChange={e => setFin(e.target.value)} className="block w-full rounded border p-2"/></label></>}
    <input type="hidden" name="desde" value={rango.desde}/><input type="hidden" name="hasta" value={rango.hasta}/>
    {tipo !== "rango" && <p className="self-end pb-2 text-sm text-subdued">{rango.desde} al {rango.hasta}{tipo === "semana" ? " · lunes a domingo" : ""}</p>}
  </fieldset>
}
