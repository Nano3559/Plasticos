import { describe, expect, it } from "vitest"
import { claveProveedor, leerPeriodoRechazo, resumirPorProveedor } from "./rechazos"

describe("claveProveedor", () => {
  it("agrupa el mismo proveedor escrito distinto", () => {
    expect(claveProveedor("Braskem / YPFB")).toBe(claveProveedor(" braskem/ypfb "))
    expect(claveProveedor("Recicladora Ñandú")).toBe(claveProveedor("recicladora nandu"))
  })
})

describe("resumirPorProveedor", () => {
  const entradas = [
    { proveedor: "Recicla Sur", cantidad: 1000 },
    { proveedor: "recicla sur", cantidad: "500.50" },
    { proveedor: "Braskem", cantidad: 2000 },
    { proveedor: null, cantidad: 100 },
  ]
  const rechazos = [
    { proveedor: "Recicla Sur", kgRechazado: 100, motivo: "Húmedo", lote: "L-7" },
    { proveedor: "Recicla Sur", kgRechazado: "50.05", motivo: "Húmedo", lote: "L-8" },
    { proveedor: "Recicla Sur", kgRechazado: 0.5, motivo: "Sucio o contaminado", lote: "L-7" },
    { proveedor: "Braskem", kgRechazado: 20, motivo: "Color o tono incorrecto", lote: null },
    { proveedor: "Plásticos Nuevos", kgRechazado: 5, motivo: "Otro", lote: "X" },
  ]
  const r = resumirPorProveedor(entradas, rechazos)

  it("suma por proveedor y calcula el %", () => {
    const sur = r.find((f) => f.clave === "recicla sur")!
    expect(sur.proveedor).toBe("Recicla Sur")
    expect(sur.kgRecibidos).toBe(1500.5)
    expect(sur.kgRechazados).toBe(150.55)
    expect(sur.porcentaje).toBeCloseTo(10.033, 2)
    expect(sur.rechazos).toBe(3)
    expect(sur.motivoPrincipal).toBe("Húmedo")
    expect(sur.lotes).toEqual(["L-7", "L-8"])
  })

  it("rechazos sin entradas en el periodo van primero, sin %", () => {
    expect(r[0].proveedor).toBe("Plásticos Nuevos")
    expect(r[0].porcentaje).toBeNull()
  })

  it("ordena por % de rechazo", () => {
    expect(r.map((f) => f.proveedor)).toEqual(["Plásticos Nuevos", "Recicla Sur", "Braskem", "Sin proveedor"])
    expect(r.find((f) => f.proveedor === "Braskem")!.porcentaje).toBe(1)
  })

  it("entradas sin proveedor quedan agrupadas aparte", () => {
    const sin = r.find((f) => f.proveedor === "Sin proveedor")!
    expect(sin.kgRecibidos).toBe(100)
    expect(sin.rechazos).toBe(0)
  })
})

describe("leerPeriodoRechazo", () => {
  it("acepta 3, 6 o 12; si no, 6", () => {
    expect(leerPeriodoRechazo("12")).toBe(12)
    expect(leerPeriodoRechazo("5")).toBe(6)
    expect(leerPeriodoRechazo(undefined)).toBe(6)
  })
})
