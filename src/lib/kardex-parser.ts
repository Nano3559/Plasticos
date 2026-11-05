import * as XLSX from "xlsx"
import { createHash } from "node:crypto"
import { formatBs, redondear } from "./formato"
import { normalizar, parseFecha, parseNumero, textoCelda } from "./lectura-excel"

/* ───────────────────────────── Tipos ───────────────────────────── */

export type MedioPago = "EFECTIVO" | "TRANSFERENCIA" | "QR" | "OTRO"

export interface Incidencia {
  hoja: string
  /** Número de fila tal como se ve en Excel */
  fila: number
  mensaje: string
}

export interface KardexMovimiento {
  hoja: string
  fila: number
  tipo: "ENTREGA" | "PAGO" | "NOTA"
  /** Solo NOTA: devolución de producto o descuento */
  notaTipo?: "DEVOLUCION" | "DESCUENTO"
  fecha: Date
  fechaIngreso?: Date
  /** N° de orden de trabajo escrito en el Excel (solo entregas) */
  otRef: string
  detalle: string
  medida?: string
  notaRemision?: string
  bultos?: number
  kgEntregados: number
  kgPedidos?: number
  /** Precio por kg usado para valorar la entrega */
  precioUnitario: number
  cargo: number
  abono: number
  saldoExcel: number | null
  observaciones?: string
  medioPago?: MedioPago
}

export interface KardexParsed {
  clienteNombre: string
  direccion?: string
  telefono?: string
  hojas: string[]
  movimientos: KardexMovimiento[]
  errores: Incidencia[]
  avisos: string[]
  totalKg: number
  totalCargo: number
  totalAbono: number
  /** Devoluciones y descuentos (notas de crédito) */
  totalCreditos: number
  saldoCalculado: number
  /** Último saldo escrito en el propio Excel, para conciliar */
  saldoExcel: number | null
}

/* ──────────────────────── Columnas de la plantilla ──────────────────────── */

const COLUMNAS_DEFECTO = {
  fechaIngreso: 0,
  orden: 1,
  cantidadOt: 2,
  producto: 3,
  medida: 4,
  remision: 5,
  fechaEntrega: 6,
  kg: 7,
  bultos: 8,
  precio: 9,
  cargo: 10,
  abono: 11,
  saldo: 12,
  obs: 13,
} as const

type Col = keyof typeof COLUMNAS_DEFECTO
type MapaColumnas = Record<Col, number>

// El orden importa: la primera regla que coincide (y cuya columna aún no se asignó) gana.
const REGLAS_ENCABEZADO: [Col, RegExp][] = [
  ["fechaEntrega", /FECHA.*ENTREGA|ENTREGA.*FECHA/],
  ["fechaIngreso", /FECHA.*(INGRESO|ORDEN|PEDIDO|\bOT\b)|^FECHA$|^INGRESO/],
  ["remision", /REMISION|^NR$|^NOTA/],
  ["orden", /ORDEN|^OT$|^O\.T\.?$|N.*TRABAJO/],
  ["cantidadOt", /CANTIDAD|S\/G|SEGUN/],
  ["producto", /PRODUCTO|DESCRIPCION|DETALLE/],
  ["medida", /MEDIDA|TAMANO/],
  ["kg", /\bKGS?\b|KILO|PESO/],
  ["bultos", /BULTO/],
  ["precio", /PRECIO/],
  ["abono", /PAGO|ABONO/],
  ["cargo", /CREDITO|CARGO|^TOTAL/],
  ["saldo", /SALDO/],
  ["obs", /OBSERV/],
]

function mapearEncabezado(fila: unknown[]): { mapa: Partial<MapaColumnas>; coincidencias: number } {
  const mapa: Partial<MapaColumnas> = {}
  fila.forEach((celda, idx) => {
    const t = normalizar(celda)
    if (!t) return
    for (const [col, regla] of REGLAS_ENCABEZADO) {
      if (mapa[col] === undefined && regla.test(t)) {
        mapa[col] = idx
        return
      }
    }
  })
  return { mapa, coincidencias: Object.keys(mapa).length }
}

function completarConDefecto(parcial: Partial<MapaColumnas>): MapaColumnas {
  const usados = new Set(Object.values(parcial))
  const mapa = { ...parcial } as MapaColumnas
  for (const col of Object.keys(COLUMNAS_DEFECTO) as Col[]) {
    if (mapa[col] === undefined) {
      const idx = COLUMNAS_DEFECTO[col]
      mapa[col] = usados.has(idx) ? -1 : idx
    }
  }
  return mapa
}

