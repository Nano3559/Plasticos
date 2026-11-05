import { describe, expect, it } from "vitest"
import { leerNumero } from "./formato"

describe("leerNumero", () => {
  it.each([
    ["1.250,50", 1250.5],
    ["1250,50", 1250.5],
    ["1250.50", 1250.5],
    ["1250.5", 1250.5],
    ["1.250", 1250],
    ["1.250.000", 1250000],
    ["Bs 3 500", 3500],
    ["0,30", 0.3],
    [",5", 0.5],
  ])("%s → %d", (texto, esperado) => expect(leerNumero(texto)).toBe(esperado))

  it.each(["", "abc", "12,3,4", "1.2.3,4,5"])("%s no es número", (texto) => expect(leerNumero(texto)).toBeNaN())
})

import { numeroParaEnviar } from "./formato"
describe("leerNumero con más decimales (precios)", () => {
  it("con 4 decimales, un punto con 3 cifras es decimal", () => {
    expect(leerNumero("14.375", 4)).toBe(14.375)
    expect(leerNumero("14,375", 4)).toBe(14.375)
    expect(leerNumero("1.250,5", 4)).toBe(1250.5)
  })
  it("con 2 decimales (kg, Bs), el mismo texto son miles", () => {
    expect(leerNumero("14.375")).toBe(14375)
  })
  it("acepta 'kg' escrito", () => {
    expect(leerNumero("25 kg")).toBe(25)
  })
  it("negativos para ajustes", () => {
    expect(leerNumero("-12,5")).toBe(-12.5)
  })
})

describe("numeroParaEnviar", () => {
  it("redondea a los decimales del campo y usa punto", () => {
    expect(numeroParaEnviar("1.250,505")).toBe("1250.51")
    expect(numeroParaEnviar("14.375", 4)).toBe("14.375")
    expect(numeroParaEnviar("abc")).toBe("")
  })
  it("ida y vuelta: lo enviado se vuelve a leer igual con los mismos decimales", () => {
    for (const [t, d] of [["1.250,50", 2], ["0,05", 2], ["14.3755", 4], ["99.999,99", 2]] as const) {
      const enviado = numeroParaEnviar(t, d)
      expect(leerNumero(enviado, d)).toBe(Number(enviado))
    }
  })
})

import { formatPrecio } from "./formato"
describe("formatPrecio", () => {
  it("muestra los decimales que tiene, entre 2 y 4", () => {
    expect(formatPrecio("14.3750").replace(/\s/g, " ")).toMatch(/14,375$/)
    expect(formatPrecio(12).replace(/\s/g, " ")).toMatch(/12,00$/)
    expect(formatPrecio(9.87654)).toMatch(/9,8765$/)
  })
})
