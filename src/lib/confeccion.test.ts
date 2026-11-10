import { describe,expect,it } from "vitest"
import * as XLSX from "xlsx"
import { analizarConfeccion } from "./confeccion"
import { filtrarExtrusion,metricasExtrusion } from "./extrusion"

function libro(cambiar?:(rows:unknown[][])=>void) {
  const rows:unknown[][]=Array.from({length:21},()=>Array(15).fill(null))
  rows[0][0]="ORDEN DE TRABAJO SECCION CONFECCION"
  rows[2]=["CLIENTE:","HERNAN MERCADO",null,null,null,"PRODUCTO:","BOLSA PARA CEMENTO COLA MORTERO","CANTIDAD:",600,"MAQUINA:",null,null,"OT N°",7]
  rows[3]=["ANCHO:",35,"LARGO:",50,"MICRONAJE:",90,"TIPO DE SOLDADURA:",null,"FONDO",null,"CON IMPRESIÓN:","SI"]
  rows[4]=["TIPO DE MATERIAL:","RECICLADO",null,null,null,"COLOR FILM:","LECHOSO",null,"POR UNIDADES:",null,null,"POR PESO:","SI"]
  rows[9]=[null,null,null,null,null,"No BOBINA","KGR.","BULTO No","PESO (kg)","No. PQTS","ACUMULADO","DESP.","MOTIVO","TIEMPO"]
  rows[10]=["TOTALES",null,null,null,null,null,0,10,317,0,null,9.8]
  const pesos=[35.8,32.2,30.8,30,31.2,31.4,30.8,30.6,31,33.2]
  pesos.forEach((peso,i)=>{rows[11+i][7]=i+1;rows[11+i][8]=peso})
  rows[15][11]=3.6;rows[15][12]="imagen desplazada";rows[17][11]=6.2
  cambiar?.(rows)
  const wb=XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet([["ORDEN DE TRABAJO SECCION IMPRESIÓN"]]),"OT-IMP 7")
  XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(rows.slice(0,11)),"Plantilla CONFECCION")
  XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(rows),"OT-CONF 7")
  return new Uint8Array(XLSX.write(wb,{type:"array",bookType:"xlsx"}))
}
describe("partes de confección",()=>{
  it("lee bultos, paquetes, soldadura y pesos del formato de confección",()=>{
    const p=analizarConfeccion(libro()),m=metricasExtrusion(p.filas,p.pedido)
    expect(p).toMatchObject({hoja:"OT-CONF 7",ot:"7",pedido:600,cliente:"HERNAN MERCADO"})
    expect(p.ficha).toMatchObject({"Tipo de soldadura":"FONDO","Con impresión":"SI",Ancho:"35",Largo:"50","Por peso":"SI"})
    expect(m.buenos).toBeCloseTo(317);expect(m.desperdicio).toBeCloseTo(9.8)
    expect(m).toMatchObject({bultos:10,bobinas:0,entradaCompleta:false,diferencia:null,rendimiento:null,mermaPct:null,paquetesCompletos:false,sinFecha:10})
    expect(m.avance).toBeCloseTo(317/600*100)
  })
  it("no inventa fecha, operador, turno ni entrada",()=>{
    const p=analizarConfeccion(libro())
    expect(p.filas[0]).toMatchObject({fecha:"",operador:"",turno:"",entradaInformada:false,paquetes:null,bulto:"1",bobina:""})
    expect(p.avisos.some(a=>a.includes("sin fecha"))).toBe(true)
    expect(p.avisos.some(a=>a.includes("Faltan kilos"))).toBe(true)
  })
  it("excluye filas sin fecha al filtrar solo hasta o desde una fecha",()=>{
    const filas=analizarConfeccion(libro()).filas.map(f=>({...f,maquina:""}))
    expect(filtrarExtrusion(filas,{})).toHaveLength(10)
    expect(filtrarExtrusion(filas,{hasta:"2026-12-31"})).toHaveLength(0)
    expect(filtrarExtrusion(filas,{desde:"2026-01-01"})).toHaveLength(0)
  })
  it("calcula balance solo con todas las entradas informadas",()=>{
    const p=analizarConfeccion(libro(r=>{for(let i=11;i<21;i++)r[i][6]=Number(r[i][8])+Number(r[i][11]??0)}))
    expect(metricasExtrusion(p.filas).entradaCompleta).toBe(true)
    expect(metricasExtrusion(p.filas).diferencia).toBeCloseTo(0)
  })
  it("conserva tiempos, paquetes y bobina de origen",()=>{
    const p=analizarConfeccion(libro(r=>{r[11][0]="15/01/2026";r[11][1]="ANA";r[11][2]=1;r[11][3]=0.25;r[11][4]="14:00";r[11][5]="BOB-3";r[11][9]=4;r[11][13]="00:15"}))
    expect(p.filas[0]).toMatchObject({fecha:"2026-01-15",operador:"ANA",turno:"1ª",inicio:"06:00",termino:"14:00",bobinaEntrada:"BOB-3",paquetes:4,minutos:15})
    expect(p.filas[1].fecha).toBe("2026-01-15")
  })
  it("rechaza plantilla vacía y otra sección",()=>{
    expect(()=>analizarConfeccion(libro(),"Plantilla CONFECCION")).toThrow("vacía")
    expect(()=>analizarConfeccion(libro(),"OT-IMP 7")).toThrow("formato de confección")
  })
  it("rechaza bultos duplicados",()=>expect(()=>analizarConfeccion(libro(r=>{r[12][7]=1}))).toThrow("duplicado"))
  it("rechaza fecha inválida aun cuando permite fechas faltantes",()=>expect(()=>analizarConfeccion(libro(r=>{r[11][0]="31/02/2026"}))).toThrow("fecha inválida"))
  it("rechaza paquetes fraccionarios y pesos negativos",()=>{
    expect(()=>analizarConfeccion(libro(r=>{r[11][9]=1.5}))).toThrow("enteros")
    expect(()=>analizarConfeccion(libro(r=>{r[11][8]=-2}))).toThrow("negativo")
  })
})
