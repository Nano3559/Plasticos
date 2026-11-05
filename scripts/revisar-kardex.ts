/**
 * Revisa una carpeta completa de kardex en Excel SIN tocar la base de datos.
 * Usa el mismo lector que la pantalla de importación y te dice, archivo por archivo,
 * si está listo, qué filas hay que corregir y si el saldo cuadra con el del Excel.
 *
 *   npm run kardex:revisar -- "C:\\Users\\yo\\Documents\\Kardex"
 */
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs"
import { basename, join } from "node:path"
import { parseKardexBuffer } from "../src/lib/kardex-parser"

const args = process.argv.slice(2)
const carpeta = args.find((a) => !a.startsWith("--"))
if (!carpeta) {
  console.error('Uso: npm run kardex:revisar -- "<carpeta con los Excel>"')
  process.exit(1)
}

const archivos = (statSync(carpeta).isDirectory() ? readdirSync(carpeta).map((f) => join(carpeta, f)) : [carpeta])
  .filter((f) => /\.(xlsx|xlsm|xls)$/i.test(f) && !basename(f).startsWith("~$"))
  .sort()

const bs = (n: number | null) => (n === null ? "—" : n.toLocaleString("es-BO", { minimumFractionDigits: 2, maximumFractionDigits: 2 }))
const filasCsv: string[] = ["archivo;cliente;estado;entregas;pagos;kg;saldo_calculado;saldo_excel;errores;avisos;detalle"]
let listos = 0
let revisar = 0

for (const ruta of archivos) {
  const nombre = basename(ruta)
  let estado = "LISTO"
  let linea = ""
  try {
    const r = parseKardexBuffer(readFileSync(ruta), nombre)
    const entregas = r.movimientos.filter((m) => m.tipo === "ENTREGA").length
    const pagos = r.movimientos.filter((m) => m.tipo === "PAGO").length
    const notas = r.movimientos.filter((m) => m.tipo === "NOTA").length
    const cuadra = r.saldoExcel === null || Math.abs(r.saldoExcel - r.saldoCalculado) <= Math.max(1, r.movimientos.length * 0.05)
    // Una fecha fuera de orden no rompe el saldo, pero sí la antigüedad de la deuda: se corrige antes
    const fechaRara = r.avisos.some((a) => /fuera de orden/.test(a))
    if (r.errores.length > 0 || !cuadra || r.movimientos.length === 0 || fechaRara) estado = "REVISAR"
    else if (r.avisos.length > 0) estado = "LISTO (con avisos)"
    linea = `${estado.padEnd(19)} ${nombre}\n    ${r.clienteNombre} · ${entregas} entregas · ${pagos} pagos${notas ? ` · ${notas} devoluciones/descuentos` : ""} · saldo ${bs(r.saldoCalculado)} (Excel: ${bs(r.saldoExcel)})${cuadra ? "" : "  ← NO CUADRA"}`
    for (const e of r.errores) linea += `\n    ✖ fila ${e.fila}: ${e.mensaje}`
    for (const a of r.avisos) linea += `\n    · ${a}`
    filasCsv.push(
      [nombre, r.clienteNombre, estado, entregas, pagos, r.totalKg, r.saldoCalculado, r.saldoExcel ?? "", r.errores.length, r.avisos.length,
        [...r.errores.map((e) => `fila ${e.fila}: ${e.mensaje}`), ...r.avisos].join(" | ")]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(";")
    )
  } catch {
    estado = "REVISAR"
    linea = `REVISAR             ${nombre}\n    ✖ No se pudo leer: puede estar dañado, protegido con contraseña o no ser un Excel.`
    filasCsv.push(`"${nombre}";"";"REVISAR";;;;;;1;0;"No se pudo leer el archivo"`)
  }
  if (estado === "REVISAR") revisar++
  else listos++
  console.log(linea + "\n")
}

const salida = join(statSync(carpeta).isDirectory() ? carpeta : ".", "revision-kardex.csv")
writeFileSync(salida, "\ufeff" + filasCsv.join("\n"))
console.log(`${archivos.length} archivos: ${listos} listos para importar, ${revisar} para revisar.`)
console.log(`Resumen en Excel: ${salida}`)
