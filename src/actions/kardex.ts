"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { getSessionUser } from "@/lib/session"
import { fail, type ActionError } from "@/lib/action-result"
import { MAX_ARCHIVOS, procesarArchivo, type ClienteMin, type ResultadoArchivo } from "@/lib/kardex-import"
import { normalizar } from "@/lib/lectura-excel"

async function procesar(
  formData: FormData,
  guardar: boolean
): Promise<{ resultados: ResultadoArchivo[] } | ActionError> {
  const user = await getSessionUser()
  if (!user) return fail("Tu sesión venció. Vuelve a iniciar sesión.")
  if (user.rol !== "ADMIN" && user.rol !== "GERENCIA") return fail("Solo Administración y Gerencia pueden importar kardex.")

  const archivos = formData.getAll("archivos").filter((f): f is File => typeof f === "object" && f !== null && "arrayBuffer" in f)
  if (archivos.length === 0) return fail("No se seleccionaron archivos.")
  if (archivos.length > MAX_ARCHIVOS) return fail(`Sube como máximo ${MAX_ARCHIVOS} archivos a la vez.`)
  const permitirParcial = formData.get("permitirParcial") === "1"

  const lista = await prisma.cliente.findMany({ select: { id: true, nombre: true, direccion: true, telefono: true } })
  const clientes = new Map<string, ClienteMin>(lista.map((c) => [normalizar(c.nombre), c]))

  const resultados: ResultadoArchivo[] = []
  // Uno por uno: dos archivos del mismo cliente no deben crear el cliente dos veces
  for (const file of archivos) resultados.push(await procesarArchivo(file, clientes, guardar, permitirParcial))

  if (guardar) {
    for (const ruta of ["/cobranzas", "/cobranzas/kardex", "/cobranzas/cartera", "/produccion/ordenes", "/produccion/clientes", "/dashboard", "/reportes"]) {
      revalidatePath(ruta)
    }
  }
  return { resultados }
}

/** Paso 1: lee los archivos y muestra qué pasaría, sin guardar nada. */
export async function analizarKardex(formData: FormData) {
  return procesar(formData, false)
}

/** Paso 2: guarda. Cada archivo va en su propia transacción: o entra completo o no entra. */
export async function importarKardex(formData: FormData) {
  return procesar(formData, true)
}

export async function obtenerKardexCompleto(clienteId: string) {
  // Al estar en un archivo "use server", esta función es un endpoint público: hay que validar sesión y rol.
  const user = await getSessionUser()
  if (!user || (user.rol !== "ADMIN" && user.rol !== "GERENCIA")) return null

  const cliente = await prisma.cliente.findUnique({
    where: { id: clienteId },
    include: {
      ordenes: {
        include: {
          entregas: true,
        },
      },
      pagos: {
        orderBy: { fecha: "asc" },
      },
      notasCredito: {
        orderBy: { fecha: "asc" },
        include: { orden: { select: { numero: true, refExterna: true } }, user: { select: { nombre: true } } },
      },
    },
  })

  if (!cliente) return null

  type ItemKardex = {
    id: string
    fecha: Date
    tipo: "ENTREGA" | "PAGO" | "DEVOLUCION" | "DESCUENTO"
    documento: string
    detalle: string
    medida?: string
    kgEntregados?: number
    precioUnitario?: number
    bultos?: number
    cargo: number
    abono: number
    saldo: number
    referencia?: string
    /** Notas de crédito: id para anular, y si ya está anulada no rebaja el saldo */
    notaId?: string
    anulada?: boolean
    anuladaMotivo?: string
  }

  const items: ItemKardex[] = []

  // Recopilar entregas (Cargos)
  for (const o of cliente.ordenes) {
    const precio = Number(o.precioUnitario)
    for (const e of o.entregas) {
      const kg = Number(e.kgEntregados)
      const cargo = kg * precio
      items.push({
        id: e.id,
        fecha: new Date(e.fecha),
        tipo: "ENTREGA",
        documento: `OT ${o.refExterna ?? `#${o.numero}`}${e.notaRemision ? ` • NR ${e.notaRemision}` : ""}`,
        detalle: o.producto,
        medida: o.medida || undefined,
        kgEntregados: kg,
        precioUnitario: precio,
        bultos: e.bultos ? Number(e.bultos) : undefined,
        cargo,
        abono: 0,
        saldo: 0,
      })
    }
  }

  // Recopilar pagos (Abonos)
  for (const p of cliente.pagos) {
    const abono = Number(p.monto)
    items.push({
      id: p.id,
      fecha: new Date(p.fecha),
      tipo: "PAGO",
      documento: p.medio,
      detalle: p.referencia || `Pago recibido (${p.medio})`,
      cargo: 0,
      abono,
      saldo: 0,
      referencia: p.referencia || undefined,
    })
  }

  // Devoluciones y descuentos (rebajan el saldo; las anuladas se muestran pero no cuentan)
  for (const n of cliente.notasCredito) {
    const anulada = !!n.anuladaEn
    items.push({
      id: n.id,
      fecha: new Date(n.fecha),
      tipo: n.tipo,
      documento: [n.orden ? `OT ${n.orden.refExterna ?? `#${n.orden.numero}`}` : null, n.notaRemision ? `NR ${n.notaRemision}` : null]
        .filter(Boolean)
        .join(" • ") || (n.tipo === "DEVOLUCION" ? "Devolución" : "Descuento"),
      detalle: `${n.motivo}${n.user ? ` · registró ${n.user.nombre}` : ""}`,
      kgEntregados: n.kg ? -Number(n.kg) : undefined,
      cargo: 0,
      abono: anulada ? 0 : Number(n.monto),
      saldo: 0,
      notaId: n.id,
      anulada,
      anuladaMotivo: n.anuladaMotivo ?? undefined,
    })
  }

  // Ordenar cronológicamente
  items.sort((a, b) => a.fecha.getTime() - b.fecha.getTime())

  // Calcular saldo progresivo
  let saldoAcum = 0
  let totalCargos = 0
  let totalAbonos = 0
  let totalCreditos = 0
  let totalKg = 0

  for (const it of items) {
    saldoAcum += it.cargo - it.abono
    totalCargos += it.cargo
    if (it.tipo === "PAGO") totalAbonos += it.abono
    else totalCreditos += it.abono
    if (it.kgEntregados) totalKg += it.kgEntregados
    it.saldo = Math.round(saldoAcum * 100) / 100
  }

  return {
    cliente,
    movimientos: items,
    totalCargos: Math.round(totalCargos * 100) / 100,
    totalAbonos: Math.round(totalAbonos * 100) / 100,
    totalCreditos: Math.round(totalCreditos * 100) / 100,
    totalKg: Math.round(totalKg * 100) / 100,
    saldoActual: Math.round(saldoAcum * 100) / 100,
  }
}
