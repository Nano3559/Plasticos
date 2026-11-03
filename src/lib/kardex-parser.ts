import * as XLSX from "xlsx"

export interface KardexMovimiento {
  fecha: Date
  tipo: "ENTREGA" | "PAGO"
  documento?: string
  detalle: string
  medida?: string
  notaRemision?: string
  bultos?: number
  kgEntregados?: number
  precioUnitario?: number
  cargo: number // Total Crédito (+)
  abono: number // Pago a Cuenta (-)
  saldo: number // Saldo acumulado
  observaciones?: string
  medioPago?: "EFECTIVO" | "TRANSFERENCIA" | "QR" | "OTRO"
}

export interface KardexClienteParsed {
  clienteNombre: string
  direccion?: string
  telefono?: string
  totalEntregadoKg: number
  totalCargo: number
  totalAbono: number
  saldoFinal: number
  movimientos: KardexMovimiento[]
}

function parseExcelDate(val: any): Date {
  if (!val) return new Date()
  if (val instanceof Date) return val
  if (typeof val === "number" && val > 20000) {
    // Serial date de Excel
    const dateUtc = new Date((val - 25569) * 86400 * 1000)
    // Ajustar offset para evitar desfases de zona horaria
    const userOffset = dateUtc.getTimezoneOffset() * 60000
    return new Date(dateUtc.getTime() + userOffset)
  }
  if (typeof val === "string") {
    const parsed = new Date(val)
    if (!isNaN(parsed.getTime())) return parsed
  }
  return new Date()
}

function detectarMedioPago(detalle: string): "EFECTIVO" | "TRANSFERENCIA" | "QR" | "OTRO" {
  const upper = detalle.toUpperCase()
  if (upper.includes("EFECTIVO")) return "EFECTIVO"
  if (
    upper.includes("TRANSFERENCIA") ||
    upper.includes("CTA.") ||
    upper.includes("CUENTA") ||
    upper.includes("CORRIENTE")
  ) {
    return "TRANSFERENCIA"
  }
  if (upper.includes("QR")) return "QR"
  return "OTRO"
}

