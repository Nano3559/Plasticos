import { describe, expect, it } from "vitest"
import { claveTemporal, problemaDeClave, trasIntentoFallido, MAX_INTENTOS } from "./claves"

describe("problemaDeClave", () => {
  it("exige 8 caracteres y rechaza claves comunes", () => {
    expect(problemaDeClave("123456")).toMatch(/al menos 8/)
    expect(problemaDeClave("12345678")).toMatch(/común/)
    expect(problemaDeClave("11111111")).toMatch(/común/)
    expect(problemaDeClave("Planta123")).toMatch(/común/)
  })
  it("no deja usar el usuario ni el nombre", () => {
    expect(problemaDeClave("gerencia2026!", { email: "gerencia@planta.local" })).toMatch(/usuario/)
    expect(problemaDeClave("maria-del-2026", { nombre: "María Quispe" })).toBeNull() // tilde distinta: no coincide
    expect(problemaDeClave("carlos-2026-x", { nombre: "Carlos Aramayo" })).toMatch(/nombre/)
  })
  it("acepta una frase razonable", () => {
    expect(problemaDeClave("bobina-azul-73")).toBeNull()
  })
})

describe("claveTemporal y bloqueo", () => {
  it("la clave temporal cumple las reglas", () => {
    for (let i = 0; i < 50; i++) expect(problemaDeClave(claveTemporal())).toBeNull()
  })
  it("bloquea 15 minutos al llegar al máximo de intentos", () => {
    const ahora = new Date("2026-11-05T12:00:00Z")
    expect(trasIntentoFallido(0, ahora)).toEqual({ intentosFallidos: 1, bloqueadoHasta: null })
    const b = trasIntentoFallido(MAX_INTENTOS - 1, ahora)
    expect(b.intentosFallidos).toBe(0)
    expect(b.bloqueadoHasta?.toISOString()).toBe("2026-11-05T12:15:00.000Z")
  })
})
