import * as XLSX from "xlsx"
import { leerNumero } from "@/lib/formato"
import { parseFecha } from "@/lib/lectura-excel"

export type FilaExtrusion = { fila: number; fecha: string; operador: string; turno: string; material: string; entrada: number; bobina: string; buenos: number; desperdicio: number; motivo: string; minutos: number | null }
export type ParteExtrusionDatos = { version: 1; hoja: string; cliente: string; producto: string; ot: string; pedido: number; maquina: string; ficha: Record<string, string>; filas: FilaExtrusion[]; avisos: string[] }
const texto = (v: unknown) => String(v ?? "").trim()
const normal = (v: unknown) => texto(v).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase()
function numero(v: unknown, etiqueta: string): number {
  if (v === null || v === undefined || v === "") return 0
  const n = typeof v === "number" ? v : leerNumero(texto(v), 2)
  if (!Number.isFinite(n) || n < 0) throw new Error(`${etiqueta}: número inválido o negativo`)
  return n
}
function fechaExcel(v: unknown, date1904: boolean): string {
  const fecha = parseFecha(v, date1904)
  if (fecha && fecha.getUTCFullYear() >= 2000 && fecha.getUTCFullYear() <= 2100) return fecha.toISOString().slice(0,10)
  throw new Error(`Fecha inválida: ${texto(v)}`)
}
export function analizarExtrusion(bytes: Uint8Array, hoja?: string): ParteExtrusionDatos {
  const wb = XLSX.read(bytes, { type: "array", cellDates: false, sheetRows: 5010 })
  const nombre = hoja || wb.SheetNames.find(n => /^OT\s*1$/i.test(n)) || wb.SheetNames.find(n => !/plantilla/i.test(n))
  if (!nombre || !wb.Sheets[nombre]) throw new Error("Selecciona una hoja de orden de trabajo existente")
  const ws = wb.Sheets[nombre]
  const rango = XLSX.utils.decode_range(ws["!ref"] || "A1")
  if (rango.e.r >= 5000 || rango.e.c > 40) throw new Error("La hoja supera el límite de 5.000 filas o 41 columnas")
  const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: null })
  for (const [direccion, celda] of Object.entries(ws)) {
    if (!direccion.startsWith("!") && celda?.t === "e") throw new Error(`La celda ${direccion} tiene un error de Excel. Corrígelo antes de importar`)
  }
  const celda = (r: number, c: number) => rows[r]?.[c]
  if (!normal(celda(0, 0)).includes("ORDEN DE TRABAJO SECCION DE EXTR")) throw new Error("El archivo no corresponde al formato de extrusión")
  if (normal(celda(9, 5)) !== "KILOS" || normal(celda(9, 10)) !== "DESPERDICIO") throw new Error("Las columnas del template no coinciden")
  const ficha: Record<string, string> = {}
  for (const [etiqueta, r, c] of [["Matriz",3,1],["Ancho",3,4],["Micronaje",3,6],["Film",3,8],["Tubular",3,11],["Tipo de material",4,1],["Color",4,5],["Tratado",4,8],["Caras",4,11],["Impresión",5,2],["Confección",5,4],["Tamaño",5,6],["Gramo/metro real",5,11],["Observaciones",6,1]] as const) ficha[etiqueta] = texto(celda(r,c))
  const filas: FilaExtrusion[] = []
  let fecha = "", operador = "", turno = ""
  const bobinas = new Set<string>()
  for (let i = 17; i < rows.length; i++) {
    const r = rows[i]
    if (!r?.some(v => v !== null && v !== "")) continue
    if (normal(r[0]).startsWith("TOTAL")) continue
    if (r[0] !== null && r[0] !== "" && r[0] !== undefined) {
      fecha = fechaExcel(r[0], !!wb.Workbook?.WBProps?.date1904)
      operador = texto(r[1]); turno = texto(r[2])
    } else {
      if (texto(r[1])) operador = texto(r[1])
      if (texto(r[2])) turno = texto(r[2])
    }
    const entrada = numero(r[5], `Fila ${i+1}, material`), buenos = numero(r[8], `Fila ${i+1}, bobina`), desperdicio = numero(r[10], `Fila ${i+1}, desperdicio`)
    const motivo = texto(r[11]), bobina = texto(r[7]), material = texto(r[3])
    const tiempo = r[13]
    let minutos: number | null = null
    if (tiempo !== null && tiempo !== "" && tiempo !== undefined) {
      const m = texto(tiempo).match(/^(\d+):(\d{2})$/)
      if (m && Number(m[2]) < 60) minutos = Number(m[1])*60 + Number(m[2])
      else if (typeof tiempo === "number" && tiempo >= 0 && tiempo < 1) minutos = tiempo*1440
      else throw new Error(`Fila ${i+1}: indica el tiempo como hh:mm (no se asume unidad de números enteros)`)
    }
    if (!entrada && !buenos && !desperdicio && !motivo && !bobina && minutos === null) continue
    if (!fecha || !operador || !turno) throw new Error(`Fila ${i+1}: faltan fecha, operador o turno`)
    const numeroTurno = turno.match(/^[123][ªº°a]?$/i)?.[0]?.[0]
    if (numeroTurno) turno = `${numeroTurno}ª`
    else if (["MANANA","TARDE","NOCHE"].includes(normal(turno))) turno = ({MANANA:"1ª",TARDE:"2ª",NOCHE:"3ª"} as Record<string,string>)[normal(turno)]
    if (!/^[123][ªº°a]?$/i.test(turno) && !["MANANA","TARDE","NOCHE"].includes(normal(turno))) throw new Error(`Fila ${i+1}: turno no reconocido`)
    if (entrada && !material) throw new Error(`Fila ${i+1}: falta el material`)
    if (buenos && !bobina) throw new Error(`Fila ${i+1}: faltó el número de bobina`)
    if (bobina) { if (bobinas.has(bobina)) throw new Error(`Bobina duplicada: ${bobina}`); bobinas.add(bobina) }
    filas.push({ fila:i+1, fecha, operador, turno, material, entrada, bobina, buenos, desperdicio, motivo, minutos })
  }
  if (!filas.length) throw new Error("La plantilla está vacía: completa los datos de producción antes de importar")
  const parte: ParteExtrusionDatos = { version:1, hoja:nombre, cliente:texto(celda(2,1)), producto:texto(celda(2,4)), ot:texto(celda(2,12)), pedido:numero(celda(2,7), "Cantidad pedida"), maquina:texto(celda(2,9)), ficha, filas, avisos:[] }
  if (!parte.cliente || !parte.producto || !parte.ot || !parte.pedido) throw new Error("Completa cliente, producto, cantidad y número de OT")
  const m = metricasExtrusion(filas, parte.pedido)
  if (Math.abs(m.diferencia) > 0.02) parte.avisos.push(`Balance por conciliar: ${m.diferencia.toFixed(2)} kg (material − bobinas − desperdicio). No se considera merma automáticamente.`)
  if (m.mermaPct > 5) parte.avisos.push("Desperdicio superior al umbral de seguimiento del 5% del material utilizado")
  if (m.buenos >= parte.pedido) parte.avisos.push("La producción alcanzó la cantidad pedida; revisar el cierre de la OT")
  if (filas.some(f => f.motivo && f.minutos === null)) parte.avisos.push("Hay interrupciones sin duración: no es posible calcular disponibilidad ni productividad por hora")
  if (!parte.maquina) parte.avisos.push("La máquina no está indicada en la ficha")
  if (filas.some((f,i)=>i>0&&f.fecha<filas[i-1].fecha)) parte.avisos.push("Hay fechas fuera de orden; revisa el detalle del Excel")
  for (const [col, suma, titulo] of [[5,m.entrada,"material"],[8,m.buenos,"bobinas"],[10,m.desperdicio,"desperdicio"]] as const) {
    const total = celda(10,col)
    if (total !== null && total !== undefined && Math.abs(numero(total,"Total")-suma)>0.02) parte.avisos.push(`El total declarado de ${titulo} no coincide con las filas; se usa la suma del detalle`)
  }
  const totalBobinas = celda(10,7)
  if (totalBobinas !== null && totalBobinas !== undefined && numero(totalBobinas,"Total de bobinas")!==m.bobinas) parte.avisos.push("La cantidad de bobinas declarada no coincide con el detalle")
  return parte
}
export function metricasExtrusion(filas: FilaExtrusion[], pedido = 0) {
  const entrada=filas.reduce((s,f)=>s+f.entrada,0), buenos=filas.reduce((s,f)=>s+f.buenos,0), desperdicio=filas.reduce((s,f)=>s+f.desperdicio,0)
  const bobinas=filas.filter(f=>f.bobina).length
  return { entrada,buenos,desperdicio,bobinas,diferencia:entrada-buenos-desperdicio,rendimiento:entrada?buenos/entrada*100:0,mermaPct:entrada?desperdicio/entrada*100:0,avance:pedido?buenos/pedido*100:0,pesoMedio:bobinas?buenos/bobinas:0,minutos:filas.reduce((s,f)=>s+(f.minutos??0),0),sinDuracion:filas.filter(f=>f.motivo&&f.minutos===null).length }
}
export function agruparExtrusion(filas: FilaExtrusion[], campo: "fecha" | "operador" | "turno" | "material") {
  const grupos = new Map<string,FilaExtrusion[]>()
  for(const f of filas) { const key=f[campo]; if(key) grupos.set(key,[...(grupos.get(key)??[]),f]) }
  return [...grupos].sort(([a],[b])=>a.localeCompare(b)).map(([nombre,fs])=>({nombre,...metricasExtrusion(fs)}))
}

