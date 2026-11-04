import { describe, expect, it } from "vitest"
import * as XLSX from "xlsx"
import { detectarMedioPago, parseKardexBuffer, planificarImportacion } from "./kardex-parser"

type Fila = (string | number | null)[]

const ENCABEZADO: Fila = [
  "FECHA INGRESO", "N° ORDEN DE TRABAJO", "CANTIDAD S/G OT", "PRODUCTO", "MEDIDA", "NOTA DE REMISION",
  "FECHA ENTREGA", "KG ENTREGADOS", "BULTOS", "PRECIO UNITARIO", "TOTAL CREDITO", "PAGO A CUENTA", "SALDO", "OBSERVACIONES",
]

/** Arma un libro como los de la planta: datos del cliente arriba, encabezado en la fila 11. */
function libro(filas: Fila[], opciones: { cliente?: string; encabezadoEn?: number; hoja?: string; date1904?: boolean } = {}) {
  const { cliente = "Gabriela Quispe", encabezadoEn = 10, hoja = "Kardex" } = opciones
  const cabecera: Fila[] = Array.from({ length: encabezadoEn }, () => [])
  cabecera[1] = ["CLIENTE:", cliente]
  cabecera[2] = ["DIRECCION:", "Av. Blanco Galindo km 5"]
  cabecera[3] = ["TELF:", "70712345"]
  const ws = XLSX.utils.aoa_to_sheet([...cabecera, ENCABEZADO, ...filas])
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, hoja)
  if (opciones.date1904) wb.Workbook = { WBProps: { date1904: true } }
  return new Uint8Array(XLSX.write(wb, { type: "array", bookType: "xlsx" }))
}

const entrega = (
  fecha: string | number, ot: string | number, producto: string, kg: number | string, precio: number | string, total: number | string | null,
  extra: Partial<{ nr: string; bultos: number; pedidos: number; saldo: number | string; obs: string; medida: string }> = {}
): Fila => [fecha, ot, extra.pedidos ?? null, producto, extra.medida ?? "40x60", extra.nr ?? null, fecha, kg, extra.bultos ?? null, precio, total, null, extra.saldo ?? null, extra.obs ?? null]

const pago = (fecha: string | number, detalle: string, monto: number | string, saldo?: number): Fila =>
  [fecha, detalle, null, null, null, null, null, null, null, null, null, monto, saldo ?? null, null]

