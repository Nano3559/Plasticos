import * as XLSX from "xlsx"
import { leerNumero } from "@/lib/formato"
import { parseFecha } from "@/lib/lectura-excel"
import { metricasExtrusion,type FilaExtrusion,type ParteExtrusionDatos } from "@/lib/extrusion"

const texto=(v:unknown)=>String(v??"").trim()
const normal=(v:unknown)=>texto(v).normalize("NFD").replace(/[\u0300-\u036f]/g,"").toUpperCase()
const vacio=(v:unknown)=>v===null||v===undefined||v===""
function numero(v:unknown,campo:string):number {
  const n=vacio(v)?0:typeof v==="number"?v:leerNumero(texto(v),2)
  if(!Number.isFinite(n)||n<0)throw new Error(`${campo}: número inválido o negativo`)
  return n
}
function hora(v:unknown,campo:string):string {
  if(vacio(v))return ""
  if(typeof v==="number"&&v>=0&&v<1){const minutos=Math.round(v*1440)%1440;return `${String(Math.floor(minutos/60)).padStart(2,"0")}:${String(minutos%60).padStart(2,"0")}`}
  const m=texto(v).match(/^(\d{1,2}):(\d{2})$/)
  if(m&&+m[1]<24&&+m[2]<60)return `${m[1].padStart(2,"0")}:${m[2]}`
  throw new Error(`${campo}: escribe la hora como hh:mm`)
}
export function analizarConfeccion(bytes:Uint8Array,hoja?:string):ParteExtrusionDatos {
  const wb=XLSX.read(bytes,{type:"array",cellDates:false,sheetRows:5010})
  const nombre=hoja||wb.SheetNames.find(n=>/^OT[-\s]*CONF/i.test(n))
  if(!nombre||!wb.Sheets[nombre])throw new Error("No se encontró una hoja OT-CONF de confección")
  const ws=wb.Sheets[nombre],rango=XLSX.utils.decode_range(ws["!ref"]||"A1")
  if(rango.e.r>=5000||rango.e.c>40)throw new Error("La hoja supera el límite de 5.000 filas o 41 columnas")
  for(const [direccion,c] of Object.entries(ws))if(!direccion.startsWith("!")&&c?.t==="e")throw new Error(`La celda ${direccion} tiene un error de Excel`)
  const rows=XLSX.utils.sheet_to_json<unknown[]>(ws,{header:1,defval:null}),celda=(r:number,c:number)=>rows[r]?.[c]
  if(!normal(celda(0,0)).includes("ORDEN DE TRABAJO SECCION CONFECCION"))throw new Error("El archivo no corresponde al formato de confección")
  if(normal(celda(9,7))!=="BULTO NO"||normal(celda(9,8))!=="PESO (KG)")throw new Error("Las columnas no coinciden con el template de confección")
  const ficha:Record<string,string>={}
  for(const [k,r,c] of [["Ancho",3,1],["Largo",3,3],["Micronaje",3,5],["Tipo de soldadura",3,8],["Con impresión",3,11],["Tipo de material",4,1],["Color",4,6],["Por unidades",4,10],["Por peso",4,12],["Observaciones",5,1]] as const)ficha[k]=texto(celda(r,c))
  const filas:FilaExtrusion[]=[],bultos=new Set<string>()
  let fecha="",operador="",turno=""
  for(let i=11;i<rows.length;i++) {
    const r=rows[i];if(!r?.some(v=>!vacio(v)))continue
    if(normal(r[0]).startsWith("TOTAL"))continue
    if(!vacio(r[0])) {
      const d=parseFecha(r[0],!!wb.Workbook?.WBProps?.date1904)
      if(!d||d.getUTCFullYear()<2000||d.getUTCFullYear()>2100)throw new Error(`Fila ${i+1}: fecha inválida`)
      fecha=d.toISOString().slice(0,10);operador=texto(r[1]);turno=texto(r[2])
    } else {if(texto(r[1]))operador=texto(r[1]);if(texto(r[2]))turno=texto(r[2])}
    if(turno){const t=normal(turno);const n=t.match(/^[123][ªº°A]?$/)?.[0]?.[0];turno=n?`${n}ª`:({MANANA:"1ª",TARDE:"2ª",NOCHE:"3ª"} as Record<string,string>)[t]||turno;if(!/^[123]ª$/.test(turno))throw new Error(`Fila ${i+1}: turno no reconocido`)}
    const entrada=numero(r[6],`Fila ${i+1}, entrada`),buenos=numero(r[8],`Fila ${i+1}, peso`),desperdicio=numero(r[11],`Fila ${i+1}, desperdicio`)
    const bulto=texto(r[7]),bobinaEntrada=texto(r[5]),motivo=texto(r[12])
    const paquetes=vacio(r[9])?null:numero(r[9],`Fila ${i+1}, paquetes`)
    if(paquetes!==null&&!Number.isInteger(paquetes))throw new Error(`Fila ${i+1}: los paquetes deben ser enteros`)
    const inicio=hora(r[3],`Fila ${i+1}, inicio`),termino=hora(r[4],`Fila ${i+1}, término`)
    let minutos:number|null=null
    if(!vacio(r[13])) {
      const m=texto(r[13]).match(/^(\d+):(\d{2})$/)
      if(m&&+m[2]<60)minutos=+m[1]*60 + +m[2]
      else if(typeof r[13]==="number"&&r[13]>=0&&r[13]<1)minutos=r[13]*1440
      else throw new Error(`Fila ${i+1}: indica el tiempo de interrupción como hh:mm`)
    }
    if(!entrada&&!buenos&&!desperdicio&&!bulto&&!bobinaEntrada&&!motivo&&paquetes===null&&minutos===null)continue
    if(bulto){if(bultos.has(bulto))throw new Error(`Bulto duplicado: ${bulto}`);bultos.add(bulto)}
    filas.push({fila:i+1,fecha,operador,turno,material:bobinaEntrada,entrada,entradaInformada:!vacio(r[6]),bobina:"",bobinaEntrada,bulto,buenos,paquetes,inicio,termino,desperdicio,motivo,minutos})
  }
  if(!filas.length)throw new Error("La plantilla de confección está vacía")
  const parte:ParteExtrusionDatos={version:1,hoja:nombre,cliente:texto(celda(2,1)),producto:texto(celda(2,6)),ot:texto(celda(2,13)),pedido:numero(celda(2,8),"Cantidad pedida"),maquina:texto(celda(2,10)),ficha,filas,avisos:[]}
  if(!parte.cliente||!parte.producto||!parte.ot||!parte.pedido)throw new Error("Completa cliente, producto, cantidad y número de OT")
  const m=metricasExtrusion(filas,parte.pedido)
  if(m.sinFecha)parte.avisos.push(`${m.sinFecha} filas sin fecha: no se asignan a un periodo ni se toma la fecha de importación como producción`)
  if(filas.some(f=>!f.operador))parte.avisos.push("Falta el operador en parte del detalle")
  if(filas.some(f=>!f.turno))parte.avisos.push("Falta el turno en parte del detalle")
  if(!m.entradaCompleta)parte.avisos.push("Faltan kilos de entrada: no se puede calcular balance, rendimiento ni porcentaje de desperdicio. El total cero del Excel no reemplaza los datos faltantes.")
  else if(Math.abs(m.diferencia??0)>.02)parte.avisos.push(`Balance por conciliar: ${m.diferencia!.toFixed(2)} kg. No se considera merma automáticamente.`)
  if(!m.paquetesCompletos)parte.avisos.push("La cantidad de paquetes no está informada en todas las filas")
  if(filas.some(f=>f.buenos>0&&!f.bulto))parte.avisos.push("Hay producto terminado sin número de bulto")
  if(!parte.maquina)parte.avisos.push("La máquina no está indicada en la ficha")
  if(filas.some(f=>f.motivo&&f.minutos===null))parte.avisos.push("Hay interrupciones sin duración")
  if(m.avance>=100)parte.avisos.push("Se alcanzó el pedido; revisar el cierre de la OT")
  for(const [col,total,label] of [[8,m.buenos,"peso"],[11,m.desperdicio,"desperdicio"],[7,m.bultos,"bultos"]] as const)if(!vacio(celda(10,col))&&Math.abs(numero(celda(10,col),"Total")-total)>.02)parte.avisos.push(`El total declarado de ${label} no coincide con las filas; se usa la suma del detalle`)
  return parte
}
