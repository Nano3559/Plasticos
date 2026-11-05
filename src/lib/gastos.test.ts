import { describe, expect, it } from "vitest"
import { claveMes, desplazarMes, leerMes, rangoMes, sumarGastos, totalesPorCategoria, totalesPorMes } from "./gastos"

const d = (s: string) => new Date(`${s}T00:00:00.000Z`)

describe("meses", () => {
  it("lee ?mes válido y rechaza basura", () => {
    expect(leerMes("2026-03", "2026-11")).toBe("2026-03")
    expect(leerMes("2026-13", "2026-11")).toBe("2026-11")
    expect(leerMes("x", "2026-11")).toBe("2026-11")
    expect(leerMes(undefined, "2026-11")).toBe("2026-11")
  })

  it("desplaza cruzando años", () => {
    expect(desplazarMes("2026-01", -1)).toBe("2025-12")
    expect(desplazarMes("2025-12", 1)).toBe("2026-01")
  })

  it("rango del mes es [1 del mes, 1 del siguiente)", () => {
    const { desde, hasta } = rangoMes("2026-12")
    expect(desde.toISOString()).toBe("2026-12-01T00:00:00.000Z")
    expect(hasta.toISOString()).toBe("2027-01-01T00:00:00.000Z")
  })

  it("el último día del mes pertenece a ese mes", () => {
    expect(claveMes(d("2026-11-30"))).toBe("2026-11")
  })
})

describe("totales", () => {
  const gastos = [
    { fecha: d("2026-11-02"), categoria: "Repuestos", monto: "0.10" },
    { fecha: d("2026-11-03"), categoria: "Repuestos", monto: "0.20" },
    { fecha: d("2026-11-05"), categoria: "Alquiler", monto: 2000 },
    { fecha: d("2026-10-15"), categoria: "Alquiler", monto: 2000 },
  ]

  it("suma sin errores de coma flotante", () => {
    expect(sumarGastos(gastos.slice(0, 2))).toBe(0.3)
  })

  it("agrupa por categoría, de mayor a menor", () => {
    const r = totalesPorCategoria(gastos.slice(0, 3))
    expect(r.map((x) => x.categoria)).toEqual(["Alquiler", "Repuestos"])
    expect(r[1].total).toBe(0.3)
    expect(r[0].porcentaje + r[1].porcentaje).toBeCloseTo(100)
  })

  it("rellena con 0 los meses sin gastos", () => {
    expect(totalesPorMes(gastos, "2026-11", 3)).toEqual([
      { mes: "2026-09", total: 0 },
      { mes: "2026-10", total: 2000 },
      { mes: "2026-11", total: 2000.3 },
    ])
  })
})
