import { NextRequest, NextResponse } from "next/server"
import * as XLSX from "xlsx"
import { exigirRolReportes } from "@/lib/export-xlsx"
import { consultarExtrusion } from "@/lib/extrusion-db"
import { agruparExtrusion, filtrarExtrusion, leerFiltrosExtrusion, metricasExtrusion } from "@/lib/extrusion"
import { SECCIONES_PARTE,type AreaParte } from "@/lib/secciones-produccion"

export async function exportarPartes(req:NextRequest,area:AreaParte) {
  const slug=SECCIONES_PARTE[area].slug,confeccion=area==="CONFECCION"
  const error = await exigirRolReportes()
  if (error) return error
  let filtros: ReturnType<typeof leerFiltrosExtrusion>
  try {
    filtros = leerFiltrosExtrusion(Object.fromEntries(req.nextUrl.searchParams))
  } catch {
    return new NextResponse("Periodo inválido", { status: 400 })
  }
  const partes = await consultarExtrusion(filtros.ot || undefined,area)
  const filas = filtrarExtrusion(partes.flatMap(p => p.datos.filas.map(f => ({ ...f, maquina: p.datos.maquina, parte: p }))), filtros)
  const m = metricasExtrusion(filas)
  const wb = XLSX.utils.book_new()
  function agregar(nombre: string, datos: Record<string, string | number>[]) {
    const ws = XLSX.utils.json_to_sheet(datos)
    ws["!cols"] = Object.keys(datos[0] ?? {}).map(k => ({ wch: Math.min(50, Math.max(18, k.length + 2)) }))
    XLSX.utils.book_append_sheet(wb, ws, nombre)
  }
  agregar("Resumen", [
    { Indicador: "Material utilizado kg", Valor: m.entradaCompleta?m.entrada:"Datos incompletos" },
    { Indicador: confeccion?"Producto confeccionado kg":"Bobinas producidas kg", Valor: m.buenos },
    { Indicador: "Desperdicio kg", Valor: m.desperdicio },
    { Indicador: "Balance por conciliar kg", Valor: m.diferencia??"Pendiente por falta de entradas" },
    { Indicador: "Rendimiento aparente %", Valor: m.rendimiento??"Sin dato" },
    { Indicador: "Desperdicio %", Valor: m.mermaPct??"Sin dato" },
    { Indicador: confeccion?"Cantidad de bultos":"Cantidad de bobinas", Valor: confeccion?m.bultos:m.bobinas },
    { Indicador: confeccion?"Peso medio bulto kg":"Peso medio bobina kg", Valor: m.pesoMedio },
    ...(confeccion?[{Indicador:"Paquetes",Valor:m.paquetesCompletos?m.paquetes:"Datos incompletos"}]:[]),
    { Indicador: "Filas sin fecha", Valor: m.sinFecha },
    { Indicador: "Interrupciones con duración min", Valor: m.minutos },
    { Indicador: "Filas de interrupción sin duración", Valor: m.sinDuracion },
  ])
  agregar("Detalle", filas.map(({ parte: p, ...f }) => ({
    OT: p.datos.ot, Cliente: p.datos.cliente, Producto: p.datos.producto,
    Máquina: f.maquina||"Sin dato", Fecha: f.fecha||"Sin fecha", Operador: f.operador||"Sin dato", Turno: f.turno||"Sin dato",
    Material: f.material, "Material kg": f.entradaInformada===false?"Sin dato":f.entrada, Bobina: confeccion?f.bobinaEntrada??"":f.bobina,
    ...(confeccion?{Bulto:f.bulto??"",Paquetes:f.paquetes??"Sin dato",Inicio:f.inicio||"Sin dato",Término:f.termino||"Sin dato"}:{}),
    "Producto kg": f.buenos, "Desperdicio kg": f.desperdicio,
    Interrupción: f.motivo, Minutos: f.minutos ?? "Sin dato",
    "Fila Excel": f.fila, Archivo: p.archivo, Hoja: p.hoja,
  })))
  const ordenesDelPeriodo=new Set(filas.map(f=>f.parte.ordenId))
  agregar("Ficha técnica",partes.filter(p=>ordenesDelPeriodo.has(p.ordenId)).map(p=>({
    OT:p.datos.ot,Cliente:p.datos.cliente,Producto:p.datos.producto,"Pedido kg":p.datos.pedido,
    Máquina:p.datos.maquina,...p.datos.ficha,
  })))
  for (const [campo, nombre] of [["fecha", "Por fecha"], ["operador", "Por operador"], ["turno", "Por turno"], ["material", "Materiales"]] as const) {
    agregar(nombre, agruparExtrusion(filas.map(f=>({...f,[campo]:f[campo]||"Sin identificar"})), campo).filter(g=>campo!=="material"||g.entrada>0).map(g => ({
      Grupo: g.nombre, "Material kg": g.entradaCompleta?g.entrada:"Datos incompletos",
      ...(campo !== "material" ? { "Producto kg": g.buenos, "Desperdicio kg": g.desperdicio, "Rendimiento aparente %": g.rendimiento??"Sin dato" } : {}),
    })))
  }
  agregar("Por máquina", [...new Set(filas.map(f => f.maquina))].map(maquina => {
    const g = metricasExtrusion(filas.filter(f => f.maquina === maquina))
    return { Máquina: maquina || "Sin indicar", "Material kg": g.entradaCompleta?g.entrada:"Datos incompletos", "Producto kg": g.buenos, "Desperdicio kg": g.desperdicio, "Balance por conciliar kg": g.diferencia??"Sin dato" }
  }))
  agregar("Criterios", [
    { Campo: "Sección", Valor: SECCIONES_PARTE[area].nombre },
    { Campo: "Periodo desde", Valor: filtros.desde || "Todo el historial" },
    { Campo: "Periodo hasta", Valor: filtros.hasta || "Todo el historial" },
    { Campo: "OT", Valor: filtros.ot || "Todas" },
    { Campo: "Máquina", Valor: filtros.maquina || "Todas" },
    { Campo: "Turno", Valor: filtros.turno || "Todos" },
    { Campo: "Operador", Valor: filtros.operador || "Todos" },
    { Campo: "Fuente", Valor: "Última versión importada por OT. Suma de filas; no suma versiones previas ni pesajes operativos." },
    { Campo: "Balance", Valor: "Material utilizado − producto terminado − desperdicio. Solo se calcula con entradas completas; las diferencias no son merma automática." },
    { Campo: "Tiempos", Valor: "Sin horas operativas no se calcula OEE ni kg/h. Las filas sin duración no cuentan como cero minutos confirmados." },
    { Campo: "Faltantes", Valor: "Las filas sin fecha se excluyen cuando se filtra un periodo. Si faltan entradas, balance y rendimiento quedan pendientes. No se infieren datos desde otras secciones." },
  ])
  return new NextResponse(XLSX.write(wb, { type: "buffer", bookType: "xlsx" }), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename=${slug}.xlsx`,
      "Cache-Control": "no-store",
    },
  })
}
