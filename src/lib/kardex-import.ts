import { randomUUID } from "node:crypto"

import { prisma } from "@/lib/prisma"
import { parseKardexBuffer, planificarImportacion, type Incidencia, type KardexParsed } from "@/lib/kardex-parser"
import { normalizar } from "@/lib/lectura-excel"
import { redondear } from "@/lib/formato"

export const MAX_ARCHIVOS = 40
const MAX_BYTES = 8 * 1024 * 1024

export type ResultadoArchivo = {
  archivo: string
  /** listo: se puede importar · revision: tiene filas con error · sin-cambios: ya estaba importado · importado · error */
  estado: "listo" | "revision" | "sin-cambios" | "importado" | "error"
  cliente: string
  clienteNuevo: boolean
  hojas: string[]
  /** Filas nuevas que se agregan (o se agregaron) */
  entregas: number
  pagos: number
  /** Filas que ya estaban en el sistema y se omiten */
  duplicadas: number
  kg: number
  cargo: number
  abono: number
  saldoCalculado: number
  saldoExcel: number | null
  /** Saldo del cliente en el sistema después de importar */
  saldoSistema: number | null
  errores: Incidencia[]
  avisos: string[]
  mensaje?: string
}

export type ClienteMin = { id: string; nombre: string; direccion: string | null; telefono: string | null }

function vacio(archivo: string): ResultadoArchivo {
  return {
    archivo, estado: "error", cliente: "", clienteNuevo: false, hojas: [], entregas: 0, pagos: 0, duplicadas: 0,
    kg: 0, cargo: 0, abono: 0, saldoCalculado: 0, saldoExcel: null, saldoSistema: null, errores: [], avisos: [],
  }
}

async function saldoDelCliente(db: Pick<typeof prisma, "entrega" | "pago">, clienteId: string) {
  const [entregas, pagos] = await Promise.all([
    db.entrega.findMany({
      where: { orden: { clienteId } },
      select: { kgEntregados: true, orden: { select: { precioUnitario: true } } },
    }),
    db.pago.aggregate({ where: { clienteId }, _sum: { monto: true } }),
  ])
  const cargo = entregas.reduce((s, e) => s + Number(e.kgEntregados) * Number(e.orden.precioUnitario), 0)
  return redondear(cargo - Number(pagos._sum.monto ?? 0))
}

function resumen(archivo: string, parsed: KardexParsed): ResultadoArchivo {
  return {
    ...vacio(archivo),
    cliente: parsed.clienteNombre,
    hojas: parsed.hojas,
    kg: parsed.totalKg,
    cargo: parsed.totalCargo,
    abono: parsed.totalAbono,
    saldoCalculado: parsed.saldoCalculado,
    saldoExcel: parsed.saldoExcel,
    errores: parsed.errores,
    avisos: parsed.avisos,
  }
}

