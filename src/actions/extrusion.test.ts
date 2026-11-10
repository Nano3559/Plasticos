import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  sesion: vi.fn(), analizar: vi.fn(), findOrden: vi.fn(), findParte: vi.fn(),
  findActual: vi.fn(), findVersion: vi.fn(), crearParte: vi.fn(), crearAvisos: vi.fn(),
  usuarios: vi.fn(), lock: vi.fn(), vigente: vi.fn(), revalidate: vi.fn(),
  clientes:vi.fn(),crearCliente:vi.fn(),ordenes:vi.fn(),crearOrden:vi.fn(),
}))
vi.mock("@/lib/session", () => ({ getSessionUser: mocks.sesion }))
vi.mock("@/lib/extrusion", () => ({ analizarExtrusion: mocks.analizar, metricasExtrusion: () => ({ buenos: 1008 }) }))
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }))
vi.mock("@/lib/prisma", () => ({ prisma: {
  ordenTrabajo: { findUnique: mocks.findOrden,findMany:mocks.ordenes },
  cliente:{findMany:mocks.clientes},
  parteExtrusion: { findFirst: mocks.findParte },
  $transaction: async (fn: (tx: unknown) => Promise<unknown>) => fn({
    $executeRaw: mocks.lock,
    parteExtrusion: { findFirst: mocks.findActual, findUnique: mocks.findVersion, create: mocks.crearParte },
    ordenTrabajo: { findUnique: mocks.vigente,findMany:mocks.ordenes,create:mocks.crearOrden },
    cliente:{findMany:mocks.clientes,create:mocks.crearCliente},
    user: { findMany: mocks.usuarios }, notificacion: { createMany: mocks.crearAvisos },
  }),
} }))
import { importarExtrusion } from "./extrusion"
import { importarParteProduccion } from "@/lib/partes-import"

