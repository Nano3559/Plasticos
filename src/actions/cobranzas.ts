"use server"

import { getSessionUser } from "@/lib/session"
import { prisma } from "@/lib/prisma"
import { entregaSchema, notaCreditoSchema, pagoSchema } from "@/lib/schemas/cobranzas"
import { redondear } from "@/lib/formato"
import { revalidatePath } from "next/cache"
import { fail } from "@/lib/action-result"

export async function registrarEntrega(formData: FormData) {
  const user = await getSessionUser()
  if (!user) return fail("No autorizado")

  const rol = user.rol
  if (rol !== "ADMIN" && rol !== "GERENCIA") return fail("Sin permisos")

  const raw = Object.fromEntries(formData.entries())
  const parsed = entregaSchema.safeParse(raw)

  if (!parsed.success) {
    return fail(parsed.error.issues[0].message)
  }

  const { ordenId, notaRemision, fecha, kgEntregados, bultos } = parsed.data

  const orden = await prisma.ordenTrabajo.findUnique({ where: { id: ordenId }, select: { id: true, kgPedidos: true, clienteId: true } })
  if (!orden) return fail("La orden de trabajo no existe")

  await prisma.$transaction(async (tx) => {
    await tx.entrega.create({
      data: {
        ordenId,
        notaRemision: notaRemision || null,
        fecha: fecha ? new Date(fecha) : new Date(),
        kgEntregados,
        bultos: bultos || null,
      },
    })
    // Cuando lo entregado alcanza lo pedido, la orden pasa a ENTREGADA
    const entregado = await tx.entrega.aggregate({ where: { ordenId }, _sum: { kgEntregados: true } })
    if (Number(entregado._sum.kgEntregados ?? 0) >= Number(orden.kgPedidos) - 0.5) {
      await tx.ordenTrabajo.update({ where: { id: ordenId }, data: { estado: "ENTREGADA" } })
    }
  })

  revalidatePath("/cobranzas")
  revalidatePath("/produccion/ordenes")
  revalidatePath(`/cobranzas/cliente/${orden.clienteId}`)
  return { ok: true as const, clienteId: orden.clienteId }
}

export async function registrarPago(formData: FormData) {
  const user = await getSessionUser()
  if (!user) return fail("No autorizado")

  const rol = user.rol
  if (rol !== "ADMIN" && rol !== "GERENCIA") return fail("Sin permisos")

  const raw = Object.fromEntries(formData.entries())
  const parsed = pagoSchema.safeParse(raw)

  if (!parsed.success) {
    return fail(parsed.error.issues[0].message)
  }

  const { clienteId, ordenId, monto, fecha, medio, referencia } = parsed.data

  if (ordenId) {
    const orden = await prisma.ordenTrabajo.findUnique({ where: { id: ordenId }, select: { clienteId: true } })
    if (!orden || orden.clienteId !== clienteId) return fail("La orden elegida no pertenece a este cliente")
  }

  await prisma.pago.create({
    data: {
      clienteId,
      ordenId: ordenId || null,
      monto,
      fecha: fecha ? new Date(fecha) : new Date(),
      medio,
      referencia: referencia || null,
    },
  })

  revalidatePath("/cobranzas")
  revalidatePath(`/cobranzas/cliente/${clienteId}`)
  return { ok: true as const, clienteId }
}

/**
 * Devolución (kg × precio de la OT) o descuento (monto). Rebaja la deuda del cliente sin contar
 * como cobro. No se edita ni se borra: si se registró mal, se corrige con otra nota o un descuento.
 */
export async function registrarNotaCredito(formData: FormData) {
  const user = await getSessionUser()
  if (!user) return fail("No autorizado")
  if (user.rol !== "ADMIN" && user.rol !== "GERENCIA") return fail("Sin permisos")

  const parsed = notaCreditoSchema.safeParse(Object.fromEntries(formData.entries()))
  if (!parsed.success) return fail(parsed.error.issues[0].message)
  const { clienteId, tipo, ordenId, kg, monto, fecha, motivo, notaRemision } = parsed.data

  const cliente = await prisma.cliente.findUnique({ where: { id: clienteId }, select: { id: true } })
  if (!cliente) return fail("El cliente no existe")

  let montoFinal: number
  let kgFinal: number | null = null
  let ordenFinal: string | null = null

  if (tipo === "DEVOLUCION") {
    const orden = await prisma.ordenTrabajo.findUnique({
      where: { id: ordenId! },
      select: {
        clienteId: true,
        numero: true,
        precioUnitario: true,
        entregas: { select: { kgEntregados: true } },
        notasCredito: { where: { tipo: "DEVOLUCION", anuladaEn: null }, select: { kg: true } },
      },
    })
    if (!orden || orden.clienteId !== clienteId) return fail("La orden elegida no pertenece a este cliente")
    const entregado = orden.entregas.reduce((s, e) => s + Number(e.kgEntregados), 0)
    const yaDevuelto = orden.notasCredito.reduce((s, n) => s + Number(n.kg ?? 0), 0)
    const disponible = redondear(entregado - yaDevuelto)
    if (kg! > disponible + 0.005) {
      return fail(
        disponible <= 0
          ? `De la OT #${orden.numero} ya se devolvió todo lo entregado.`
          : `De la OT #${orden.numero} se pueden devolver como máximo ${disponible.toLocaleString("es-BO")} kg (entregados menos lo ya devuelto).`
      )
    }
    kgFinal = redondear(kg!)
    montoFinal = redondear(kgFinal * Number(orden.precioUnitario))
    ordenFinal = ordenId!
  } else {
    montoFinal = redondear(monto!)
    if (ordenId) {
      const orden = await prisma.ordenTrabajo.findUnique({ where: { id: ordenId }, select: { clienteId: true } })
      if (!orden || orden.clienteId !== clienteId) return fail("La orden elegida no pertenece a este cliente")
      ordenFinal = ordenId
    }
  }

  await prisma.notaCredito.create({
    data: {
      clienteId,
      ordenId: ordenFinal,
      tipo,
      kg: kgFinal,
      monto: montoFinal,
      fecha: fecha ? new Date(fecha) : new Date(),
      motivo,
      notaRemision: notaRemision || null,
      userId: user.id,
    },
  })

  revalidatePath("/cobranzas")
  revalidatePath("/dashboard")
  return { ok: true as const, monto: montoFinal }
}

/** Solo Gerencia: la nota queda en el historial marcada como anulada y deja de rebajar la deuda. */
export async function anularNotaCredito(id: string, motivo: string) {
  const user = await getSessionUser()
  if (!user) return fail("No autorizado")
  if (user.rol !== "GERENCIA") return fail("Solo Gerencia puede anular una devolución o descuento.")
  const texto = motivo.trim()
  if (texto.length < 3) return fail("Escribe por qué se anula.")

  const nota = await prisma.notaCredito.findUnique({ where: { id }, select: { anuladaEn: true } })
  if (!nota) return fail("La nota no existe.")
  if (nota.anuladaEn) return fail("Esta nota ya estaba anulada.")

  await prisma.notaCredito.update({ where: { id }, data: { anuladaEn: new Date(), anuladaMotivo: `${texto} (anuló ${user.name})` } })
  revalidatePath("/cobranzas")
  revalidatePath("/dashboard")
  return { ok: true as const }
}