export async function procesarArchivo(
  file: File,
  clientes: Map<string, ClienteMin>,
  guardar: boolean,
  permitirParcial: boolean
): Promise<ResultadoArchivo> {
  const base = vacio(file.name)
  if (!/\.(xlsx|xlsm|xls)$/i.test(file.name)) return { ...base, mensaje: "Formato no soportado: sube archivos de Excel (.xlsx)." }
  if (file.size === 0) return { ...base, mensaje: "El archivo está vacío." }
  if (file.size > MAX_BYTES) return { ...base, mensaje: `El archivo pesa más de ${MAX_BYTES / 1024 / 1024} MB.` }

  let parsed: KardexParsed
  try {
    parsed = parseKardexBuffer(await file.arrayBuffer(), file.name)
  } catch {
    return { ...base, mensaje: "No se pudo leer el archivo. Puede estar dañado, protegido con contraseña o no ser un Excel válido." }
  }

  const r = resumen(file.name, parsed)
  if (parsed.movimientos.length === 0) {
    return { ...r, estado: parsed.errores.length > 0 ? "revision" : "error", mensaje: parsed.errores.length > 0 ? undefined : "No se encontró ninguna entrega ni pago en el archivo." }
  }

  const existente = clientes.get(normalizar(parsed.clienteNombre))
  r.clienteNuevo = !existente

  // Cuántas filas ya están en el sistema (solo si el cliente ya existe)
  const plan0 = planificarImportacion(parsed, existente?.id ?? "nuevo")
  const totalEntregas = plan0.ordenes.reduce((s, o) => s + o.entregas.length, 0)
  let entregasYa = 0
  let pagosYa = 0
  if (existente) {
    const [e, p] = await Promise.all([
      prisma.entrega.count({ where: { origenKey: { in: plan0.ordenes.flatMap((o) => o.entregas.map((x) => x.key)) } } }),
      prisma.pago.count({ where: { origenKey: { in: plan0.pagos.map((x) => x.key) } } }),
    ])
    entregasYa = e
    pagosYa = p
  }
  r.entregas = totalEntregas - entregasYa
  r.pagos = plan0.pagos.length - pagosYa
  r.duplicadas = entregasYa + pagosYa

  const conErrores = parsed.errores.length > 0
  if (!guardar) {
    r.estado = conErrores ? "revision" : r.entregas + r.pagos === 0 ? "sin-cambios" : "listo"
    if (existente) r.saldoSistema = await saldoDelCliente(prisma, existente.id)
    return r
  }

  if (conErrores && !permitirParcial) {
    return { ...r, estado: "revision", mensaje: "No se importó: corrige las filas con error o importa solo las filas válidas." }
  }
  if (r.entregas + r.pagos === 0) return { ...r, estado: "sin-cambios", mensaje: "Todo este archivo ya estaba importado.", saldoSistema: existente ? await saldoDelCliente(prisma, existente.id) : null }

  try {
    const resultado = await prisma.$transaction(
      async (tx) => {
        let cliente = existente
        if (!cliente) {
          cliente = await tx.cliente.create({
            data: { nombre: parsed.clienteNombre, direccion: parsed.direccion ?? null, telefono: parsed.telefono ?? null, diasCredito: 15 },
            select: { id: true, nombre: true, direccion: true, telefono: true },
          })
        } else if ((!cliente.direccion && parsed.direccion) || (!cliente.telefono && parsed.telefono)) {
          await tx.cliente.update({
            where: { id: cliente.id },
            data: { direccion: cliente.direccion ?? parsed.direccion ?? null, telefono: cliente.telefono ?? parsed.telefono ?? null },
          })
        }

        const plan = planificarImportacion(parsed, cliente.id)

        // Órdenes: se reutilizan las ya importadas y solo se crean las que faltan
        const ya = await tx.ordenTrabajo.findMany({
          where: { origenKey: { in: plan.ordenes.map((o) => o.key) } },
          select: { id: true, origenKey: true },
        })
        const idPorClave = new Map(ya.map((o) => [o.origenKey as string, o.id]))
        const nuevas = plan.ordenes.filter((o) => !idPorClave.has(o.key))
        if (nuevas.length > 0) {
          await tx.ordenTrabajo.createMany({
            data: nuevas.map((o) => {
              const id = randomUUID()
              idPorClave.set(o.key, id)
              return {
                id,
                clienteId: cliente!.id,
                fechaIngreso: o.fechaIngreso,
                producto: o.producto,
                medida: o.medida ?? null,
                kgPedidos: o.kgPedidos,
                precioUnitario: o.precioUnitario,
                estado: o.estado,
                mezclaNota: o.mezclaNota ?? null,
                origenKey: o.key,
                refExterna: o.ref || null,
              }
            }),
          })
        }

        const entregas = await tx.entrega.createMany({
          data: plan.ordenes.flatMap((o) =>
            o.entregas.map((e) => ({
              ordenId: idPorClave.get(o.key)!,
              notaRemision: e.notaRemision ?? null,
              fecha: e.fecha,
              kgEntregados: e.kgEntregados,
              bultos: e.bultos ?? null,
              origenKey: e.key,
            }))
          ),
          skipDuplicates: true,
        })
        const pagos = await tx.pago.createMany({
          data: plan.pagos.map((p) => ({
            clienteId: cliente!.id,
            monto: p.monto,
            fecha: p.fecha,
            medio: p.medio,
            referencia: p.referencia,
            origenKey: p.key,
          })),
          skipDuplicates: true,
        })

        // Las órdenes ya existentes pueden haber completado su entrega con las filas nuevas
        for (const o of plan.ordenes) {
          const id = idPorClave.get(o.key)!
          if (!ya.some((x) => x.id === id)) continue
          const [orden, entregado] = await Promise.all([
            tx.ordenTrabajo.findUnique({ where: { id }, select: { kgPedidos: true, estado: true } }),
            tx.entrega.aggregate({ where: { ordenId: id }, _sum: { kgEntregados: true } }),
          ])
          if (!orden || orden.estado === "ABIERTA") continue
          const completa = Number(entregado._sum.kgEntregados ?? 0) >= Number(orden.kgPedidos) - 0.5
          const estado = completa ? "ENTREGADA" : "TERMINADA"
          if (estado !== orden.estado) await tx.ordenTrabajo.update({ where: { id }, data: { estado } })
        }

        return {
          cliente,
          entregas: entregas.count,
          pagos: pagos.count,
          saldoSistema: await saldoDelCliente(tx, cliente.id),
          totalEntregas: plan.ordenes.reduce((s, o) => s + o.entregas.length, 0),
          totalPagos: plan.pagos.length,
        }
      },
      { timeout: 60_000, maxWait: 10_000 }
    )

    clientes.set(normalizar(resultado.cliente.nombre), resultado.cliente)
    return {
      ...r,
      estado: "importado",
      entregas: resultado.entregas,
      pagos: resultado.pagos,
      duplicadas: resultado.totalEntregas - resultado.entregas + (resultado.totalPagos - resultado.pagos),
      saldoSistema: resultado.saldoSistema,
    }
  } catch (e) {
    console.error("Error importando kardex", file.name, e)
    return { ...r, estado: "error", mensaje: "No se pudo guardar en la base de datos. No se importó nada de este archivo; inténtalo de nuevo." }
  }
}

