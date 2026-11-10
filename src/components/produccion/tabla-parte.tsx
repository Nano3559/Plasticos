import type { FilaExtrusion } from "@/lib/extrusion"
import type { AreaParte } from "@/lib/secciones-produccion"
import { formatNumero as n } from "@/lib/formato"

export function TablaParte({filas,area,mostrarOrigen=false}:{filas:(FilaExtrusion&{ot?:string;maquina?:string})[];area:AreaParte;mostrarOrigen?:boolean}) {
  const confeccion=area==="CONFECCION"
  const titulos=[...(mostrarOrigen?["OT","Máquina"]:[]),"Fila Excel","Fecha","Operador","Turno",...(confeccion?["Inicio","Término","Bobina de entrada"]:["Material"]),"Entrada kg",confeccion?"Bulto":"Bobina","Producto kg",...(confeccion?["Paquetes"]:[]),"Desperdicio kg","Interrupción","Minutos"]
  return <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr>{titulos.map(h=><th key={h} scope="col" className="whitespace-nowrap p-2">{h}</th>)}</tr></thead><tbody>{filas.map((f,i)=>{
    const valores=[...(mostrarOrigen?[f.ot??"",f.maquina||"Sin dato"]:[]),f.fila,f.fecha||"Sin fecha",f.operador||"Sin dato",f.turno||"Sin dato",...(confeccion?[f.inicio||"—",f.termino||"—",f.bobinaEntrada||"Sin dato"]:[f.material||"—"]),f.entradaInformada===false?"Sin dato":n(f.entrada),confeccion?f.bulto||"Sin dato":f.bobina||"—",n(f.buenos),...(confeccion?[f.paquetes===null||f.paquetes===undefined?"Sin dato":n(f.paquetes,0)]:[]),n(f.desperdicio),f.motivo||"—",f.minutos===null?"Sin dato":n(f.minutos)]
    return <tr key={`${f.ot??""}-${f.fila}-${i}`} className="border-t border-line">{valores.map((v,j)=><td key={j} className="p-2">{v}</td>)}</tr>
  })}</tbody></table></div>
}
