import { NextRequest, NextResponse } from "next/server"
import * as XLSX from "xlsx"
import { exigirRolReportes } from "@/lib/export-xlsx"
import { consultarExtrusion } from "@/lib/extrusion-db"
import { agruparExtrusion, filtrarExtrusion, leerFiltrosExtrusion, metricasExtrusion } from "@/lib/extrusion"

export async function GET(req: NextRequest) {
  const error = await exigirRolReportes()
  if (error) return error
  let filtros: ReturnType<typeof leerFiltrosExtrusion>
  try {
    filtros = leerFiltrosExtrusion(Object.fromEntries(req.nextUrl.searchParams))
  } catch {
    return new NextResponse("Periodo inválido", { status: 400 })
  }
  const partes = await consultarExtrusion(filtros.ot || undefined)
  const filas = filtrarExtrusion(partes.flatMap(p => p.datos.filas.map(f => ({ ...f, maquina: p.datos.maquina, parte: p }))), filtros)
  const m = metricasExtrusion(filas)
  const wb = XLSX.utils.book_new()
  function agregar(nombre: string, datos: Record<string, string | number>[]) {
    const ws = XLSX.utils.json_to_sheet(datos)
    ws["!cols"] = Object.keys(datos[0] ?? {}).map(k => ({ wch: Math.min(50, Math.max(18, k.length + 2)) }))
    XLSX.utils.book_append_sheet(wb, ws, nombre)
  }
  agregar("Resumen", [
    { Indicador: "Material utilizado kg", Valor: m.entrada },
    { Indicador: "Bobinas producidas kg", Valor: m.buenos },
    { Indicador: "Desperdicio kg", Valor: m.desperdicio },
    { Indicador: "Balance por conciliar kg", Valor: m.diferencia },
    { Indicador: "Rendimiento aparente %", Valor: m.rendimiento },
    { Indicador: "Desperdicio %", Valor: m.mermaPct },
    { Indicador: "Cantidad de bobinas", Valor: m.bobinas },
    { Indicador: "Peso medio bobina kg", Valor: m.pesoMedio },
    { Indicador: "Interrupciones con duración min", Valor: m.minutos },
    { Indicador: "Filas de interrupción sin duración", Valor: m.sinDuracion },
  ])
  agregar("Detalle", filas.map(({ parte: p, ...f }) => ({
    OT: p.datos.ot, Cliente: p.datos.cliente, Producto: p.datos.producto,
    Máquina: f.maquina, Fecha: f.fecha, Operador: f.operador, Turno: f.turno,
    Material: f.material, "Material kg": f.entrada, Bobina: f.bobina,
    "Bobina kg": f.buenos, "Desperdicio kg": f.desperdicio,
    Interrupción: f.motivo, Minutos: f.minutos ?? "Sin dato",
    "Fila Excel": f.fila, Archivo: p.archivo, Hoja: p.hoja,
  })))
  for (const [campo, nombre] of [["fecha", "Por fecha"], ["operador", "Por operador"], ["turno", "Por turno"], ["material", "Materiales"]] as const) {
    agregar(nombre, agruparExtrusion(filas, campo).map(g => ({
      Grupo: g.nombre, "Material kg": g.entrada,
      ...(campo !== "material" ? { "Bobinas kg": g.buenos, "Desperdicio kg": g.desperdicio, "Rendimiento aparente %": g.rendimiento } : {}),
    })))
  }
  agregar("Por máquina", [...new Set(filas.map(f => f.maquina))].map(maquina => {
    const g = metricasExtrusion(filas.filter(f => f.maquina === maquina))
    return { Máquina: maquina || "Sin indicar", "Material kg": g.entrada, "Bobinas kg": g.buenos, "Desperdicio kg": g.desperdicio, "Balance por conciliar kg": g.diferencia }
  }))
  agregar("Criterios", [
    { Campo: "Periodo desde", Valor: filtros.desde || "Todo el historial" },
    { Campo: "Periodo hasta", Valor: filtros.hasta || "Todo el historial" },
    { Campo: "OT", Valor: filtros.ot || "Todas" },
    { Campo: "Máquina", Valor: filtros.maquina || "Todas" },
    { Campo: "Turno", Valor: filtros.turno || "Todos" },
    { Campo: "Operador", Valor: filtros.operador || "Todos" },
    { Campo: "Fuente", Valor: "Última versión importada por OT. Suma de filas; no suma versiones previas ni pesajes operativos." },
    { Campo: "Balance", Valor: "Material utilizado − bobinas − desperdicio. Diferencias pendientes de conciliar; no son merma automática." },
    { Campo: "Tiempos", Valor: "Sin horas operativas no se calcula OEE ni kg/h. Las filas sin duración no cuentan como cero minutos confirmados." },
  ])
  return new NextResponse(XLSX.write(wb, { type: "buffer", bookType: "xlsx" }), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": "attachment; filename=extrusion.xlsx",
      "Cache-Control": "no-store",
    },
  })
}
