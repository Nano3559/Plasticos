import { describe, expect, it } from "vitest"
import { parseFecha, parseNumero } from "./lectura-excel"
import { formatBs, formatKg, redondear } from "./formato"

const sinEspaciosDuros = (s: string) => s.replace(/\u00a0/g, " ")

describe("formatBs", () => {
  it("usa Bs con separadores bolivianos", () => {
    expect(sinEspaciosDuros(formatBs(1234.5))).toBe("Bs 1.234,50")
    expect(sinEspaciosDuros(formatBs(0))).toBe("Bs 0,00")
    expect(sinEspaciosDuros(formatBs(1234567.891))).toBe("Bs 1.234.567,89")
  })
  it("maneja negativos, strings y Decimal de Prisma", () => {
    expect(sinEspaciosDuros(formatBs(-50))).toBe("-Bs 50,00")
    expect(sinEspaciosDuros(formatBs("99.5"))).toBe("Bs 99,50")
    expect(sinEspaciosDuros(formatBs({ toString: () => "10" }))).toBe("Bs 10,00") // Decimal de Prisma
    expect(sinEspaciosDuros(formatBs(undefined))).toBe("Bs 0,00")
  })
  it("permite elegir decimales", () => {
    expect(sinEspaciosDuros(formatBs(1234.5, 0))).toBe("Bs 1.235")
    expect(sinEspaciosDuros(formatBs(3.8374, 4))).toBe("Bs 3,8374")
  })
  it("formatea kg", () => {
    expect(sinEspaciosDuros(formatKg(1500.5))).toBe("1.500,50 kg")
  })
  it("redondea sin errores de coma flotante", () => {
    expect(redondear(1.005)).toBe(1.01)
    expect(redondear(0.1 + 0.2)).toBe(0.3)
  })
})

describe("parseNumero", () => {
  it.each([
    [1234.5, 1234.5],
    ["1234.5", 1234.5],
    ["1234,5", 1234.5],
    ["1.234,50", 1234.5],
    ["1,234.50", 1234.5],
    ["Bs 1.250,50", 1250.5],
    ["Bs. 300", 300],
    ["$ 45", 45],
    ["2.500 kg", 2.5],
    ["1.234.567", 1234567],
    ["(150,00)", -150],
    ["-20", -20],
  ])("lee %p como %p", (entrada, esperado) => {
    expect(parseNumero(entrada)).toBe(esperado)
  })
  it.each([[""], [null], [undefined], ["abc"], ["#REF!"], ["--"], [true]])("devuelve null para %p", (entrada) => {
    expect(parseNumero(entrada)).toBeNull()
  })
})

describe("parseFecha", () => {
  const iso = (d: Date | null) => d?.toISOString().slice(0, 10) ?? null
  it("lee fechas de texto dd/mm/aaaa y variantes", () => {
    expect(iso(parseFecha("15/03/2026"))).toBe("2026-03-15")
    expect(iso(parseFecha("5-3-26"))).toBe("2026-03-05")
    expect(iso(parseFecha("05.03.2026"))).toBe("2026-03-05")
    expect(iso(parseFecha("2026-03-15"))).toBe("2026-03-15")
  })
  it("lee seriales de Excel", () => {
    expect(iso(parseFecha(46096))).toBe("2026-03-15")
    expect(iso(parseFecha(46096.75))).toBe("2026-03-15")
  })
  it("respeta el calendario 1904", () => {
    expect(iso(parseFecha(46096 - 1462, true))).toBe("2026-03-15")
  })
  it("rechaza fechas imposibles en vez de usar hoy", () => {
    expect(parseFecha("31/02/2026")).toBeNull()
    expect(parseFecha("32/01/2026")).toBeNull()
    expect(parseFecha("ayer")).toBeNull()
    expect(parseFecha("")).toBeNull()
    expect(parseFecha(null)).toBeNull()
  })
  it("guarda al mediodía UTC para no cambiar de día en Bolivia (UTC-4)", () => {
    const d = parseFecha("15/03/2026")!
    expect(d.getUTCHours()).toBe(12)
  })
})

describe("parseNumero: fracciones y montos a la boliviana", () => {
  it("lee fracciones propias y descarta lo que parece fecha o N° de OT", () => {
    expect(parseNumero("5 1/2")).toBe(5.5)
    expect(parseNumero("1/2")).toBe(0.5)
    expect(parseNumero("10 3/4")).toBe(10.75)
    expect(parseNumero("5½")).toBe(5.5)
    expect(parseNumero("40.-")).toBe(40)
    expect(parseNumero("12/11")).toBeNull()
    expect(parseNumero("107 / 182")).toBeNull()
  })
})

