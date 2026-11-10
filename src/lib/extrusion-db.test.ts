import { beforeEach,describe,expect,it,vi } from "vitest"
const mocks=vi.hoisted(()=>({findMany:vi.fn()}))
vi.mock("@/lib/prisma",()=>({prisma:{parteExtrusion:{findMany:mocks.findMany}}}))
import { consultarExtrusion,historialExtrusion } from "./extrusion-db"

beforeEach(()=>{mocks.findMany.mockReset();mocks.findMany.mockResolvedValue([])})
describe("aislamiento de partes por sección",()=>{
  it("extrusión solo consulta versiones de extrusión por defecto",async()=>{
    await consultarExtrusion("ot-7")
    expect(mocks.findMany).toHaveBeenCalledWith(expect.objectContaining({where:{area:"EXTRUSION",ordenId:"ot-7"}}))
  })
  it("impresión filtra por área y solo usa la última versión por OT",async()=>{
    mocks.findMany.mockResolvedValue([{id:"nueva",ordenId:"ot-7",datos:{}},{id:"anterior",ordenId:"ot-7",datos:{}}])
    const datos=await consultarExtrusion(undefined,"IMPRESION")
    expect(mocks.findMany).toHaveBeenCalledWith(expect.objectContaining({where:{area:"IMPRESION"}}))
    expect(datos.map(d=>d.id)).toEqual(["nueva"])
  })
  it("el historial de impresión no mezcla importaciones de extrusión",async()=>{
    await historialExtrusion("ot-7","IMPRESION")
    expect(mocks.findMany).toHaveBeenCalledWith(expect.objectContaining({where:{area:"IMPRESION",ordenId:"ot-7"}}))
  })
})