describe("parseKardexBuffer", () => {
  it("lee cliente, entregas y pagos de la plantilla estándar", () => {
    const r = parseKardexBuffer(
      libro([
        entrega("10/02/2026", "1001", "Bolsa camiseta", 500, 12, 6000, { nr: "55", bultos: 10, saldo: 6000 }),
        pago("20/02/2026", "Pago en efectivo", 2000, 4000),
        entrega("01/03/2026", "1002", "Bolsa tipo rollo", 250, 14, 3500, { saldo: 7500 }),
      ]),
      "kardex.xlsx"
    )
    expect(r.errores).toEqual([])
    expect(r.clienteNombre).toBe("Gabriela Quispe")
    expect(r.direccion).toBe("Av. Blanco Galindo km 5")
    expect(r.telefono).toBe("70712345")
    expect(r.movimientos.map((m) => m.tipo)).toEqual(["ENTREGA", "PAGO", "ENTREGA"])
    expect(r.totalCargo).toBe(9500)
    expect(r.totalAbono).toBe(2000)
    expect(r.saldoCalculado).toBe(7500)
    expect(r.saldoExcel).toBe(7500)
    expect(r.avisos).toEqual([])
    expect(r.movimientos[1].medioPago).toBe("EFECTIVO")
  })

  it("entiende importes escritos como texto y fechas dd/mm/aaaa (antes daban 0 y 'hoy')", () => {
    const r = parseKardexBuffer(
      libro([
        entrega("15/03/2026", "2001", "Bolsa", "1.250,50", "Bs 8,00", "Bs 10.004,00"),
        pago("16/03/2026", "Depósito cta. cte.", "Bs. 4.000,00"),
      ]),
      "k.xlsx"
    )
    expect(r.errores).toEqual([])
    expect(r.movimientos[0].kgEntregados).toBe(1250.5)
    expect(r.movimientos[0].cargo).toBe(10004)
    expect(r.movimientos[0].fecha.toISOString().slice(0, 10)).toBe("2026-03-15")
    expect(r.movimientos[1].abono).toBe(4000)
    expect(r.movimientos[1].medioPago).toBe("TRANSFERENCIA")
  })

  it("lee fechas seriales de Excel", () => {
    const r = parseKardexBuffer(libro([entrega(46096, "3001", "Bolsa", 100, 10, 1000)]), "k.xlsx")
    expect(r.movimientos[0].fecha.toISOString().slice(0, 10)).toBe("2026-03-15")
  })

  it("reporta fecha ilegible con el número de fila de Excel en lugar de usar hoy", () => {
    const r = parseKardexBuffer(libro([entrega("el lunes", "4001", "Bolsa", 100, 10, 1000)]), "k.xlsx")
    expect(r.movimientos).toHaveLength(0)
    expect(r.errores).toHaveLength(1)
    expect(r.errores[0].fila).toBe(12) // 10 filas de cabecera + encabezado (11) + primera fila de datos (12)
    expect(r.errores[0].mensaje).toMatch(/Fecha ilegible/)
  })

  it("no inventa precios ni kg: una entrega sin precio ni total es un error", () => {
    const r = parseKardexBuffer(libro([entrega("01/03/2026", "5001", "Bolsa", 100, "", null)]), "k.xlsx")
    expect(r.movimientos).toHaveLength(0)
    expect(r.errores[0].mensaje).toMatch(/precio ni total/)
  })

  it("marca valores no numéricos (#REF!, texto) como error de la fila", () => {
    const r = parseKardexBuffer(libro([entrega("01/03/2026", "6001", "Bolsa", "#REF!", 10, 1000)]), "k.xlsx")
    expect(r.errores[0].mensaje).toMatch(/Kg entregados «#REF!»/)
  })

  it("rechaza importes negativos", () => {
    const r = parseKardexBuffer(libro([pago("01/03/2026", "Devolución", -100)]), "k.xlsx")
    expect(r.errores[0].mensaje).toMatch(/negativo/i)
  })

  it("avisa si el saldo del Excel no cuadra con las filas leídas", () => {
    const r = parseKardexBuffer(
      libro([entrega("01/03/2026", "7001", "Bolsa", 100, 10, 1000, { saldo: 5000 })]),
      "k.xlsx"
    )
    expect(r.saldoCalculado).toBe(1000)
    expect(r.saldoExcel).toBe(5000)
    expect(r.avisos.join(" ")).toMatch(/no coincide/)
  })

  it("usa el precio efectivo cuando el total no sale de kg × precio", () => {
    const r = parseKardexBuffer(libro([entrega("01/03/2026", "8001", "Bolsa", 100, 12, 1000)]), "k.xlsx")
    expect(r.movimientos[0].precioUnitario).toBe(10)
    expect(r.movimientos[0].cargo).toBe(1000)
    expect(r.avisos.join(" ")).toMatch(/precio efectivo/)
  })

  it("calcula el total si solo vienen kg y precio", () => {
    const r = parseKardexBuffer(libro([entrega("01/03/2026", "9001", "Bolsa", 100, 12, null)]), "k.xlsx")
    expect(r.movimientos[0].cargo).toBe(1200)
  })

  it("ignora totales, separadores de gestión y encabezados repetidos, y avisa del saldo inicial", () => {
    const r = parseKardexBuffer(
      libro([
        ["GESTION 2025", null, null, null, null, null, null, null, null, null, null, null, null, null],
        [null, "SALDO ANTERIOR", null, null, null, null, null, null, null, null, 500, null, 500, null],
        entrega("02/01/2026", "1", "Bolsa", 100, 10, 1000),
        ENCABEZADO,
        ["TOTAL", null, null, null, null, null, null, 100, null, null, 1000, 0, null, null],
      ]),
      "k.xlsx"
    )
    expect(r.errores).toEqual([])
    expect(r.movimientos).toHaveLength(1)
    expect(r.avisos.join(" ")).toMatch(/saldo inicial de Bs/)
  })

  it("encuentra el encabezado aunque no esté en la fila 11 y las columnas estén en otro orden", () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ["Kardex de cliente"],
      ["CLIENTE: Aldo Guardia"],
      [],
      ["Fecha", "Producto", "KG entregados", "Precio unitario", "Total crédito", "Pago a cuenta", "Saldo"],
      ["01/04/2026", "Bolsa 50x70", 200, 9, 1800, null, 1800],
      ["05/04/2026", "Pago QR", null, null, null, 800, 1000],
    ])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Hoja1")
    const r = parseKardexBuffer(new Uint8Array(XLSX.write(wb, { type: "array", bookType: "xlsx" })), "x.xlsx")
    expect(r.clienteNombre).toBe("Aldo Guardia")
    expect(r.errores).toEqual([])
    expect(r.movimientos.map((m) => [m.tipo, m.cargo, m.abono])).toEqual([["ENTREGA", 1800, 0], ["PAGO", 0, 800]])
    expect(r.saldoCalculado).toBe(1000)
  })

  it("usa el nombre del archivo si no hay etiqueta Cliente", () => {
    const ws = XLSX.utils.aoa_to_sheet([ENCABEZADO, entrega("01/03/2026", "1", "Bolsa", 100, 10, 1000)])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Hoja1")
    const r = parseKardexBuffer(new Uint8Array(XLSX.write(wb, { type: "array", bookType: "xlsx" })), "KARDEX_Pedro Rojas (1).xlsx")
    expect(r.clienteNombre).toBe("Pedro Rojas")
    expect(r.avisos.join(" ")).toMatch(/nombre del archivo/)
  })

  it("acepta un ArrayBuffer, como el que entrega file.arrayBuffer()", () => {
    const u8 = libro([entrega("01/03/2026", "1", "Bolsa", 100, 10, 1000)])
    const ab = u8.buffer.slice(u8.byteOffset, u8.byteOffset + u8.byteLength) as ArrayBuffer
    expect(parseKardexBuffer(ab, "k.xlsx").movimientos).toHaveLength(1)
  })

  it("lee varias hojas (una por gestión)", () => {
    const hoja = (filas: Fila[]) => XLSX.utils.aoa_to_sheet([["CLIENTE:", "Ana"], [], ENCABEZADO, ...filas])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, hoja([entrega("01/12/2025", "1", "Bolsa", 100, 10, 1000)]), "2025")
    XLSX.utils.book_append_sheet(wb, hoja([entrega("01/02/2026", "2", "Bolsa", 100, 10, 1000)]), "2026")
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([["Portada"]]), "Portada")
    const r = parseKardexBuffer(new Uint8Array(XLSX.write(wb, { type: "array", bookType: "xlsx" })), "x.xlsx")
    expect(r.hojas).toEqual(["2025", "2026"])
    expect(r.movimientos).toHaveLength(2)
  })

  it("falla con un archivo que no es un Excel (el action lo captura y lo informa)", () => {
    expect(() => parseKardexBuffer(new Uint8Array([1, 2, 3, 4]), "malo.xlsx")).not.toThrow()
  })
})