export function parseKardexBuffer(buffer: Buffer | ArrayBuffer, fileNameFallback?: string): KardexClienteParsed {
  const wb = XLSX.read(buffer, { type: "buffer" })
  const sheetName = wb.SheetNames[0]
  const ws = wb.Sheets[sheetName]
  const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 })

  // 1. Extraer datos del cliente (Filas 2 a 7 comúnmente)
  let clienteNombre = ""
  let direccion = ""
  let telefono = ""

  for (let i = 0; i < Math.min(10, rows.length); i++) {
    const row = rows[i]
    if (!row) continue

    const cell0 = String(row[0] || "").toUpperCase()
    const cell1 = String(row[1] || "").trim()

    if (cell0.includes("CLIENTE") && cell1) {
      clienteNombre = cell1
    } else if (cell0.includes("DIRECCION") && cell1) {
      direccion = cell1
    } else if ((cell0.includes("TELF") || cell0.includes("CELULAR") || cell0.includes("TELEFONO")) && cell1) {
      telefono = cell1
    }
  }

  // Fallbacks para el nombre
  if (!clienteNombre) {
    if (fileNameFallback) {
      clienteNombre = fileNameFallback.replace(/\.xlsx$/i, "").trim()
    } else {
      clienteNombre = sheetName.trim()
    }
  }

  // 2. Encontrar la fila de cabecera de la tabla
  let headerIndex = -1
  for (let i = 0; i < Math.min(25, rows.length); i++) {
    const row = rows[i]
    if (!row) continue
    const rowStr = row.map((c) => String(c || "").toUpperCase()).join(" ")
    if (
      (rowStr.includes("FECHA") && rowStr.includes("ORDEN")) ||
      rowStr.includes("TOTAL CREDITO") ||
      rowStr.includes("PAGO A CUENTA")
    ) {
      headerIndex = i
      break
    }
  }

  if (headerIndex === -1) {
    headerIndex = 10 // Índice por defecto según la plantilla estándar
  }

  // 3. Procesar movimientos
  const movimientos: KardexMovimiento[] = []
  let totalCargo = 0
  let totalAbono = 0
  let totalEntregadoKg = 0
  let saldoAcumulado = 0

  for (let i = headerIndex + 1; i < rows.length; i++) {
    const row = rows[i]
    if (!row || row.length === 0) continue

    const col0 = row[0] // Fecha ingreso
    const col1 = row[1] // N° Orden de Trabajo o detalle de pago
    const col2 = row[2] // Cantidad s/g OT
    const col3 = row[3] // Producto
    const col4 = row[4] // Medida
    const col5 = row[5] // Nota de remisión
    const col6 = row[6] // Fecha entrega
    const col7 = row[7] // Kg entregados
    const col8 = row[8] // Bultos
    const col9 = row[9] // Precio unitario
    const col10 = row[10] // Total Crédito (Cargo)
    const col11 = row[11] // Pago a Cuenta (Abono)
    const col12 = row[12] // Saldo
    const col13 = row[13] // Observaciones

    const textoCol1 = String(col1 || "").trim()
    const textoCol3 = String(col3 || "").trim()

    // Omitir filas separadoras de gestión o totales
    if (
      textoCol3.includes("GESTION") ||
      String(col7 || "").includes("TOTAL") ||
      String(col6 || "").includes("TOTAL")
    ) {
      continue
    }

    const valorCargo = parseFloat(col10) || 0
    const valorAbono = parseFloat(col11) || 0
    const kgEntregados = parseFloat(col7) || 0

    // Caso A: Es un Pago / Abono
    if (valorAbono > 0 || (textoCol1.toUpperCase().includes("PAGO") && valorCargo === 0)) {
      const fecha = parseExcelDate(col0 || col6)
      const abono = valorAbono
      totalAbono += abono
      saldoAcumulado -= abono

      movimientos.push({
        fecha,
        tipo: "PAGO",
        documento: col5 ? `NR #${col5}` : undefined,
        detalle: textoCol1 || "Abono / Pago a cuenta",
        cargo: 0,
        abono,
        saldo: typeof col12 === "number" ? col12 : saldoAcumulado,
        medioPago: detectarMedioPago(textoCol1),
        observaciones: col13 ? String(col13).trim() : undefined,
      })
    }
    // Caso B: Es una Entrega / Venta a Crédito
    else if (valorCargo > 0 || kgEntregados > 0) {
      const fecha = parseExcelDate(col6 || col0)
      const cargo = valorCargo > 0 ? valorCargo : kgEntregados * (parseFloat(col9) || 0)
      totalCargo += cargo
      totalEntregadoKg += kgEntregados
      saldoAcumulado += cargo

      const otDoc = textoCol1 ? `OT ${textoCol1}` : undefined
      const nrDoc = col5 ? `NR #${col5}` : undefined
      const docLabel = [otDoc, nrDoc].filter(Boolean).join(" • ")

      movimientos.push({
        fecha,
        tipo: "ENTREGA",
        documento: docLabel || undefined,
        detalle: textoCol3 || "Entrega de bolsas plásticas",
        medida: col4 ? String(col4).trim() : undefined,
        notaRemision: col5 ? String(col5).trim() : undefined,
        bultos: col8 ? parseInt(col8, 10) : undefined,
        kgEntregados,
        precioUnitario: parseFloat(col9) || undefined,
        cargo,
        abono: 0,
        saldo: typeof col12 === "number" ? col12 : saldoAcumulado,
        observaciones: col13 ? String(col13).trim() : undefined,
      })
    }
  }

  // Ordenar cronológicamente ascendente
  movimientos.sort((a, b) => a.fecha.getTime() - b.fecha.getTime())

  // Recalcular saldo progresivo garantizado
  let saldoCorregido = 0
  for (const m of movimientos) {
    saldoCorregido += m.cargo - m.abono
    m.saldo = Math.round(saldoCorregido * 100) / 100
  }

  return {
    clienteNombre,
    direccion: direccion || undefined,
    telefono: telefono || undefined,
    totalEntregadoKg: Math.round(totalEntregadoKg * 100) / 100,
    totalCargo: Math.round(totalCargo * 100) / 100,
    totalAbono: Math.round(totalAbono * 100) / 100,
    saldoFinal: Math.round(saldoCorregido * 100) / 100,
    movimientos,
  }
}
