import { describe, expect, it } from "vitest"
import { resumenMensualExtrusion } from "./panel-extrusion"
import type { FilaExtrusion, ParteExtrusionDatos } from "./extrusion"

function fila(fecha: string, material: string, entrada = 10): FilaExtrusion {
  return { fila: 18, fecha, material, entrada, buenos: 8, desperdicio: 1, operador: "A", turno: "1", bobina: "1", motivo: "", minutos: null }
}
function parte(ordenId: string, filas: FilaExtrusion[], pedido = 100) {
  const datos: ParteExtrusionDatos = { version: 1, hoja: "OT", cliente: "Cliente", producto: "Bobinas", ot: ordenId, pedido, maquina: "1", ficha: {}, filas, avisos: [] }
  return { ordenId, datos }
}
describe("panel mensual de extrusión", () => {
  it("cuenta el pedido una vez por OT activa y separa producción por mes", () => {
    const resumen = resumenMensualExtrusion([parte("1", [fila("2026-01-01", "BAJA"), fila("2026-01-02", "LINEAL"), fila("2026-02-01", "TERMO"), fila("", "SUERO")]), parte("2", [fila("2026-01-03", "SUERO")], 200)])
    expect(resumen.map(m => m.mes)).toEqual(["2026-02", "2026-01"])
    expect(resumen[1]).toMatchObject({ pedido: 300, entrada: 30, buenos: 24, desperdicio: 3 })
    expect(resumen[0]).toMatchObject({ pedido: 100, entrada: 10, buenos: 8 })
    expect(resumen[1].ordenes).toHaveLength(2)
  })
  it("normaliza stretch y conserva otros materiales sin duplicar kilos", () => {
    const [mes] = resumenMensualExtrusion([parte("1", [fila("2026-01-01", " STRECH "), fila("2026-01-02", "Stretch"), fila("2026-01-02", "FLEXUS"), fila("2026-01-03", ""), { ...fila("2026-01-04", "BAJA", 0), entradaInformada: false }])])
    expect(mes.materiales.find(m => m.nombre === "Stretch")?.kg).toBe(20)
    expect(mes.materiales.find(m => m.nombre === "Otros · FLEXUS")?.kg).toBe(10)
    expect(mes.materiales.find(m => m.nombre === "Sin identificar")?.kg).toBe(10)
    expect(mes.materiales.reduce((s, m) => s + m.kg, 0)).toBe(mes.entrada)
    expect(mes.entradaCompleta).toBe(false)
    expect(mes.materiales.find(m => m.nombre === "Reciclado")?.kg).toBe(0)
  })
})