/* ───────────────────────────── Utilidades ───────────────────────────── */

export function detectarMedioPago(texto: string): MedioPago {
  // "Pago a cuenta" es el nombre genérico de la columna: no indica transferencia
  const t = normalizar(texto).replace(/\bA\s+CUENTA\b/g, "")
  if (/EFECTIVO|CASH/.test(t)) return "EFECTIVO"
  if (/\bQR\b/.test(t)) return "QR"
  if (/TRANSFERENCIA|DEPOSITO|\bCTA\b|\bCTE\b|CUENTA|CORRIENTE|BANCO|\bBNB\b|\bBCP\b|\bBMSC\b|\bBISA\b/.test(t)) {
    return "TRANSFERENCIA"
  }
  return "OTRO"
}

function normalizarOt(celda: unknown): string {
  if (typeof celda === "number") return String(celda)
  let s = textoCelda(celda)
  for (let i = 0; i < 3; i++) s = s.replace(/^(O\.?T\.?|N[°º.]|NRO\.?|NUM\.?|#)\s*/i, "")
  return s.trim()
}

function nombreDesdeArchivo(nombreArchivo: string): string {
  return nombreArchivo
    .replace(/\.(xlsx|xlsm|xls)$/i, "")
    .replace(/^kardex[\s_-]*/i, "")
    .replace(/\s*\(\d+\)\s*$/, "")
    .replace(/_+/g, " ")
    .trim()
}

const MAX_FILAS = 30000

/* ─────────────────────────── Lectura de una hoja ─────────────────────────── */

interface DatosCliente {
  nombre?: string
  direccion?: string
  telefono?: string
}

interface ResultadoHoja {
  movimientos: KardexMovimiento[]
  errores: Incidencia[]
  avisos: string[]
  cliente: DatosCliente
}

function leerEtiquetas(rows: unknown[][], hasta: number): DatosCliente {
  const cliente: DatosCliente = {}
  const ETIQUETAS: [keyof DatosCliente, RegExp][] = [
    ["nombre", /^(CLIENTE|RAZON SOCIAL|SENOR(ES)?)\b/],
    ["direccion", /^(DIRECCION|DOMICILIO)\b/],
    ["telefono", /^(TELF|TELEFONO|TELEFONOS|CELULAR|CEL|TEL)\b/],
  ]
  // Arriba del bloque del cliente suele estar el membrete de la planta («TELEFONO: 717…»):
  // la dirección y el teléfono solo se leen desde la fila de «Cliente» hacia abajo.
  let filaCliente = -1
  for (let i = 0; i < Math.min(hasta, rows.length) && filaCliente < 0; i++) {
    if ((rows[i] ?? []).some((c) => ETIQUETAS[0][1].test(normalizar(textoCelda(c))))) filaCliente = i
  }
  for (let i = 0; i < Math.min(hasta, rows.length); i++) {
    const row = rows[i] ?? []
    for (let c = 0; c < row.length; c++) {
      const original = textoCelda(row[c])
      if (!original) continue
      const norm = normalizar(original)
      for (const [campo, regla] of ETIQUETAS) {
        if (cliente[campo] || !regla.test(norm)) continue
        if (campo !== "nombre" && i < filaCliente) continue
        // "CLIENTE: Juan Pérez" en una sola celda, o el valor en la celda siguiente
        const despues = original.replace(/^[^:]*:\s*/, "")
        let valor = despues !== original ? despues.trim() : ""
        if (!valor) {
          for (let k = c + 1; k < row.length; k++) {
            const v = textoCelda(row[k])
            if (v) {
              valor = v
              break
            }
          }
        }
        if (valor && !/^(CLIENTE|DIRECCION|TELF|TELEFONO|CELULAR)\b/.test(normalizar(valor))) {
          cliente[campo] = valor
        }
      }
    }
  }
  return cliente
}

function leerHoja(nombreHoja: string, ws: XLSX.WorkSheet, date1904: boolean, forzarPlantilla: boolean): ResultadoHoja | null {
  const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: null, raw: true, blankrows: true })
  if (rows.length === 0) return null
  const offset = ws["!ref"] ? XLSX.utils.decode_range(ws["!ref"]).s.r : 0

  const errores: Incidencia[] = []
  const avisos: string[] = []

  if (rows.length > MAX_FILAS) {
    errores.push({ hoja: nombreHoja, fila: 1, mensaje: `La hoja tiene más de ${MAX_FILAS} filas; divide el archivo.` })
    return { movimientos: [], errores, avisos, cliente: {} }
  }

  // 1. Encabezado de la tabla: la primera fila con al menos 4 títulos reconocidos
  let headerIndex = -1
  let mapaParcial: Partial<MapaColumnas> = {}
  for (let i = 0; i < Math.min(40, rows.length); i++) {
    const { mapa, coincidencias } = mapearEncabezado(rows[i] ?? [])
    if (coincidencias >= 4) {
      headerIndex = i
      mapaParcial = mapa
      break
    }
  }

  if (headerIndex === -1) {
    if (!forzarPlantilla) return null // hoja que no parece un kardex (portada, resumen, etc.)
    headerIndex = 10
    avisos.push(
      `No se encontró la fila de encabezados en la hoja «${nombreHoja}»: se asumió la plantilla estándar (datos desde la fila 12).`
    )
  }
  const cols = completarConDefecto(mapaParcial)
  const faltantes = (["kg", "precio", "cargo", "abono"] as Col[]).filter((c) => cols[c] < 0)
  if (faltantes.length > 0) {
    avisos.push(`En la hoja «${nombreHoja}» no se reconocieron las columnas: ${faltantes.join(", ")}.`)
  }

  const cliente = leerEtiquetas(rows, headerIndex)
  const celdaBase = (row: unknown[], col: Col) => (cols[col] >= 0 ? row[cols[col]] : null)
  const esMedida = (v: unknown) => /\d\s*[xX×*]|[xX×*]\s*\d/.test(textoCelda(v))
  const corridas: number[] = []
  /**
   * A veces se escribe una fila «corrida» una columna a la izquierda: el producto en
   * «Cantidad S/G OT», la medida en «Producto» y los kg pedidos en «Medida». Se detecta
   * cuando «Cantidad» tiene texto que no es número y «Producto» parece una medida (35x80).
   */
  const filaCorrida = (row: unknown[]) => {
    const cant = celdaBase(row, "cantidadOt")
    const prod = celdaBase(row, "producto")
    const med = celdaBase(row, "medida")
    return (
      cols.cantidadOt >= 0 && cols.producto >= 0 && cols.medida >= 0 &&
      typeof cant === "string" && parseNumero(cant) === null && /[A-Za-zÁÉÍÓÚáéíóúÑñ]{3,}/.test(cant) &&
      esMedida(prod) && !esMedida(cant) &&
      (med === null || med === undefined || textoCelda(med) === "" || parseNumero(med) !== null)
    )
  }
  let filaActual: unknown[] = []
  let corridaActual = false
  const celda = (row: unknown[], col: Col) => {
    if (row !== filaActual) {
      filaActual = row
      corridaActual = filaCorrida(row)
    }
    if (corridaActual) {
      if (col === "producto") return celdaBase(row, "cantidadOt")
      if (col === "medida") return celdaBase(row, "producto")
      if (col === "cantidadOt") return celdaBase(row, "medida")
    }
    return celdaBase(row, col)
  }

  // 2. Filas de datos
  const movimientos: KardexMovimiento[] = []
  const anioActual = new Date().getFullYear()

  for (let i = headerIndex + 1; i < rows.length; i++) {
    const row = rows[i]
    if (!row || row.every((c) => c === null || c === undefined || textoCelda(c) === "")) continue

    const fila = offset + i + 1
    const textos = row.filter((c) => typeof c === "string").map((c) => normalizar(c))

    // Encabezado repetido, totales y separadores de gestión
    if (textos.some((t) => /^(SUB)?TOTAL(ES)?\b/.test(t))) continue
    if (mapearEncabezado(row).coincidencias >= 4) continue
    if (textos.some((t) => /^GESTION\b/.test(t))) continue
    if (textos.some((t) => /SALDO\s+(ANTERIOR|INICIAL|PREVIO|ARRASTRE|DE GESTION)|SALDO\s+A\s+FAVOR/.test(t))) {
      const monto = parseNumero(celda(row, "saldo")) ?? parseNumero(celda(row, "cargo")) ?? parseNumero(celda(row, "abono"))
      avisos.push(
        `Fila ${fila} («${nombreHoja}»): es un saldo inicial${monto !== null ? ` de ${formatBs(monto)}` : ""} y no se importa. Si el cliente arrastra esa deuda, regístrala como entrega aparte.`
      )
      continue
    }

    // Valores numéricos: lo que está escrito pero no se entiende es un error, no un cero
    const invalidos: string[] = []
    const leerNum = (col: Col, etiqueta: string) => {
      const v = celda(row, col)
      const n = parseNumero(v)
      if (n === null && v !== null && v !== undefined && textoCelda(v) !== "") {
        invalidos.push(`${etiqueta} «${textoCelda(v)}»`)
      }
      return n
    }
    const kgLeido = leerNum("kg", "Kg entregados")
    const precioLeido = leerNum("precio", "Precio unitario")
    const cargoLeido = leerNum("cargo", "Total crédito")
    const abonoLeido = leerNum("abono", "Pago a cuenta")
    // Bultos y cantidad de la OT son informativos: si no se entienden, se avisa pero la fila se importa
    const leerInformativo = (col: Col, etiqueta: string) => {
      const v = celda(row, col)
      const n = parseNumero(v)
      if (n === null && v !== null && v !== undefined && textoCelda(v) !== "") {
        avisos.push(`Fila ${fila} («${nombreHoja}»): ${etiqueta} «${textoCelda(v)}» no es un número; se importa sin ese dato.`)
      }
      return n
    }
    const bultosLeido = leerInformativo("bultos", "los bultos")
    const cantidadOt = leerInformativo("cantidadOt", "la cantidad de la OT")
    const saldoExcel = parseNumero(celda(row, "saldo"))

    if (invalidos.length > 0) {
      errores.push({ hoja: nombreHoja, fila, mensaje: `Valor no numérico: ${invalidos.join(", ")}.` })
      continue
    }
    if ((abonoLeido ?? 0) < 0) {
      errores.push({ hoja: nombreHoja, fila, mensaje: "Pago negativo: si es una devolución de dinero al cliente, regístrala a mano." })
      continue
    }

    const textoOrden = textoCelda(celda(row, "orden"))
    const producto = textoCelda(celda(row, "producto"))
    const obs = textoCelda(celda(row, "obs")) || undefined
    const fechaEntregaCelda = celda(row, "fechaEntrega")
    const fechaIngresoCelda = celda(row, "fechaIngreso")
    const fechaEntrega = parseFecha(fechaEntregaCelda, date1904)
    const fechaIngreso = parseFecha(fechaIngresoCelda, date1904)
    const escrita = (v: unknown) => v !== null && v !== undefined && textoCelda(v) !== ""

    const cargo0 = cargoLeido ?? 0
    const abono0 = abonoLeido ?? 0
    const kg0 = kgLeido ?? 0
    const textoFila = normalizar(`${textoOrden} ${producto} ${obs ?? ""}`)
    const palabraNota = /\bDEVOL|DEVUELT|NOTA\s+DE\s+CREDITO|\bN\.?\s?C\.?\b|DESCUENTO|BONIFICACION|REBAJA/.test(textoFila)

    // ── NOTA DE CRÉDITO: kg o total negativos (devolución escrita en negativo), o una fila
    // de «pago» cuyo texto dice devolución / descuento / nota de crédito ──
    const negativa = cargo0 < 0 || kg0 < 0
    const notaEnPago = abono0 > 0 && palabraNota && !/^PAGO\b/.test(normalizar(textoOrden))
    if (negativa || notaEnPago) {
      const fechaNota = fechaEntrega ?? fechaIngreso
      if (!fechaNota) {
        errores.push({ hoja: nombreHoja, fila, mensaje: "La devolución o descuento no tiene fecha." })
        continue
      }
      const kgNota = Math.abs(kg0)
      let monto = negativa ? Math.abs(cargo0) : abono0
      if (negativa && monto === 0) {
        if ((precioLeido ?? 0) <= 0) {
          errores.push({ hoja: nombreHoja, fila, mensaje: "Devolución en kg sin precio ni total: no se sabe cuánto descontar." })
          continue
        }
        monto = kgNota * (precioLeido ?? 0)
      }
      const esDevolucion = kgNota > 0 || /\bDEVOL|DEVUELT/.test(textoFila)
      movimientos.push({
        hoja: nombreHoja,
        fila,
        tipo: "NOTA",
        notaTipo: esDevolucion ? "DEVOLUCION" : "DESCUENTO",
        fecha: fechaNota,
        otRef: normalizarOt(celda(row, "orden")),
        detalle: (notaEnPago ? textoOrden : producto || textoOrden) || (esDevolucion ? "Devolución" : "Descuento"),
        notaRemision: textoCelda(celda(row, "remision")) || undefined,
        kgEntregados: redondear(kgNota),
        precioUnitario: kgNota > 0 ? redondear(monto / kgNota, 4) : 0,
        cargo: 0,
        abono: redondear(monto),
        saldoExcel,
        observaciones: obs,
      })
      continue
    }

    // ── PAGO ──
    if (abono0 > 0 || (/\b(PAGO|ABONO)\b/.test(normalizar(textoOrden)) && cargo0 === 0 && kg0 === 0)) {
      if (abono0 <= 0) {
        errores.push({ hoja: nombreHoja, fila, mensaje: "Fila de pago sin importe en «Pago a cuenta»." })
        continue
      }
      if (cargo0 > 0) {
        errores.push({ hoja: nombreHoja, fila, mensaje: "La fila tiene crédito y pago a la vez; sepárala en dos filas." })
        continue
      }
      const fechaPago = fechaIngreso ?? fechaEntrega
      if (!fechaPago) {
        const raw = escrita(fechaIngresoCelda) ? fechaIngresoCelda : fechaEntregaCelda
        errores.push({
          hoja: nombreHoja,
          fila,
          mensaje: escrita(raw) ? `Fecha ilegible «${textoCelda(raw)}». Usa el formato dd/mm/aaaa.` : "El pago no tiene fecha.",
        })
        continue
      }
      movimientos.push({
        hoja: nombreHoja,
        fila,
        tipo: "PAGO",
        fecha: fechaPago,
        otRef: "",
        detalle: textoOrden || producto || obs || "Pago a cuenta",
        notaRemision: textoCelda(celda(row, "remision")) || undefined,
        kgEntregados: 0,
        precioUnitario: 0,
        cargo: 0,
        abono: redondear(abono0),
        saldoExcel,
        observaciones: obs,
        medioPago: detectarMedioPago(`${textoOrden} ${producto} ${obs ?? ""}`),
      })
      continue
    }

    // ── ENTREGA ──
    if (cargo0 > 0 || kg0 > 0) {
      const fechaEnt = fechaEntrega ?? fechaIngreso
      if (!fechaEnt) {
        const raw = escrita(fechaEntregaCelda) ? fechaEntregaCelda : fechaIngresoCelda
        errores.push({
          hoja: nombreHoja,
          fila,
          mensaje: escrita(raw) ? `Fecha ilegible «${textoCelda(raw)}». Usa el formato dd/mm/aaaa.` : "La entrega no tiene fecha.",
        })
        continue
      }

      let kg = kg0
      let cargo = cargo0
      let precio = precioLeido ?? 0

      if (kg > 0 && cargo > 0) {
        const esperado = kg * precio
        const tolerancia = Math.max(0.05, cargo * 0.001)
        if (!(precio > 0 && Math.abs(esperado - cargo) <= tolerancia)) {
          // El total no sale de kg × precio (descuento, redondeo, precio faltante): se valora con el precio efectivo
          const efectivo = redondear(cargo / kg, 4)
          if (precio > 0) {
            avisos.push(
              `Fila ${fila} («${nombreHoja}»): el total ${formatBs(cargo)} no es kg × precio (${formatBs(esperado)}); se valoró con el precio efectivo de ${formatBs(efectivo, 4)}/kg.`
            )
          }
          precio = efectivo
        }
      } else if (kg > 0) {
        if (precio <= 0) {
          errores.push({ hoja: nombreHoja, fila, mensaje: "La entrega no tiene precio ni total crédito." })
          continue
        }
        cargo = redondear(kg * precio)
      } else {
        if (precio <= 0) {
          errores.push({ hoja: nombreHoja, fila, mensaje: "Hay un total crédito pero no se sabe cuántos kg ni a qué precio." })
          continue
        }
        kg = redondear(cargo / precio)
        avisos.push(`Fila ${fila} («${nombreHoja}»): no tenía kg; se calcularon ${kg} kg a partir del total y el precio.`)
      }

      const anio = fechaEnt.getUTCFullYear()
      if (anio < 2010 || anio > anioActual + 1) {
        avisos.push(`Fila ${fila} («${nombreHoja}»): la fecha ${fechaEnt.toISOString().slice(0, 10)} es inusual, revísala.`)
      }

      if (corridaActual) corridas.push(fila)
      if (obs && /DEVOL|DEVUEL|NOTA DE CREDITO|DESCUENT/.test(normalizar(obs))) {
        avisos.push(
          `Fila ${fila} («${nombreHoja}»): la observación dice «${obs}». La devolución no está descontada en el Excel ni se descuenta al importar; si corresponde, regístrala a mano.`
        )
      }

      movimientos.push({
        hoja: nombreHoja,
        fila,
        tipo: "ENTREGA",
        fecha: fechaEnt,
        fechaIngreso: fechaIngreso ?? undefined,
        otRef: normalizarOt(celda(row, "orden")),
        detalle: producto || "Entrega de bolsas plásticas",
        medida: textoCelda(celda(row, "medida")) || undefined,
        notaRemision: textoCelda(celda(row, "remision")) || undefined,
        bultos: bultosLeido && bultosLeido > 0 ? redondear(bultosLeido) : undefined,
        kgEntregados: redondear(kg),
        kgPedidos: cantidadOt && cantidadOt > 0 ? cantidadOt : undefined,
        precioUnitario: precio,
        cargo: redondear(cargo),
        abono: 0,
        saldoExcel,
        observaciones: obs,
      })
      continue
    }

    // Fila con texto pero sin importes (un saldo suelto no se avisa)
    if (textoOrden || producto) {
      avisos.push(`Fila ${fila} («${nombreHoja}»): se omitió porque no tiene kg ni importes.`)
    }
  }

  if (corridas.length > 0) {
    avisos.unshift(
      `${corridas.length === 1 ? "La fila" : "Las filas"} ${corridas.join(", ")} («${nombreHoja}») ${corridas.length === 1 ? "tenía" : "tenían"} el producto en la columna «Cantidad S/G OT» y la medida en «Producto» (columnas corridas): se leyeron acomodadas.`
    )
  }

  // Fechas fuera de secuencia: casi siempre un error de tipeo (01/01 en vez de 01/10).
  // No cambia los totales, pero sí la antigüedad de la deuda, así que se avisa.
  for (let k = 1; k < movimientos.length - 1; k++) {
    const antes = movimientos[k - 1].fecha.getTime()
    const despues = movimientos[k + 1].fecha.getTime()
    const f = movimientos[k].fecha.getTime()
    const DIA = 86_400_000
    if (antes <= despues && (f < antes - 31 * DIA || f > despues + 31 * DIA)) {
      const m = movimientos[k]
      avisos.push(
        `Fila ${m.fila} («${nombreHoja}»): la fecha ${m.fecha.toISOString().slice(0, 10).split("-").reverse().join("/")} está fuera de orden (la fila anterior es del ${new Date(antes).toISOString().slice(0, 10).split("-").reverse().join("/")} y la siguiente del ${new Date(despues).toISOString().slice(0, 10).split("-").reverse().join("/")}). Probablemente es un error de tipeo: corrígela en el Excel antes de importar.`
      )
    }
  }

  return { movimientos, errores, avisos, cliente }
}

