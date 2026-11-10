import { describe, expect, it } from "vitest"
import { rangoProduccion } from "./periodo-produccion"

describe("periodos de producción", () => {
  it("incluye todo el mes y respeta años bisiestos", () => {
    expect(rangoProduccion("mes", "2024-02")).toEqual({ desde: "2024-02-01", hasta: "2024-02-29" })
    expect(rangoProduccion("mes", "2026-12")).toEqual({ desde: "2026-12-01", hasta: "2026-12-31" })
  })
  it("usa lunes a domingo incluso al cruzar el año", () => {
    expect(rangoProduccion("semana", "2027-01-03")).toEqual({ desde: "2026-12-28", hasta: "2027-01-03" })
    expect(rangoProduccion("semana", "2026-11-09")).toEqual({ desde: "2026-11-09", hasta: "2026-11-15" })
  })
})