describe("detectarMedioPago", () => {
  it("no confunde 'pago a cuenta' con transferencia", () => {
    expect(detectarMedioPago("Pago a cuenta")).toBe("OTRO")
    expect(detectarMedioPago("Pago a cuenta en efectivo")).toBe("EFECTIVO")
    expect(detectarMedioPago("Pago QR")).toBe("QR")
    expect(detectarMedioPago("Dep. BNB cta cte")).toBe("TRANSFERENCIA")
  })
})

describe("planificarImportacion", () => {
  const base = () =>
    parseKardexBuffer(
      libro([
        entrega("10/02/2026", "1001", "Bolsa camiseta", 300, 12, 3600, { pedidos: 500, nr: "55" }),
        entrega("20/02/2026", "1001", "Bolsa camiseta", 200, 12, 2400, { pedidos: 500, nr: "56" }),
        entrega("01/03/2026", "1002", "Bolsa rollo", 100, 14, 1400, { pedidos: 400 }),
        pago("05/03/2026", "Pago efectivo", 1000),
        pago("05/03/2026", "Pago efectivo", 1000), // dos pagos idénticos el mismo día son legítimos
      ]),
      "k.xlsx"
    )

  it("agrupa las entregas de una misma OT y deduce el estado", () => {
    const plan = planificarImportacion(base(), "cli1")
    expect(plan.ordenes).toHaveLength(2)
    const ot1 = plan.ordenes.find((o) => o.ref === "1001")!
    expect(ot1.entregas).toHaveLength(2)
    expect(ot1.kgPedidos).toBe(500)
    expect(ot1.estado).toBe("ENTREGADA")
    expect(plan.ordenes.find((o) => o.ref === "1002")!.estado).toBe("TERMINADA") // 100 de 400 kg
  })

  it("genera claves estables: reimportar el mismo archivo produce las mismas claves", () => {
    const a = planificarImportacion(base(), "cli1")
    const b = planificarImportacion(base(), "cli1")
    const claves = (p: typeof a) => [...p.ordenes.map((o) => o.key), ...p.ordenes.flatMap((o) => o.entregas.map((e) => e.key)), ...p.pagos.map((x) => x.key)]
    expect(claves(a)).toEqual(claves(b))
  })

  it("no repite claves aunque dos filas sean idénticas", () => {
    const plan = planificarImportacion(base(), "cli1")
    const claves = [...plan.ordenes.flatMap((o) => o.entregas.map((e) => e.key)), ...plan.pagos.map((p) => p.key)]
    expect(new Set(claves).size).toBe(claves.length)
    expect(plan.pagos).toHaveLength(2)
  })

  it("las claves dependen del cliente", () => {
    const a = planificarImportacion(base(), "cli1")
    const b = planificarImportacion(base(), "cli2")
    expect(a.pagos[0].key).not.toBe(b.pagos[0].key)
  })

  it("un archivo ampliado solo agrega las filas nuevas", () => {
    const original = planificarImportacion(base(), "cli1")
    const ampliado = planificarImportacion(
      parseKardexBuffer(
        libro([
          entrega("10/02/2026", "1001", "Bolsa camiseta", 300, 12, 3600, { pedidos: 500, nr: "55" }),
          entrega("20/02/2026", "1001", "Bolsa camiseta", 200, 12, 2400, { pedidos: 500, nr: "56" }),
          entrega("01/03/2026", "1002", "Bolsa rollo", 100, 14, 1400, { pedidos: 400 }),
          pago("05/03/2026", "Pago efectivo", 1000),
          pago("05/03/2026", "Pago efectivo", 1000),
          pago("20/03/2026", "Pago QR", 500),
        ]),
        "k.xlsx"
      ),
      "cli1"
    )
    const viejas = new Set(original.pagos.map((p) => p.key))
    expect(ampliado.pagos.filter((p) => !viejas.has(p.key))).toHaveLength(1)
  })
})
