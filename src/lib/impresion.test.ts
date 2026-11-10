import { describe,expect,it } from "vitest"
import * as XLSX from "xlsx"
import { analizarImpresion } from "./impresion"
import { analizarExtrusion,metricasExtrusion } from "./extrusion"

function libro(cambiar?:(rows:unknown[][])=>void) {
  const rows:unknown[][]=Array.from({length:17},()=>Array(17).fill(null))
  rows[0][0]="ORDEN DE TRABAJO SECCION IMPRESIÓN"
  rows[2]=["CLIENTE:","HERNAN MERCADO",null,null,"PRODUCTO:","BOLSA PARA CEMENTO COLA MORTERO",null,null,null,"CANTIDAD:",600,"MAQUINA:",null,"OT Nº",7]
  rows[3]=["RODILLO:",50,"ANCHO:",35,"LARGO:",50,"MICRONAJE:",90,"FILM:",null,"TUBULAR:","SI","TRATADO:",null]
  rows[4]=["TIPO DE MATERIAL:","TERMO - STRECH RECICLADO",null,null,"COLOR FILM:","LECHOSO","DESTINO:","CONFECCION","TAMAÑO:","35 X 50 X 90","COLORES:",null,"CARAS:",2]
  rows[9]=[null,null,null,null,"PRODUCTO",null,"KILOS","TOT.UTILIZADO","No BOB","KILOS","ACUMULADO","DESPERDICIO","MOTIVO",null,"TIEMPO"]
  rows[10]=["TOTALES",null,null,null,null,null,339,null,6,330,null,0]
  const entradas=[60,38,51,60,74,56],salidas=[66.2,72,49.5,60.4,44.2,37.7]
  entradas.forEach((kg,i)=>{rows[11+i]=[i===0?46037:null,i===0?"EDMAR":null,null,i===0?3:null,null,null,kg,null,i+1,salidas[i]]})
  cambiar?.(rows)
  const wb=XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet([["ORDEN DE TRABAJO SECCION DE EXTRUCCION"]]),"OT 7")
  XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(rows.slice(0,11)),"Plantilla IMPRESION")
  XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(rows),"OT-IMP 7")
  return new Uint8Array(XLSX.write(wb,{type:"array",bookType:"xlsx"}))
}
describe("partes de impresión",()=>{
  it("detecta la hoja de impresión en un libro con varias secciones",()=>{
    const p=analizarImpresion(libro())
    expect(p).toMatchObject({hoja:"OT-IMP 7",cliente:"HERNAN MERCADO",ot:"7",pedido:600})
    expect(p.ficha).toMatchObject({Rodillo:"50",Ancho:"35",Largo:"50",Micronaje:"90",Destino:"CONFECCION",Caras:"2"})
    expect(metricasExtrusion(p.filas,p.pedido)).toMatchObject({entrada:339,buenos:330,bobinas:6,desperdicio:0,diferencia:9})
    expect(metricasExtrusion(p.filas,p.pedido).avance).toBeCloseTo(55)
    expect(p.filas[0]).toMatchObject({fila:12,fecha:"2026-01-15",turno:"3ª",operador:"EDMAR"})
  })
  it("conserva consumos sin producto como faltantes con aviso",()=>{
    const p=analizarImpresion(libro())
    expect(p.filas[0].material).toBe("")
    expect(p.avisos.some(a=>a.includes("sin producto de origen"))).toBe(true)
    expect(p.avisos.some(a=>a.includes("9.00"))).toBe(true)
    expect(p.avisos.some(a=>a.includes("máquina"))).toBe(true)
    expect(p.avisos.some(a=>a.includes("colores"))).toBe(true)
  })
  it("rechaza la plantilla vacía y hojas de otra sección",()=>{
    expect(()=>analizarImpresion(libro(),"Plantilla IMPRESION")).toThrow("vacía")
    expect(()=>analizarImpresion(libro(),"OT 7")).toThrow("formato de impresión")
    expect(()=>analizarExtrusion(libro(),"OT-IMP 7")).toThrow("formato de extrusión")
  })
  it("mantiene la fecha y operador en las filas siguientes",()=>{
    expect(analizarImpresion(libro()).filas[5]).toMatchObject({operador:"EDMAR",fecha:"2026-01-15",turno:"3ª",entrada:56,buenos:37.7})
  })
  it("rechaza bobinas repetidas",()=>expect(()=>analizarImpresion(libro(r=>{r[12][8]=1}))).toThrow("duplicada"))
  it("lee desperdicio e interrupciones en las columnas de impresión",()=>{
    const p=analizarImpresion(libro(r=>{r[11][11]=9;r[11][12]="Limpieza";r[11][14]="00:30"}))
    expect(p.filas[0]).toMatchObject({desperdicio:9,motivo:"Limpieza",minutos:30})
    expect(metricasExtrusion(p.filas).diferencia).toBe(0)
  })
})