/* ─────────────────────────── Punto de entrada ─────────────────────────── */

export function parseKardexBuffer(data: ArrayBuffer | Uint8Array, nombreArchivo: string): KardexParsed {
  const wb = XLSX.read(data instanceof Uint8Array ? data : new Uint8Array(data), { type: "array" })
  const date1904 = Boolean(wb.Workbook?.WBProps?.date1904)

  const movimientos: KardexMovimiento[] = []
  const errores: Incidencia[] = []
  const avisos: string[] = []
  const hojas: string[] = []
  let cliente: DatosCliente = {}

  const acumular = (nombre: string, r: ResultadoHoja) => {
    hojas.push(nombre)
    movimientos.push(...r.movimientos)
    errores.push(...r.errores)
    avisos.push(...r.avisos)
    cliente = {
      nombre: cliente.nombre ?? r.cliente.nombre,
      direccion: cliente.direccion ?? r.cliente.direccion,
      telefono: cliente.telefono ?? r.cliente.telefono,
    }
  }

  // Se leen todas las hojas que parecen un kardex (cada gestión suele ir en su hoja)
  for (const nombre of wb.SheetNames) {
    const r = leerHoja(nombre, wb.Sheets[nombre], date1904, false)
    if (r) acumular(nombre, r)
  }

  // Ninguna hoja tenía encabezados reconocibles: se intenta la plantilla estándar con la primera hoja
  if (hojas.length === 0 && wb.SheetNames.length > 0) {
    const nombre = wb.SheetNames[0]
    const r = leerHoja(nombre, wb.Sheets[nombre], date1904, true)
    if (r) acumular(nombre, r)
  }

  if (hojas.length === 0) {
    errores.push({ hoja: "", fila: 0, mensaje: "El archivo no tiene hojas con datos." })
  } else if (hojas.length > 1) {
    avisos.push(`Se leyeron ${hojas.length} hojas: ${hojas.join(", ")}.`)
  }

  let clienteNombre = cliente.nombre?.trim() ?? ""
  if (!clienteNombre) {
    clienteNombre = nombreDesdeArchivo(nombreArchivo) || (hojas[0] ?? "").trim()
    if (clienteNombre) {
      avisos.push(`No se encontró la etiqueta «Cliente» en el Excel: se usó «${clienteNombre}» (nombre del archivo).`)
    }
  }

  // Cronológico y estable; el saldo se recalcula desde cero
  const ordenados = movimientos
    .map((m, i) => ({ m, i }))
    .sort((a, b) => a.m.fecha.getTime() - b.m.fecha.getTime() || a.i - b.i)
    .map((x) => x.m)

  let totalKg = 0
  let totalCargo = 0
  let totalAbono = 0
  let totalCreditos = 0
  for (const m of ordenados) {
    if (m.tipo === "NOTA") {
      totalKg -= m.kgEntregados
      totalCreditos += m.abono
      continue
    }
    totalKg += m.kgEntregados
    totalCargo += m.cargo
    totalAbono += m.abono
  }
  const saldoCalculado = redondear(totalCargo - totalAbono - totalCreditos)

  // Último saldo que escribió la persona en el Excel, en el orden original de la hoja
  const conSaldo = movimientos.filter((m) => m.saldoExcel !== null)
  const saldoExcel = conSaldo.length > 0 ? conSaldo[conSaldo.length - 1].saldoExcel : null

  if (saldoExcel !== null && errores.length === 0) {
    const tolerancia = Math.max(1, ordenados.length * 0.05)
    const dif = redondear(saldoExcel - saldoCalculado)
    if (Math.abs(dif) > tolerancia) {
      avisos.push(
        `El saldo final escrito en el Excel (${formatBs(saldoExcel)}) no coincide con el calculado (${formatBs(saldoCalculado)}); diferencia de ${formatBs(dif)}. Revisa saldos iniciales, filas omitidas o fórmulas del archivo.`
      )
    }
  }

  return {
    clienteNombre,
    direccion: cliente.direccion,
    telefono: cliente.telefono,
    hojas,
    movimientos: ordenados,
    errores,
    avisos,
    totalKg: redondear(totalKg),
    totalCargo: redondear(totalCargo),
    totalAbono: redondear(totalAbono),
    totalCreditos: redondear(totalCreditos),
    saldoCalculado,
    saldoExcel,
  }
}

