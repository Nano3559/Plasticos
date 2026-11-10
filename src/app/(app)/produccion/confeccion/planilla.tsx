import { metricasExtrusion,type ParteExtrusionDatos } from "@/lib/extrusion"
import { formatNumero as n } from "@/lib/formato"

export function PlanillaConfeccion({datos}:{datos:ParteExtrusionDatos}) {
  const m=metricasExtrusion(datos.filas,datos.pedido)
  const acumulados=datos.filas.reduce<number[]>((valores,f)=>{valores.push((valores.at(-1)??0)+f.buenos);return valores},[])
  const celda="border border-slate-300 px-3 py-2 align-top",numero=`${celda} text-right tabular-nums whitespace-nowrap`
  return <article className="overflow-hidden rounded-xl border border-slate-300 bg-white text-slate-900 shadow-sm">
    <header className="flex flex-wrap justify-between gap-3 border-b border-slate-300 bg-cyan-50 px-5 py-4"><div><p className="text-xs font-semibold uppercase tracking-widest text-cyan-800">Orden de trabajo · sección confección</p><h3 className="mt-1 text-xl font-bold">{datos.producto}</h3></div><p className="rounded-lg border border-cyan-200 bg-white px-4 py-2 text-xl font-bold">OT {datos.ot}</p></header>
    <dl className="grid grid-cols-2 sm:grid-cols-4">{Object.entries({Cliente:datos.cliente,Producto:datos.producto,"Cantidad pedida":`${n(datos.pedido)} kg`,Máquina:datos.maquina,...datos.ficha}).map(([k,v])=><div key={k} className="border-b border-r border-slate-200 px-4 py-3"><dt className="text-[11px] font-semibold uppercase text-slate-500">{k}</dt><dd className="mt-1 whitespace-pre-wrap font-medium">{v||"Sin dato"}</dd></div>)}</dl>
    <div className="bg-slate-50 px-4 py-3"><h4 className="font-bold uppercase">Desarrollo de la producción</h4><p className="text-sm">Parte completo · {datos.hoja} · los datos faltantes se conservan sin estimar</p></div>
    <div tabIndex={0} role="region" aria-label={`Planilla completa de confección OT ${datos.ot}`} className="max-h-[70vh] overflow-auto focus-visible:outline-2 focus-visible:outline-cyan-700">
      <table className="w-full min-w-[1500px] border-collapse text-sm"><caption className="sr-only">Material utilizado, bultos, paquetes, desperdicio e interrupciones de confección.</caption>
        <thead className="sticky top-0 z-10 bg-cyan-50 text-xs uppercase text-cyan-950"><tr>
          {["Fecha","Operador","Turno","Inicio","Término"].map(h=><th key={h} rowSpan={2} scope="col" className={celda}>{h}</th>)}
          <th colSpan={2} scope="colgroup" className={celda}>Material utilizado</th><th colSpan={5} scope="colgroup" className={celda}>Producto a entregar</th><th colSpan={2} scope="colgroup" className={celda}>Interrupciones</th>
        </tr><tr>{["N° bobina","Kilos","Bulto N°","Peso kg","N° paquetes","Acumulado kg","Desperdicio kg","Motivo","Tiempo"].map(h=><th key={h} scope="col" className={celda}>{h}</th>)}</tr></thead>
        <tbody><tr className="bg-cyan-100/70 font-bold"><th colSpan={6} scope="row" className={`${celda} text-left`}>TOTALES</th><td className={numero}>{m.entradaCompleta?n(m.entrada):"Incompleto"}</td><td className={numero}>{m.bultos}</td><td className={numero}>{n(m.buenos)}</td><td className={numero}>{m.paquetesCompletos?n(m.paquetes):"Sin dato completo"}</td><td className={numero}>{n(m.buenos)}</td><td className={numero}>{n(m.desperdicio)}</td><td className={celda}>{m.sinDuracion?`${m.sinDuracion} filas sin duración`:"—"}</td><td className={numero}>{n(m.minutos)} min conocidos</td></tr>
          {datos.filas.map((f,i)=><tr key={f.fila} title={`Fila ${f.fila} del Excel`} className={`${i%2?"bg-slate-50":"bg-white"} hover:bg-cyan-50`}>
            <td className={celda}>{f.fecha?f.fecha.split("-").reverse().join("/"):"Sin fecha"}</td><td className={celda}>{f.operador||"Sin dato"}</td><td className={celda}>{f.turno||"Sin dato"}</td><td className={celda}>{f.inicio||"—"}</td><td className={celda}>{f.termino||"—"}</td><td className={celda}>{f.bobinaEntrada||"Sin dato"}</td><td className={numero}>{f.entradaInformada===false?"Sin dato":n(f.entrada)}</td><td className={`${numero} font-semibold`}>{f.bulto||"Sin dato"}</td><td className={numero}>{n(f.buenos)}</td><td className={numero}>{f.paquetes===null||f.paquetes===undefined?"Sin dato":n(f.paquetes,0)}</td><td className={`${numero} text-slate-500`}>{n(acumulados[i])}</td><td className={`${numero} ${f.desperdicio?"bg-amber-50 text-amber-900":""}`}>{f.desperdicio?n(f.desperdicio):"—"}</td><td className={`${celda} min-w-48`}>{f.motivo||"—"}</td><td className={numero}>{f.minutos===null?(f.motivo?"Sin dato":"—"):`${n(f.minutos)} min`}</td>
          </tr>)}
        </tbody>
      </table>
    </div>
    <footer className="flex flex-wrap justify-between gap-3 border-t border-slate-300 bg-slate-50 px-4 py-3 text-sm"><p>Avance del pedido: <strong>{n(m.avance)}%</strong></p><p className="font-semibold text-amber-800">{m.diferencia===null?"Balance y rendimiento pendientes: faltan kilos de entrada":`Balance por conciliar: ${n(m.diferencia)} kg`}</p></footer>
  </article>
}
