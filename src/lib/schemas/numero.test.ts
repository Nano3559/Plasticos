import { describe, expect, it } from "vitest"
import { entregaSchema, pagoSchema } from "./cobranzas"
import { ordenTrabajoSchema, registroProduccionSchema } from "./produccion"
import { ajusteSchema, entradaSchema } from "./inventario"
import { gastoSchema } from "./gastos"

const err = (r: { success: boolean; error?: { issues: { message: string }[] } }) => (r.success ? null : r.error!.issues[0].message)

describe("números en todos los formularios", () => {
  it("pago: 1.250,50 son mil doscientos cincuenta", () => {
    const r = pagoSchema.parse({ clienteId: "c", monto: "1.250,50", medio: "QR" })
    expect(r.monto).toBe(1250.5)
  })
  it("pago: '1.250' son mil doscientos cincuenta, no 1,25", () => {
    expect(pagoSchema.parse({ clienteId: "c", monto: "1.250", medio: "QR" }).monto).toBe(1250)
  })
  it("entrega: bultos vacío queda sin valor", () => {
    const r = entregaSchema.parse({ ordenId: "o", kgEntregados: "320,5", bultos: "" })
    expect(r.kgEntregados).toBe(320.5)
    expect(r.bultos).toBeUndefined()
  })
  it("orden: precio por kg con 3 decimales", () => {
    const r = ordenTrabajoSchema.parse({ clienteId: "c", producto: "p", kgPedidos: "2.000", precioUnitario: "14.375" })
    expect(r.kgPedidos).toBe(2000)
    expect(r.precioUnitario).toBe(14.375)
  })
  it("producción: merma y rechazo vacíos cuentan como 0 y la balanza cuadra", () => {
    const r = registroProduccionSchema.parse({ ordenId: "o", area: "IMPRESION", turno: "TARDE", kgEntrada: "1.000", kgBuenos: "1.000", kgMerma: "", kgRechazado: "" })
    expect([r.kgEntrada, r.kgMerma, r.kgRechazado]).toEqual([1000, 0, 0])
  })
  it("entrada: costo unitario con 4 decimales", () => {
    expect(entradaSchema.parse({ materialId: "m", cantidad: "500", turno: "MANANA", costoUnitario: "9,8765" }).costoUnitario).toBe(9.8765)
  })
  it("ajuste negativo", () => {
    expect(ajusteSchema.parse({ materialId: "m", cantidad: "-12,5", turno: "NOCHE", motivo: "Conteo" }).cantidad).toBe(-12.5)
  })
  it("mensajes en español", () => {
    expect(err(pagoSchema.safeParse({ clienteId: "c", monto: "abc", medio: "QR" }))).toBe("Escribe solo números, por ejemplo 1.250,50")
    expect(err(pagoSchema.safeParse({ clienteId: "c", monto: "", medio: "QR" }))).toBe("Escribe el monto")
    expect(err(gastoSchema.safeParse({ fecha: "2026-11-01", categoria: "x", monto: "0" }))).toBe("El monto debe ser mayor a 0")
  })
})