/* ───────────────────── Plan de importación (idempotente) ───────────────────── */

export interface PlanEntrega {
  key: string
  fecha: Date
  notaRemision?: string
  kgEntregados: number
  bultos?: number
}

export interface PlanOrden {
  key: string
  ref: string
  producto: string
  medida?: string
  kgPedidos: number
  precioUnitario: number
  fechaIngreso: Date
  estado: "ENTREGADA" | "TERMINADA"
  mezclaNota?: string
  entregas: PlanEntrega[]
}

export interface PlanNota {
  key: string
  fecha: Date
  tipo: "DEVOLUCION" | "DESCUENTO"
  monto: number
  kg?: number
  motivo: string
  notaRemision?: string
  /** Clave de la OT del mismo archivo con ese N° de orden (para enlazar la devolución) */
  ordenKey?: string
}

export interface PlanPago {
  key: string
  fecha: Date
  monto: number
  medio: MedioPago
  referencia: string
}

const hash = (s: string) => "k1_" + createHash("sha1").update(s).digest("hex").slice(0, 32)
const dia = (d: Date) => d.toISOString().slice(0, 10)

/**
 * Agrupa las entregas por orden de trabajo y asigna a cada fila una clave estable.
 * Con esas claves, importar dos veces el mismo archivo no duplica nada, y un archivo
 * ampliado solo agrega las filas nuevas.
 */
