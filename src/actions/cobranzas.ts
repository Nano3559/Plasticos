"use server"

import { getSessionUser } from "@/lib/session"
import { prisma } from "@/lib/prisma"
import { entregaSchema, pagoSchema } from "@/lib/schemas/cobranzas"
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

  const orden = await prisma.ordenTrabajo.findUnique({ where: { id: ordenId }, select: { id: true, kgPedidos: true } })
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
}
