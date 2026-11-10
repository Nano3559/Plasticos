import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  sesion: vi.fn(), analizar: vi.fn(), findOrden: vi.fn(), findParte: vi.fn(),
  findActual: vi.fn(), findVersion: vi.fn(), crearParte: vi.fn(), crearAvisos: vi.fn(),
  usuarios: vi.fn(), lock: vi.fn(), vigente: vi.fn(), revalidate: vi.fn(),
}))
vi.mock("@/lib/session", () => ({ getSessionUser: mocks.sesion }))
vi.mock("@/lib/extrusion", () => ({ analizarExtrusion: mocks.analizar, metricasExtrusion: () => ({ buenos: 1008 }) }))
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }))
vi.mock("@/lib/prisma", () => ({ prisma: {
  ordenTrabajo: { findUnique: mocks.findOrden },
  parteExtrusion: { findFirst: mocks.findParte },
  $transaction: async (fn: (tx: unknown) => Promise<unknown>) => fn({
    $executeRaw: mocks.lock,
    parteExtrusion: { findFirst: mocks.findActual, findUnique: mocks.findVersion, create: mocks.crearParte },
    ordenTrabajo: { findUnique: mocks.vigente },
    user: { findMany: mocks.usuarios }, notificacion: { createMany: mocks.crearAvisos },
  }),
} }))
import { importarExtrusion } from "./extrusion"

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
  mocks.analizar.mockReturnValue({ version: 1, hoja: "OT 1", ot: "1", cliente: "VARIOS", producto: "BOBINAS", pedido: 1000, filas: [], avisos: ["Balance por conciliar: 588 kg"] })
  mocks.findParte.mockResolvedValue(null)
  mocks.findActual.mockResolvedValue(null)
  mocks.findVersion.mockResolvedValue(null)
  mocks.vigente.mockResolvedValue({ estado: "ABIERTA" })
  mocks.usuarios.mockResolvedValue([{ id: "gerencia" }])
})
describe("importación de extrusión: permisos y versiones", () => {
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
