/**
 * Prueba de integración contra PostgreSQL real. Solo corre si defines TEST_DATABASE_URL:
 *   TEST_DATABASE_URL=postgresql://planta:planta@localhost:5432/planta npm test
 * ¡Vacía las tablas Cliente, OrdenTrabajo, Entrega y Pago! Usa una base de pruebas.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest"
import * as XLSX from "xlsx"

const URL_DB = process.env.TEST_DATABASE_URL
type Fila = (string | number | null)[]

const ENCABEZADO: Fila = [
  "FECHA INGRESO", "N° ORDEN DE TRABAJO", "CANTIDAD S/G OT", "PRODUCTO", "MEDIDA", "NOTA DE REMISION",
  "FECHA ENTREGA", "KG ENTREGADOS", "BULTOS", "PRECIO UNITARIO", "TOTAL CREDITO", "PAGO A CUENTA", "SALDO", "OBSERVACIONES",
]
const entrega = (fecha: string, ot: string, kg: number, precio: number, pedidos: number, nr?: string): Fila =>
  [fecha, ot, pedidos, "Bolsa camiseta", "40x60", nr ?? null, fecha, kg, null, precio, kg * precio, null, null, null]
const pago = (fecha: string, detalle: string, monto: number): Fila =>
  [fecha, detalle, null, null, null, null, null, null, null, null, null, monto, null, null]

function archivo(nombre: string, cliente: string, filas: Fila[]): File {
  const ws = XLSX.utils.aoa_to_sheet([["CLIENTE:", cliente], [], ENCABEZADO, ...filas])
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, "Kardex")
  const bytes = new Uint8Array(XLSX.write(wb, { type: "array", bookType: "xlsx" }))
  return new File([bytes], nombre)
}

const BASE: Fila[] = [
  entrega("10/02/2026", "1001", 300, 12, 500, "55"),
  entrega("20/02/2026", "1001", 200, 12, 500, "56"),
  entrega("01/03/2026", "1002", 100, 14, 400),
  pago("05/03/2026", "Pago en efectivo", 2000),
  pago("10/03/2026", "Pago QR", 1000),
]
// Cargo: 3600 + 2400 + 1400 = 7400 · Abonos: 3000 · Saldo: 4400

describe.skipIf(!URL_DB)("importación de kardex contra PostgreSQL", () => {
  let prisma: typeof import("@/lib/prisma").prisma
  let procesarArchivo: typeof import("@/lib/kardex-import").procesarArchivo
  let clientes: Map<string, import("@/lib/kardex-import").ClienteMin>

  beforeAll(async () => {
    process.env.DATABASE_URL = URL_DB
    prisma = (await import("@/lib/prisma")).prisma
    procesarArchivo = (await import("@/lib/kardex-import")).procesarArchivo
  })
  afterAll(async () => {
    await prisma?.$disconnect()
  })
  beforeEach(async () => {
    await prisma.$executeRawUnsafe('TRUNCATE "Pago", "Entrega", "OrdenTrabajo", "Cliente" CASCADE')
    clientes = new Map()
  })

  const contar = async () => ({
    clientes: await prisma.cliente.count(),
    ordenes: await prisma.ordenTrabajo.count(),
    entregas: await prisma.entrega.count(),
    pagos: await prisma.pago.count(),
  })

  it("analizar no guarda nada", async () => {
    const r = await procesarArchivo(archivo("k.xlsx", "Gabriela Quispe", BASE), clientes, false, false)
    expect(r.estado).toBe("listo")
    expect(r.clienteNuevo).toBe(true)
    expect([r.entregas, r.pagos, r.saldoCalculado]).toEqual([3, 2, 4400])
    expect(await contar()).toEqual({ clientes: 0, ordenes: 0, entregas: 0, pagos: 0 })
  })

  it("importa agrupando por OT, con el saldo correcto y estados deducidos", async () => {
    const r = await procesarArchivo(archivo("k.xlsx", "Gabriela Quispe", BASE), clientes, true, false)
    expect(r.estado).toBe("importado")
    expect([r.entregas, r.pagos, r.saldoSistema]).toEqual([3, 2, 4400])
    expect(await contar()).toEqual({ clientes: 1, ordenes: 2, entregas: 3, pagos: 2 })

    const ots = await prisma.ordenTrabajo.findMany({ orderBy: { refExterna: "asc" } })
    expect(ots.map((o) => [o.refExterna, o.estado, Number(o.kgPedidos)])).toEqual([
      ["1001", "ENTREGADA", 500],
      ["1002", "TERMINADA", 400],
    ])
    const c = await prisma.cliente.findFirstOrThrow()
    expect(c.nombre).toBe("Gabriela Quispe")
  })

  it("reimportar el mismo archivo no duplica nada", async () => {
    await procesarArchivo(archivo("k.xlsx", "Gabriela Quispe", BASE), clientes, true, false)
    const antes = await contar()
    const r = await procesarArchivo(archivo("k.xlsx", "Gabriela Quispe", BASE), clientes, true, false)
    expect(r.estado).toBe("sin-cambios")
    expect(r.duplicadas).toBe(5)
    expect(await contar()).toEqual(antes)
  })

  it("un archivo ampliado solo agrega lo nuevo y actualiza el saldo", async () => {
    await procesarArchivo(archivo("k.xlsx", "Gabriela Quispe", BASE), clientes, true, false)
    const ampliado = [...BASE, pago("20/03/2026", "Pago transferencia", 400), entrega("25/03/2026", "1002", 300, 14, 400)]
    const r = await procesarArchivo(archivo("k2.xlsx", "Gabriela Quispe", ampliado), clientes, true, false)
    expect([r.entregas, r.pagos, r.duplicadas]).toEqual([1, 1, 5])
    // 4400 − 400 (pago) + 4200 (300 kg × 14) = 8200
    expect(r.saldoSistema).toBe(8200)
    expect(await contar()).toEqual({ clientes: 1, ordenes: 2, entregas: 4, pagos: 3 })
    // La OT 1002 ya recibió los 400 kg pedidos: pasa a ENTREGADA
    const ot = await prisma.ordenTrabajo.findFirstOrThrow({ where: { refExterna: "1002" } })
    expect(ot.estado).toBe("ENTREGADA")
  })

  it("reconoce al mismo cliente sin importar mayúsculas ni tildes", async () => {
    await procesarArchivo(archivo("a.xlsx", "José Pérez", BASE), clientes, true, false)
    const r = await procesarArchivo(archivo("b.xlsx", "JOSE PEREZ", [pago("01/04/2026", "Pago", 100)]), clientes, true, false)
    expect(r.clienteNuevo).toBe(false)
    expect((await contar()).clientes).toBe(1)
  })

  it("un archivo con filas con error no se importa, salvo que se permita parcial", async () => {
    const malo = [...BASE, entrega("fecha rara", "1003", 10, 10, 10)]
    const r1 = await procesarArchivo(archivo("m.xlsx", "Ana", malo), clientes, true, false)
    expect(r1.estado).toBe("revision")
    expect(r1.errores).toHaveLength(1)
    expect(await contar()).toEqual({ clientes: 0, ordenes: 0, entregas: 0, pagos: 0 })

    const r2 = await procesarArchivo(archivo("m.xlsx", "Ana", malo), clientes, true, true)
    expect(r2.estado).toBe("importado")
    expect((await contar()).entregas).toBe(3)
  })

  it("un archivo que no es Excel devuelve un error legible y no rompe", async () => {
    const r = await procesarArchivo(new File([new Uint8Array([1, 2, 3])], "roto.xlsx"), clientes, true, false)
    expect(["error", "revision"]).toContain(r.estado)
    expect(r.mensaje ?? r.errores[0]?.mensaje).toBeTruthy()
    expect(await contar()).toEqual({ clientes: 0, ordenes: 0, entregas: 0, pagos: 0 })
  })

  it("rechaza archivos que no son Excel por su extensión", async () => {
    const r = await procesarArchivo(new File(["a,b"], "datos.csv"), clientes, true, false)
    expect(r.estado).toBe("error")
    expect(r.mensaje).toMatch(/Formato no soportado/)
  })
})
