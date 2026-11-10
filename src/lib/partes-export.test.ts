import { beforeEach,describe,expect,it,vi } from "vitest"
import { NextRequest,NextResponse } from "next/server"
import * as XLSX from "xlsx"
const mocks=vi.hoisted(()=>({rol:vi.fn(),consultar:vi.fn()}))
vi.mock("@/lib/export-xlsx",()=>({exigirRolReportes:mocks.rol}))
vi.mock("@/lib/extrusion-db",()=>({consultarExtrusion:mocks.consultar}))
import { exportarPartes } from "./partes-export"

beforeEach(()=>{
  vi.clearAllMocks();mocks.rol.mockResolvedValue(null)
  mocks.consultar.mockResolvedValue([{ordenId:"ot-7",archivo:"ejemplo.xlsx",hoja:"OT-CONF 7",datos:{ot:"7",cliente:"Cliente",producto:"Bolsa",pedido:600,maquina:"",ficha:{"Tipo de soldadura":"FONDO"},filas:[{fila:12,fecha:"",operador:"",turno:"",material:"",entrada:0,entradaInformada:false,bobina:"",bulto:"1",paquetes:null,buenos:317,desperdicio:9.8,motivo:"",minutos:null}]}}])
})
describe("reporte de confección",()=>{
  it("exporta pesos confirmados y marca entrada y rendimiento como desconocidos",async()=>{
    const r=await exportarPartes(new NextRequest("https://example.com/api/export/confeccion"),"CONFECCION")
    const wb=XLSX.read(await r.arrayBuffer(),{type:"array"})
    const resumen=XLSX.utils.sheet_to_json<{Indicador:string;Valor:string|number}>(wb.Sheets.Resumen)
    expect(resumen.find(f=>f.Indicador==="Producto confeccionado kg")?.Valor).toBe(317)
    expect(resumen.find(f=>f.Indicador==="Material utilizado kg")?.Valor).toBe("Datos incompletos")
    expect(resumen.find(f=>f.Indicador==="Rendimiento aparente %")?.Valor).toBe("Sin dato")
    const filas=XLSX.utils.sheet_to_json(wb.Sheets.Detalle)
    expect(filas[0]).toMatchObject({Fecha:"Sin fecha",Bulto:"1",Paquetes:"Sin dato","Material kg":"Sin dato"})
    expect(mocks.consultar).toHaveBeenCalledWith(undefined,"CONFECCION")
  })
  it("no coloca filas sin fecha en un periodo histórico",async()=>{
    const r=await exportarPartes(new NextRequest("https://example.com/api/export/confeccion?hasta=2026-12-31"),"CONFECCION")
    const wb=XLSX.read(await r.arrayBuffer(),{type:"array"})
    expect(XLSX.utils.sheet_to_json(wb.Sheets.Detalle)).toHaveLength(0)
  })
  it("exige permisos antes de consultar los datos",async()=>{
    mocks.rol.mockResolvedValue(new NextResponse("Sin permisos",{status:403}))
    const r=await exportarPartes(new NextRequest("https://example.com/api/export/confeccion"),"CONFECCION")
    expect(r.status).toBe(403);expect(mocks.consultar).not.toHaveBeenCalled()
  })
})