export function planificarImportacion(
  parsed: Pick<KardexParsed, "movimientos">,
  clienteId: string
): { ordenes: PlanOrden[]; pagos: PlanPago[]; notas: PlanNota[] } {
  type Acumulada = PlanOrden & { kgPedidosFila: number }
  const ordenes = new Map<string, Acumulada>()
  const pagos: PlanPago[] = []
  const notasPendientes: (PlanNota & { otRef: string })[] = []
  const repeticiones = new Map<string, number>()
  const contar = (base: string) => {
    const n = (repeticiones.get(base) ?? 0) + 1
    repeticiones.set(base, n)
    return n
  }

  for (const m of parsed.movimientos) {
    if (m.tipo === "NOTA") {
      const base = `N|${clienteId}|${dia(m.fecha)}|${m.abono.toFixed(2)}|${m.kgEntregados.toFixed(2)}|${normalizar(m.detalle)}`
      notasPendientes.push({
        key: hash(`${base}|${contar(base)}`),
        fecha: m.fecha,
        tipo: m.notaTipo ?? "DESCUENTO",
        monto: m.abono,
        kg: m.kgEntregados > 0 ? m.kgEntregados : undefined,
        motivo: [m.detalle, m.observaciones].filter(Boolean).join(" · ").slice(0, 300) || "Importado del kardex",
        notaRemision: m.notaRemision,
        otRef: m.otRef,
      })
      continue
    }
    if (m.tipo === "PAGO") {
      const base = `P|${clienteId}|${dia(m.fecha)}|${m.abono.toFixed(2)}|${normalizar(m.detalle)}`
      pagos.push({
        key: hash(`${base}|${contar(base)}`),
        fecha: m.fecha,
        monto: m.abono,
        medio: m.medioPago ?? "OTRO",
        referencia: m.detalle,
      })
      continue
    }

    const ref = m.otRef || `sin-ot:${dia(m.fecha)}:${normalizar(m.detalle)}:${normalizar(m.medida ?? "")}`
    const claveOt = hash(`OT|${clienteId}|${normalizar(ref)}|${m.precioUnitario.toFixed(4)}`)
    let ot = ordenes.get(claveOt)
    if (!ot) {
      ot = {
        key: claveOt,
        ref: m.otRef,
        producto: m.detalle,
        medida: m.medida,
        kgPedidos: 0,
        precioUnitario: m.precioUnitario,
        fechaIngreso: m.fechaIngreso ?? m.fecha,
        estado: "TERMINADA",
        mezclaNota: m.observaciones,
        entregas: [],
        kgPedidosFila: 0,
      }
      ordenes.set(claveOt, ot)
    }
    ot.kgPedidosFila = Math.max(ot.kgPedidosFila, m.kgPedidos ?? 0)
    if (m.fechaIngreso && m.fechaIngreso < ot.fechaIngreso) ot.fechaIngreso = m.fechaIngreso

    const base = `E|${claveOt}|${dia(m.fecha)}|${m.notaRemision ?? ""}|${m.kgEntregados.toFixed(2)}|${m.bultos ?? ""}`
    ot.entregas.push({
      key: hash(`${base}|${contar(base)}`),
      fecha: m.fecha,
      notaRemision: m.notaRemision,
      kgEntregados: m.kgEntregados,
      bultos: m.bultos,
    })
  }

  const resultado: PlanOrden[] = []
  for (const { kgPedidosFila, ...ot } of ordenes.values()) {
    const entregado = ot.entregas.reduce((s, e) => s + e.kgEntregados, 0)
    ot.kgPedidos = redondear(kgPedidosFila > 0 ? kgPedidosFila : entregado)
    ot.estado = entregado >= ot.kgPedidos - 0.5 ? "ENTREGADA" : "TERMINADA"
    resultado.push(ot)
  }
  // La devolución se enlaza con la OT del mismo N° (si está en el archivo)
  const notas: PlanNota[] = notasPendientes.map(({ otRef, ...n }) => {
    const ot = otRef ? resultado.find((o) => normalizar(o.ref) === normalizar(otRef)) : undefined
    return ot ? { ...n, ordenKey: ot.key } : n
  })
  return { ordenes: resultado, pagos, notas }
}
