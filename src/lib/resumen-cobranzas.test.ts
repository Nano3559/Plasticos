import { describe, expect, it } from "vitest"
import { armarResumen, type ClienteResumenDatos } from "./resumen-cobranzas"

const d = (s: string) => new Date(`${s}T00:00:00Z`)
const HOY = d("2026-11-04")

const gabriela: ClienteResumenDatos = {
  id: "g", nombre: "Gabriela", telefono: null, diasCredito: 15,
  ordenes: [
    { numero: 1, producto: "Bobinas para agua", precioUnitario: 40, entregas: [
      { fecha: d("2026-08-24"), kgEntregados: 200, notaRemision: "215" },
      { fecha: d("2026-10-01"), kgEntregados: 100, notaRemision: "274" },
    ] },
  ],
  pagos: [
    { fecha: d("2026-09-03"), monto: 8000, medio: "TRANSFERENCIA", referencia: "Pago 1" },
    { fecha: d("2026-10-21"), monto: 1000, medio: "EFECTIVO", referencia: "Pago 2" },
  ],
}
const carlos: ClienteResumenDatos = {
  id: "c", nombre: "Carlos", telefono: null, diasCredito: 15,
  ordenes: [{ numero: 2, producto: "Bolsa hielo 4 kg", precioUnitario: 40, entregas: [{ fecha: d("2025-07-24"), kgEntregados: 100, notaRemision: null }] }],
  pagos: [],
}

describe("armarResumen", () => {
  it("suma totales, por cobrar y mora de todos los clientes", () => {
    const r = armarResumen([gabriela, carlos], { meses: 12, alcance: "todos", hoy: HOY })
    expect(r.entregadoHistorico).toBe(16000)
    expect(r.cobradoHistorico).toBe(9000)
    expect(r.porCobrar).toBe(7000)
    expect(r.enMora).toBe(7000) // ambos tienen deuda de más de 15 días
    expect(r.clientesConDeuda).toBe(2)
    expect(r.clientes.map((c) => c.cliente.nombre)).toEqual(["Carlos", "Gabriela"]) // mayor saldo primero: 4000 y 3000
    expect(r.serie).toHaveLength(12)
    expect(r.serie.at(-1)!.saldo).toBe(7000)
  })

  it("el saldo acumulado de la serie arranca con lo que venía de antes del periodo", () => {
    const r = armarResumen([carlos], { meses: 6, alcance: "cliente", hoy: HOY })
    expect(r.serie[0].saldo).toBe(4000)
    expect(r.entregadoPeriodo).toBe(0)
  })

  it("calcula los días promedio de pago aplicando pagos a las entregas más antiguas", () => {
    const r = armarResumen([gabriela], { meses: 12, alcance: "cliente", hoy: HOY })
    expect(r.clientes[0].diasPromedioPago).toBe(11) // (8000 × 10 días + 1000 × 20 días) / 9000
    expect(r.clientes[0].porcentajeCobrado).toBe(75)
    expect(r.movimientos.map((m) => m.saldo)).toEqual([8000, 0, 4000, 3000])
    expect(r.porMedio[0]).toEqual({ medio: "TRANSFERENCIA", monto: 8000 })
  })

  it("con meses = 0 muestra todo el historial", () => {
    const r = armarResumen([gabriela, carlos], { meses: 0, alcance: "todos", hoy: HOY })
    expect(r.serie[0].mes).toBe("2025-07")
    expect(r.entregadoPeriodo).toBe(r.entregadoHistorico)
  })

  it("las devoluciones y descuentos bajan el saldo sin contar como cobro", () => {
    const conNota: ClienteResumenDatos = {
      ...gabriela,
      notasCredito: [{ fecha: d("2026-10-05"), monto: 544, tipo: "DEVOLUCION", motivo: "Bolsas falladas", kg: 13.6 }],
    }
    const r = armarResumen([conNota], { meses: 12, alcance: "cliente", hoy: HOY })
    expect(r.porCobrar).toBe(3000 - 544)
    expect(r.cobradoHistorico).toBe(9000) // lo cobrado no cambia
    expect(r.creditosHistorico).toBe(544)
    expect(r.kgDevueltosPeriodo).toBe(13.6)
    expect(r.serie.find((p) => p.mes === "2026-10")!.creditos).toBe(544)
    expect(r.serie.at(-1)!.saldo).toBe(2456)
    expect(r.movimientos.find((m) => m.tipo === "NOTA")!.abono).toBe(544)
    expect(r.clientes[0].porcentajeCobrado).toBe(79) // 9000 / (12000 − 544) = 78,6 %
  })
})