function formulario() {
  const f = new FormData()
  f.set("ordenId", "ot-1")
  f.set("archivo", new File([new Uint8Array([1, 2, 3])], "ejemplo.xlsx"))
  return f
}
beforeEach(() => {
  vi.clearAllMocks()
  mocks.sesion.mockResolvedValue({ id: "autor", name: "Ana", rol: "ADMIN", debeCambiarClave: false })
  mocks.findOrden.mockResolvedValue({ id: "ot-1", estado: "ABIERTA", numero: 1, refExterna: null, producto: "BOBINAS", kgPedidos: 1000, cliente: { nombre: "VARIOS" } })
  mocks.analizar.mockReturnValue({ version: 1, hoja: "OT 1", ot: "1", cliente: "VARIOS", producto: "BOBINAS", pedido: 1000, filas: [{fecha:"2026-01-08"}],ficha:{Tamaño:"35x80","Tipo de material":"BAJA - LINEAL"}, avisos: ["Balance por conciliar: 588 kg"] })
  mocks.findParte.mockResolvedValue(null)
  mocks.findActual.mockResolvedValue(null)
  mocks.findVersion.mockResolvedValue(null)
  mocks.vigente.mockResolvedValue({ estado: "ABIERTA" })
  mocks.usuarios.mockResolvedValue([{ id: "gerencia" }])
  mocks.clientes.mockResolvedValue([])
  mocks.ordenes.mockResolvedValue([])
  mocks.crearCliente.mockResolvedValue({id:"cliente-nuevo",nombre:"VARIOS"})
  mocks.crearOrden.mockResolvedValue({id:"ot-nueva",producto:"BOBINAS",kgPedidos:1000,estado:"ABIERTA"})
})
describe("importación de extrusión: permisos y versiones", () => {
  it("crea una OT de confección sin usar una fecha de producción inventada",async()=>{
    const datos=mocks.analizar();datos.filas=[{fecha:""}];mocks.analizar.mockReturnValue(datos)
    const f=formulario();f.delete("ordenId")
    const r=await importarParteProduccion(f,"CONFECCION",mocks.analizar)
    f.set("confirmar","si");f.set("huella",r.huella!);f.set("revision","");f.set("destino","nueva");f.set("precioUnitario","14,50")
    expect(await importarParteProduccion(f,"CONFECCION",mocks.analizar)).toHaveProperty("mensaje")
    const creada=mocks.crearOrden.mock.calls[0][0].data
    expect(creada).not.toHaveProperty("fechaIngreso")
    expect(mocks.crearParte).toHaveBeenCalledWith(expect.objectContaining({data:expect.objectContaining({area:"CONFECCION"})}))
    expect(mocks.crearAvisos).toHaveBeenCalledWith({data:[expect.objectContaining({tipo:"CONFECCION",href:"/produccion/confeccion?ot=ot-nueva"})]})
  })
  it("vincula impresión a la misma OT sin reemplazar el parte de extrusión",async()=>{
    const extruido={id:"extruido",huella:"huella-extrusion"}
    mocks.findParte.mockImplementation(async({where})=>where.area==="EXTRUSION"?extruido:null)
    mocks.findActual.mockImplementation(async({where})=>where.area==="EXTRUSION"?extruido:null)
    const f=formulario(),r=await importarParteProduccion(f,"IMPRESION",mocks.analizar)
    expect(r).toMatchObject({crearOrden:false,reemplaza:false,revision:""})
    f.set("confirmar","si");f.set("huella",r.huella!);f.set("revision","")
    expect(await importarParteProduccion(f,"IMPRESION",mocks.analizar)).toHaveProperty("mensaje")
    expect(mocks.crearParte).toHaveBeenCalledWith(expect.objectContaining({data:expect.objectContaining({area:"IMPRESION",ordenId:"ot-1"})}))
    expect(mocks.crearOrden).not.toHaveBeenCalled()
    expect(mocks.crearAvisos).toHaveBeenCalledWith({data:[expect.objectContaining({tipo:"IMPRESION",href:"/produccion/impresion?ot=ot-1"})]})
  })
  it("analiza sin cliente ni OT previa y no escribe nada",async()=>{
    const f=formulario();f.delete("ordenId")
    expect(await importarExtrusion(f)).toMatchObject({crearOrden:true,crearCliente:true,destino:"nueva"})
    expect(mocks.crearCliente).not.toHaveBeenCalled()
    expect(mocks.crearOrden).not.toHaveBeenCalled()
  })
  it("crea cliente, OT y parte desde el Excel con el precio confirmado",async()=>{
    const f=formulario();f.delete("ordenId")
    const r=await importarExtrusion(f)
    f.set("confirmar","si");f.set("huella",r.huella!);f.set("revision","");f.set("destino","nueva");f.set("precioUnitario","14,50")
    expect(await importarExtrusion(f)).toMatchObject({ordenId:"ot-nueva",mensaje:"OT creada desde el Excel y parte importado."})
    expect(mocks.crearCliente).toHaveBeenCalledWith({data:{nombre:"VARIOS"}})
    expect(mocks.crearOrden).toHaveBeenCalledWith(expect.objectContaining({data:expect.objectContaining({clienteId:"cliente-nuevo",producto:"BOBINAS",refExterna:"1",kgPedidos:1000,precioUnitario:14.5})}))
    expect(mocks.crearParte).toHaveBeenCalledWith(expect.objectContaining({data:expect.objectContaining({ordenId:"ot-nueva"})}))
  })
  it("no crea OT si falta el precio y no está en el Excel",async()=>{
    const f=formulario();f.delete("ordenId");const r=await importarExtrusion(f)
    f.set("confirmar","si");f.set("huella",r.huella!);f.set("destino","nueva")
    expect(await importarExtrusion(f)).toHaveProperty("error")
    expect(mocks.crearCliente).not.toHaveBeenCalled();expect(mocks.crearOrden).not.toHaveBeenCalled()
  })
  it("reutiliza cliente y OT existentes al importar automáticamente",async()=>{
    mocks.clientes.mockResolvedValue([{id:"cliente",nombre:"VARIOS"}])
    mocks.ordenes.mockResolvedValue([await mocks.findOrden()])
    const f=formulario();f.delete("ordenId");const r=await importarExtrusion(f)
    expect(r).toMatchObject({crearOrden:false,crearCliente:false,destino:"ot-1"})
    f.set("confirmar","si");f.set("huella",r.huella!);f.set("revision","");f.set("destino","ot-1")
    expect(await importarExtrusion(f)).toHaveProperty("mensaje")
    expect(mocks.crearCliente).not.toHaveBeenCalled();expect(mocks.crearOrden).not.toHaveBeenCalled()
  })
  it("rechaza clientes ambiguos sin crear registros",async()=>{
    const spy=vi.spyOn(console,"error").mockImplementation(()=>{})
    mocks.clientes.mockResolvedValue([{id:"a"},{id:"b"}]);const f=formulario();f.delete("ordenId")
    expect((await importarExtrusion(f)).error).toContain("varios clientes")
    expect(mocks.crearOrden).not.toHaveBeenCalled();spy.mockRestore()
  })
  it("deniega importación a operador antes de procesar el archivo", async () => {
    mocks.sesion.mockResolvedValue({ id: "u", rol: "OPERADOR" })
    expect(await importarExtrusion(formulario())).toHaveProperty("error")
    expect(mocks.analizar).not.toHaveBeenCalled()
  })
  it("analizar no guarda ni genera avisos", async () => {
    const r = await importarExtrusion(formulario())
    expect(r).toHaveProperty("huella")
    expect(mocks.crearParte).not.toHaveBeenCalled()
    expect(mocks.crearAvisos).not.toHaveBeenCalled()
  })
  it("rechaza una OT de cliente distinto", async () => {
    mocks.analizar.mockReturnValue({ ot: "1", cliente: "OTRO", producto: "BOBINAS", pedido: 1000 })
    expect((await importarExtrusion(formulario())).error).toContain("no coincide")
    expect(mocks.crearParte).not.toHaveBeenCalled()
  })
  it("confirma una versión y genera aviso con el balance dentro de la transacción", async () => {
    const r = await importarExtrusion(formulario()), f = formulario()
    f.set("confirmar", "si"); f.set("huella", r.huella!); f.set("revision", "")
    expect(await importarExtrusion(f)).toHaveProperty("mensaje")
    expect(mocks.crearParte).toHaveBeenCalledOnce()
    expect(mocks.crearAvisos).toHaveBeenCalledWith({ data: [expect.objectContaining({ userId: "gerencia", tipo: "EXTRUSION", detalle: expect.stringContaining("588") })] })
  })
  it("una repetición no duplica parte ni avisos", async () => {
    const r = await importarExtrusion(formulario()), f = formulario()
    mocks.findActual.mockResolvedValue({ id: "anterior", huella: r.huella })
    f.set("confirmar", "si"); f.set("huella", r.huella!); f.set("revision", "")
    expect((await importarExtrusion(f)).mensaje).toContain("ya está importado")
    expect(mocks.crearParte).not.toHaveBeenCalled()
    expect(mocks.crearAvisos).not.toHaveBeenCalled()
  })
  it("rechaza confirmaciones obsoletas tras una importación concurrente", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {})
    const r = await importarExtrusion(formulario()), f = formulario()
    mocks.findActual.mockResolvedValue({ id: "version-otra", huella: "otra" })
    f.set("confirmar", "si"); f.set("huella", r.huella!); f.set("revision", "")
    expect((await importarExtrusion(f)).error).toContain("Otro usuario")
    expect(mocks.crearParte).not.toHaveBeenCalled()
    spy.mockRestore()
  })
})
