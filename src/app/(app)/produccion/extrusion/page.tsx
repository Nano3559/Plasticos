import Link from "next/link"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { getSessionUser } from "@/lib/session"
import { consultarExtrusion, historialExtrusion } from "@/lib/extrusion-db"
import { agruparExtrusion, filtrarExtrusion, leerFiltrosExtrusion, metricasExtrusion } from "@/lib/extrusion"
import { Encabezado } from "@/components/ui/encabezado"
import { Cifras } from "@/components/ui/cifras"
import { ImportadorExtrusion } from "./importador"
import { GraficosExtrusion } from "./graficos"
import { PlanillaExtrusion } from "./planilla"

export const dynamic="force-dynamic"
const n=(v:number)=>v.toLocaleString("es-BO",{maximumFractionDigits:2})
export default async function ExtrusionPage({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}) {
  const user=await getSessionUser()
  if(!user||!["OPERADOR","ADMIN","GERENCIA","ALMACEN"].includes(user.rol))redirect("/dashboard")
  let q:ReturnType<typeof leerFiltrosExtrusion>
  try { q=leerFiltrosExtrusion(await searchParams) } catch(e) {return <div className="space-y-4"><p role="alert">{e instanceof Error?e.message:"Filtros inválidos"}</p><Link href="/produccion/extrusion">Limpiar filtros</Link></div>}
  const ot=q.ot??""
  const gestiona=["ADMIN","GERENCIA"].includes(user.rol)
  const [partes,ordenes,historial]=await Promise.all([consultarExtrusion(ot||undefined),prisma.ordenTrabajo.findMany({where:{estado:"ABIERTA"},include:{cliente:true},orderBy:{numero:"desc"}}),historialExtrusion(ot||undefined)])
  const filas=filtrarExtrusion(partes.flatMap(p=>p.datos.filas.map(f=>({...f,maquina:p.datos.maquina,orden:p.ordenId}))),q)
  const m=metricasExtrusion(filas)
  const diarios=agruparExtrusion(filas,"fecha"),operadores=agruparExtrusion(filas,"operador"),turnos=agruparExtrusion(filas,"turno"),materiales=agruparExtrusion(filas,"material")
  const maquinas=[...new Set(partes.map(p=>p.datos.maquina))].sort()
  const porMaquina=maquinas.map(maquina=>({nombre:maquina||"Sin indicar",...metricasExtrusion(filas.filter(f=>f.maquina===maquina))}))
  const todas=partes.flatMap(p=>p.datos.filas)
  const exportQuery=new URLSearchParams(Object.entries(q).filter((e):e is [string,string]=>typeof e[1]==="string")).toString()
  return <div className="space-y-7"><Encabezado miga={{href:"/produccion",texto:"Producción"}} titulo="Extrusión · órdenes y bobinas" descripcion="Consumos, producción, desperdicio e interrupciones del parte de planta." acciones={gestiona?<a href={`/api/export/extrusion?${exportQuery}`} className="font-semibold text-brand-ink">Descargar reporte Excel</a>:undefined}/>
    {gestiona&&<ImportadorExtrusion ordenes={ordenes.map(o=>({id:o.id,nombre:`OT ${o.refExterna??o.numero} · ${o.cliente.nombre} · ${o.producto}`}))}/>}
    <form className="grid gap-3 rounded-xl border border-line p-4 sm:grid-cols-3" method="get">
      <label>OT<select name="ot" defaultValue={ot} className="block w-full rounded border p-2"><option value="">Todas las OT importadas</option>{[...new Map([...partes.map(p=>[p.ordenId,`OT ${p.datos.ot} · ${p.datos.cliente}`] as const),...ordenes.map(o=>[o.id,`OT ${o.refExterna??o.numero} · ${o.cliente.nombre}`] as const)]).entries()].map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label>
      <label>Desde<input type="date" name="desde" defaultValue={q.desde} className="block w-full rounded border p-2"/></label><label>Hasta<input type="date" name="hasta" defaultValue={q.hasta} className="block w-full rounded border p-2"/></label>
      {([["maquina","Máquina",maquinas],["turno","Turno",[...new Set(todas.map(f=>f.turno))]],["operador","Operador",[...new Set(todas.map(f=>f.operador))]]] as const).map(([key,label,values])=><label key={key}>{label}<select name={key} defaultValue={q[key]??""} className="block w-full rounded border p-2"><option value="">Todos</option>{values.map(v=><option key={v} value={v}>{v||"Sin indicar"}</option>)}</select></label>)}
      <button className="rounded bg-brand-ink p-2 text-white">Aplicar filtros</button><Link href="/produccion/extrusion" className="p-2">Limpiar filtros</Link>
    </form>
    <Cifras items={[{etiqueta:"Material utilizado",valor:`${n(m.entrada)} kg`},{etiqueta:"Bobinas producidas",valor:`${n(m.buenos)} kg`,nota:`${m.bobinas} bobinas · promedio ${n(m.pesoMedio)} kg`},{etiqueta:"Desperdicio",valor:`${n(m.desperdicio)} kg`,nota:`${n(m.mermaPct)}% del material`},{etiqueta:"Balance por conciliar",valor:`${n(m.diferencia)} kg`,tono:Math.abs(m.diferencia)>.02?"warn":undefined,nota:"Material − bobinas − desperdicio"}]}/>
    <p className="text-sm text-subdued">Rendimiento aparente: {n(m.rendimiento)}%. Interrupciones con duración: {n(m.minutos)} min; {m.sinDuracion} filas con motivo sin duración. No se calcula OEE ni kg/h sin horas de operación. Estos partes se reportan por separado de los pesajes operativos para evitar duplicar producción y costos.</p>
    <section className="space-y-4" aria-label="Partes con formato de Excel">
      <div><h2 className="text-lg font-bold">Planilla de extrusión</h2><p className="text-sm text-subdued">Misma estructura del Excel, con acumulados y totales recalculados. Muestra el parte completo; los filtros de fechas, máquina, operador y turno se aplican al análisis de abajo.</p></div>
      {partes.length===0?<p className="rounded-xl border border-line p-5 text-subdued">Después de importar, el parte aparecerá aquí con su ficha técnica y su tabla de producción.</p>:partes.map(p=><details key={p.id} open={partes.length===1} className="space-y-3"><summary className="cursor-pointer rounded-lg bg-elevated p-3 font-semibold">Ver planilla · OT {p.datos.ot} · {p.datos.cliente} · Máquina {p.datos.maquina}</summary><PlanillaExtrusion datos={p.datos}/></details>)}
    </section>
    <GraficosExtrusion series={[{titulo:"Producción por fecha",datos:diarios},{titulo:"Producción por operador",datos:operadores},{titulo:"Producción por turno",datos:turnos},{titulo:"Producción por máquina",datos:porMaquina},{titulo:"Mezcla por material",datos:materiales.map(x=>({...x,buenos:0,desperdicio:0}))}]}/>
    <section className="space-y-3"><h2 className="text-lg font-bold">Órdenes importadas y ficha técnica</h2>{!partes.length&&<p>No hay partes importados. Selecciona una OT abierta y analiza el Excel para comenzar.</p>}{partes.map(p=>{const resumen=metricasExtrusion(p.datos.filas,p.datos.pedido);return <details key={p.id} className="rounded-xl border border-line p-4"><summary className="cursor-pointer font-semibold">OT {p.datos.ot} · {p.datos.cliente} · Máquina {p.datos.maquina} · avance {n(resumen.avance)}%</summary><div className="mt-4 space-y-3"><Link href={`/produccion/ordenes/${p.ordenId}`} className="text-brand-ink">Abrir orden de trabajo</Link><p>{p.datos.producto} · pedido {n(p.datos.pedido)} kg · {p.archivo} / {p.hoja}</p><p className="text-sm">Última versión: {p.createdAt.toLocaleString("es-BO",{timeZone:"America/La_Paz"})}. La ficha y el avance muestran el parte completo; los gráficos y el detalle respetan los filtros.</p><dl className="grid gap-2 sm:grid-cols-3">{Object.entries(p.datos.ficha).map(([k,v])=><div key={k}><dt className="text-sm text-subdued">{k}</dt><dd>{v||"Sin indicar"}</dd></div>)}</dl><ul className="list-disc pl-5">{p.datos.avisos.map(a=><li key={a}>{a}</li>)}</ul></div></details>})}</section>
    <section><h2 className="mb-3 text-lg font-bold">Detalle del periodo ({filas.length} filas)</h2><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr>{["Fecha","OT","Máquina","Operador","Turno","Material","Entrada kg","Bobina","Buenos kg","Desperdicio kg","Interrupción","Minutos"].map(h=><th key={h} className="p-2">{h}</th>)}</tr></thead><tbody>{filas.map((f,i)=><tr key={`${f.orden}-${f.fila}-${i}`} className="border-t border-line">{[f.fecha,partes.find(p=>p.ordenId===f.orden)?.datos.ot,f.maquina,f.operador,f.turno,f.material,n(f.entrada),f.bobina,n(f.buenos),n(f.desperdicio),f.motivo,f.minutos===null?"Sin dato":n(f.minutos)].map((v,j)=><td key={j} className="p-2">{v}</td>)}</tr>)}</tbody></table></div></section>
    <details className="rounded-xl border border-line p-4"><summary className="cursor-pointer font-semibold">Historial de importaciones · últimas 20</summary><p className="my-3 text-sm text-subdued">Fechas de importación, para la OT seleccionada o todas las OT. Los filtros de producción no cambian este historial.</p><ul className="divide-y divide-line">{historial.map(h=><li key={h.id} className="py-2 text-sm">OT {h.orden.refExterna??h.orden.numero} · {h.archivo} / {h.hoja} · {h.autor.nombre} · {h.createdAt.toLocaleString("es-BO",{timeZone:"America/La_Paz"})}</li>)}</ul></details>
  </div>
}
