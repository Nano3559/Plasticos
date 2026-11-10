import { describe, it, expect } from "vitest"
import * as XLSX from "xlsx"
import { analizarExtrusion, agruparExtrusion, filtrarExtrusion, leerFiltrosExtrusion, metricasExtrusion } from "./extrusion"

function libro(cambiar?:(rows:unknown[][])=>void, date1904=false) {
  const rows:unknown[][]=Array.from({length:22},()=>Array(14).fill(null))
  rows[0][0]="ORDEN DE TRABAJO SECCION DE EXTRUCCION"
  rows[2]=["CLIENTE:","VARIOS",null,"PRODUCTO:","BOBINAS PARA AGUA",null,"CANTIDAD:",1000,"MAQUINA:",2,null,"OT Nº",1]
  rows[9][5]="KILOS";rows[9][10]="DESPERDICIO"
  rows[10][5]=1632;rows[10][8]=1008;rows[10][10]=36
  rows[17]=[46030,"GONZALO","3ª","BAJA",null,1300,null,1,500,null,20,"Limpieza",null,null]
  rows[18]=[null,null,null,"LINEAL",null,224,null,2,508,null,16,"Centrado",null,"01:30"]
  rows[19]=[null,null,null,"FLEXUS",null,108,null,null,null,null,null,null,null,null]
  cambiar?.(rows)
  const wb=XLSX.utils.book_new()
  wb.Workbook={WBProps:{date1904}}
  XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(rows),"OT 1")
  XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(rows.slice(0,17)),"Plantilla (2)")
  return new Uint8Array(XLSX.write(wb,{type:"array",bookType:"xlsx"}))
}
describe("partes de extrusión",()=>{
  it("reconcilia los pesos sin convertir diferencias en desperdicio",()=>{
    const p=analizarExtrusion(libro()),m=metricasExtrusion(p.filas,p.pedido)
    expect(m).toMatchObject({entrada:1632,buenos:1008,desperdicio:36,diferencia:588,bobinas:2,minutos:90})
    expect(m.avance).toBeCloseTo(100.8)
    expect(p.avisos.some(a=>a.includes("588.00"))).toBe(true)
    expect(p.avisos.some(a=>a.includes("alcanzó"))).toBe(true)
  })
  it("hereda fecha, turno y operador en filas de continuación",()=>{
    const p=analizarExtrusion(libro())
    expect(p.filas[1]).toMatchObject({fecha:"2026-01-08",operador:"GONZALO",turno:"3ª"})
    expect(agruparExtrusion(p.filas,"operador")[0]).toMatchObject({nombre:"GONZALO",buenos:1008})
  })
  it("rechaza plantilla vacía",()=>expect(()=>analizarExtrusion(libro(),"Plantilla (2)")).toThrow("vacía"))
  it("rechaza bobinas duplicadas",()=>expect(()=>analizarExtrusion(libro(r=>{r[18][7]=1}))).toThrow("duplicada"))
  it("rechaza kilos negativos",()=>expect(()=>analizarExtrusion(libro(r=>{r[17][5]=-5}))).toThrow("negativo"))
  it("no hereda operador de otra fecha si falta al iniciar el turno",()=>expect(()=>analizarExtrusion(libro(r=>{r[18][0]=46031}))).toThrow("faltan"))
  it("rechaza fecha inválida",()=>expect(()=>analizarExtrusion(libro(r=>{r[17][0]="31/02/2026"}))).toThrow("Fecha inválida"))
  it("lee separadores bolivianos",()=>expect(analizarExtrusion(libro(r=>{r[17][5]="1.300,00"})).filas[0].entrada).toBe(1300))
  it("advierte cuando el total de Excel difiere del detalle",()=>expect(analizarExtrusion(libro(r=>{r[10][5]=1})).avisos.some(a=>a.includes("no coincide"))).toBe(true))
  it("no supone minutos para números enteros sin unidad",()=>expect(()=>analizarExtrusion(libro(r=>{r[17][13]=30}))).toThrow("hh:mm"))
  it("lee duraciones numéricas de Excel",()=>expect(analizarExtrusion(libro(r=>{r[17][13]=0.5})).filas[0].minutos).toBe(720))
  it("respeta calendario Excel 1904",()=>{
    const a=analizarExtrusion(libro()).filas[0].fecha,b=analizarExtrusion(libro(undefined,true)).filas[0].fecha
    expect((Date.parse(b)-Date.parse(a))/86400000).toBe(1462)
  })
  it("no divide por cero con registros vacíos",()=>expect(metricasExtrusion([])).toMatchObject({rendimiento:0,mermaPct:0,avance:0,pesoMedio:0}))
  it("filtra fecha, máquina, turno y operador sin cambiar totales de la fuente",()=>{
    const p=analizarExtrusion(libro())
    const filas=p.filas.map(f=>({...f,maquina:"2"}))
    expect(filtrarExtrusion(filas,{desde:"2026-01-09"})).toHaveLength(0)
    expect(filtrarExtrusion(filas,{maquina:"3"})).toHaveLength(0)
    expect(filtrarExtrusion(filas,{hasta:"2026-01-08",maquina:"2",turno:"3ª",operador:"GONZALO"})).toHaveLength(3)
    expect(metricasExtrusion(p.filas).entrada).toBe(1632)
  })
  it("valida fechas y orden del periodo en los reportes",()=>{
    expect(()=>leerFiltrosExtrusion({desde:"2026-02-31"})).toThrow("fechas válidas")
    expect(()=>leerFiltrosExtrusion({desde:"2026-02-01",hasta:"2026-01-01"})).toThrow("anterior")
    expect(leerFiltrosExtrusion({desde:["2026-01-01","2026-02-01"]})).toEqual({})
  })
  it("normaliza turnos equivalentes para agruparlos",()=>expect(analizarExtrusion(libro(r=>{r[17][2]="NOCHE"})).filas[0].turno).toBe("3ª"))
  it("rechaza errores de Excel en vez de convertirlos en kilos",()=>{
    const wb=XLSX.read(libro(),{type:"array"})
    wb.Sheets["OT 1"].F18={t:"e",v:7}
    expect(()=>analizarExtrusion(new Uint8Array(XLSX.write(wb,{type:"array",bookType:"xlsx"})))).toThrow("F18")
  })
})
