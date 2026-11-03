"use server"

import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { parseKardexBuffer } from "@/lib/kardex-parser"
import { revalidatePath } from "next/cache"
import { MedioPago } from "@prisma/client"

export async function importarKardexArchivos(formData: FormData) {
  const session = await auth()
  if (!session?.user) throw new Error("No autorizado")

  const files = formData.getAll("archivos") as File[]
  if (!files || files.length === 0) {
    throw new Error("No se seleccionaron archivos")
  }

  const resultados: {
    nombre: string
    entregas: number
    pagos: number
    saldoFinal: number
    exito: boolean
    error?: string
  }[] = []

  for (const file of files) {
    if (!file.name.endsWith(".xlsx")) continue

    try {
      const buffer = await file.arrayBuffer()
      const parsed = parseKardexBuffer(buffer, file.name)

      // 1. Crear o actualizar Cliente
      let cliente = await prisma.cliente.findFirst({
        where: {
          nombre: {
            equals: parsed.clienteNombre,
            mode: "insensitive",
          },
        },
      })

      if (!cliente) {
        cliente = await prisma.cliente.create({
          data: {
            nombre: parsed.clienteNombre,
            direccion: parsed.direccion || null,
            telefono: parsed.telefono || null,
            diasCredito: 15,
          },
        })
      } else {
        await prisma.cliente.update({
          where: { id: cliente.id },
          data: {
            direccion: cliente.direccion || parsed.direccion || null,
            telefono: cliente.telefono || parsed.telefono || null,
          },
        })
      }

      let countEntregas = 0
      let countPagos = 0

      // 2. Procesar movimientos
      for (const mov of parsed.movimientos) {
        if (mov.tipo === "ENTREGA") {
          const kg = mov.kgEntregados || 0
          const precio = mov.precioUnitario || (kg > 0 ? mov.cargo / kg : 40)

          const ot = await prisma.ordenTrabajo.create({
            data: {
              clienteId: cliente.id,
              producto: mov.detalle,
              medida: mov.medida || null,
              kgPedidos: kg > 0 ? kg : 100,
              precioUnitario: precio > 0 ? precio : 40,
              estado: "ABIERTA",
              mezclaNota: mov.observaciones || null,
            },
          })

          await prisma.entrega.create({
            data: {
              ordenId: ot.id,
              notaRemision: mov.notaRemision || null,
              fecha: mov.fecha,
              kgEntregados: kg,
              bultos: mov.bultos || null,
            },
          })
          countEntregas++
        } else if (mov.tipo === "PAGO") {
          await prisma.pago.create({
            data: {
              clienteId: cliente.id,
              monto: mov.abono,
              fecha: mov.fecha,
              medio: (mov.medioPago as MedioPago) || MedioPago.OTRO,
              referencia: mov.detalle,
            },
          })
          countPagos++
        }
      }

      resultados.push({
        nombre: parsed.clienteNombre,
        entregas: countEntregas,
        pagos: countPagos,
        saldoFinal: parsed.saldoFinal,
        exito: true,
      })
    } catch (err: any) {
      resultados.push({
        nombre: file.name,
        entregas: 0,
        pagos: 0,
        saldoFinal: 0,
        exito: false,
        error: err.message || "Error al procesar archivo",
      })
    }
  }

  revalidatePath("/cobranzas")
  revalidatePath("/cobranzas/kardex")
  revalidatePath("/cobranzas/cartera")
  return resultados
}

export async function obtenerKardexCompleto(clienteId: string) {
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
    },
  })

  if (!cliente) return null

  type ItemKardex = {
    id: string
    fecha: Date
    tipo: "ENTREGA" | "PAGO"
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
        documento: `OT #${o.numero}${e.notaRemision ? ` • NR #${e.notaRemision}` : ""}`,
        detalle: o.producto,
        medida: o.medida || undefined,
        kgEntregados: kg,
        precioUnitario: precio,
        bultos: e.bultos || undefined,
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

  // Ordenar cronológicamente
  items.sort((a, b) => a.fecha.getTime() - b.fecha.getTime())

  // Calcular saldo progresivo
  let saldoAcum = 0
  let totalCargos = 0
  let totalAbonos = 0
  let totalKg = 0

  for (const it of items) {
    saldoAcum += it.cargo - it.abono
    totalCargos += it.cargo
    totalAbonos += it.abono
    if (it.kgEntregados) totalKg += it.kgEntregados
    it.saldo = Math.round(saldoAcum * 100) / 100
  }

  return {
    cliente,
    movimientos: items,
    totalCargos: Math.round(totalCargos * 100) / 100,
    totalAbonos: Math.round(totalAbonos * 100) / 100,
    totalKg: Math.round(totalKg * 100) / 100,
    saldoActual: Math.round(saldoAcum * 100) / 100,
  }
}