export type FiltrosExtrusion = { ot?:string; desde?:string; hasta?:string; maquina?:string; turno?:string; operador?:string }
export function filtrarExtrusion<T extends FilaExtrusion & {maquina:string}>(filas:T[], filtros:FiltrosExtrusion):T[] {
  return filas.filter(f=>(!filtros.desde||f.fecha>=filtros.desde)&&(!filtros.hasta||f.fecha<=filtros.hasta)&&(!filtros.maquina||f.maquina===filtros.maquina)&&(!filtros.turno||f.turno===filtros.turno)&&(!filtros.operador||f.operador===filtros.operador))
}

export function leerFiltrosExtrusion(valores:Record<string,string|string[]|undefined>):FiltrosExtrusion {
  const filtros:FiltrosExtrusion={}
  for(const key of ["ot","desde","hasta","maquina","turno","operador"] as const) {
    const valor=valores[key]
    if(typeof valor==="string"&&valor.length<=200) filtros[key]=valor.trim()
  }
  for(const key of ["desde","hasta"] as const) {
    const valor=filtros[key]
    if(valor&&!/^\d{4}-\d{2}-\d{2}$/.test(valor)) throw new Error("El periodo debe tener fechas válidas")
    if(valor&&parseFecha(valor)?.toISOString().slice(0,10)!==valor) throw new Error("El periodo debe tener fechas válidas")
  }
  if(filtros.desde&&filtros.hasta&&filtros.desde>filtros.hasta) throw new Error("La fecha inicial debe ser anterior a la final")
  return filtros
}
