import { describe, expect, it } from "vitest"
import { destinatarios, textoMovimiento, textoStockBajo } from "./avisos-texto"

describe("textoMovimiento", () => {
  it("salida con OT y motivo", () => {
    const t = textoMovimiento({
      tipo: "SALIDA", material: "Reciclado cristal", unidad: "kg", cantidad: 1250.5,
      quien: "Juan Pérez", turno: "MANANA", motivo: " Producción ", orden: "OT #12",
    })
    expect(t.titulo).toBe("Salida de 1.250,50 kg de Reciclado cristal")
    expect(t.detalle).toBe("Juan Pérez · turno mañana · OT #12 · Motivo: Producción")
  })

  it("ajuste negativo y positivo llevan su signo", () => {
    const base = { tipo: "AJUSTE" as const, material: "Tinta roja", unidad: "kg", quien: "Ana", turno: "NOCHE" as const, motivo: "Conteo" }
    expect(textoMovimiento({ ...base, cantidad: -3 }).titulo).toBe("Ajuste −3,00 kg en Tinta roja")
    expect(textoMovimiento({ ...base, cantidad: 2.5 }).titulo).toBe("Ajuste +2,50 kg en Tinta roja")
  })

  it("otra unidad", () => {
    const t = textoMovimiento({ tipo: "SALIDA", material: "Solvente", unidad: "litros", cantidad: 4, quien: "Ana", turno: "TARDE", motivo: "x" })
    expect(t.titulo).toBe("Salida de 4,00 litros de Solvente")
  })
})

describe("textoStockBajo", () => {
  const m = { material: "Virgen", unidad: "kg", minimo: 100 }
  it("avisa al cruzar el mínimo", () => {
    expect(textoStockBajo({ ...m, antes: 150, despues: 80 })?.titulo).toBe("Virgen quedó bajo el mínimo")
    expect(textoStockBajo({ ...m, antes: 100, despues: 99.99 })).not.toBeNull()
  })
  it("no repite si ya estaba bajo, ni si queda justo en el mínimo", () => {
    expect(textoStockBajo({ ...m, antes: 90, despues: 50 })).toBeNull()
    expect(textoStockBajo({ ...m, antes: 150, despues: 100 })).toBeNull()
  })
  it("sin mínimo configurado no avisa", () => {
    expect(textoStockBajo({ ...m, minimo: 0, antes: 10, despues: 0 })).toBeNull()
  })
})

describe("destinatarios", () => {
  it("almacén y gerencia activos, sin el autor", () => {
    const us = [
      { id: "a", rol: "ALMACEN", activo: true },
      { id: "b", rol: "GERENCIA", activo: true },
      { id: "c", rol: "GERENCIA", activo: false },
      { id: "d", rol: "ADMIN", activo: true },
      { id: "e", rol: "OPERADOR", activo: true },
    ]
    expect(destinatarios(us, "a").map((u) => u.id)).toEqual(["b"])
  })
})

import { textoRechazo } from "./avisos-texto"
describe("textoRechazo", () => {
  it("con material y lote", () => {
    const t = textoRechazo({ kg: 25, proveedor: "Recicla Sur", lote: "L-7", material: "Molido cristal", motivo: "Húmedo", quien: "Pedro", turno: "NOCHE", orden: "OT #4" })
    expect(t.titulo).toBe("Rechazo de 25,00 kg de Recicla Sur (Molido cristal, lote L-7)")
    expect(t.detalle).toBe("Húmedo · OT #4 · Pedro · turno noche")
  })
  it("escrito a mano, sin lote", () => {
    expect(textoRechazo({ kg: 3, proveedor: "Don Juan", motivo: "Otro", quien: "P", turno: "TARDE", orden: "OT #1" }).titulo).toBe("Rechazo de 3,00 kg de Don Juan")
  })
})
