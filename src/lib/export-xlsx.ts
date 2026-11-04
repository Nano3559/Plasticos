import { NextResponse } from "next/server"
import * as XLSX from "xlsx"
import { getSessionUser } from "@/lib/session"

/** Verifica sesión y rol. Devuelve la respuesta de error, o null si todo está bien. */
export async function exigirRolReportes(): Promise<NextResponse | null> {
  const user = await getSessionUser()
  if (!user) return new NextResponse("No autorizado", { status: 401 })
  if (user.rol !== "GERENCIA" && user.rol !== "ADMIN") return new NextResponse("Sin permisos", { status: 403 })
  return null
}

/** Excel con anchos de columna razonables y las columnas de dinero con formato de 2 decimales. */
export function respuestaXlsx(nombre: string, hoja: string, filas: Record<string, string | number>[]) {
  const ws = XLSX.utils.json_to_sheet(filas)
  if (filas.length > 0) {
    const columnas = Object.keys(filas[0])
    ws["!cols"] = columnas.map((c) => ({
      wch: Math.min(40, Math.max(c.length, ...filas.map((f) => String(f[c] ?? "").length)) + 2),
    }))
    // Columnas con "(Bs" en el título: formato #,##0.00
    const rango = XLSX.utils.decode_range(ws["!ref"]!)
    columnas.forEach((c, col) => {
      if (!/\(Bs/.test(c)) return
      for (let fila = rango.s.r + 1; fila <= rango.e.r; fila++) {
        const celda = ws[XLSX.utils.encode_cell({ r: fila, c: col })]
        if (celda && typeof celda.v === "number") celda.z = "#,##0.00"
      }
    })
  }
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, hoja)
  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" })
  const fecha = new Date().toISOString().slice(0, 10)
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename=${nombre}_${fecha}.xlsx`,
    },
  })
}
