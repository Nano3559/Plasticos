"use server"

import { getSessionUser } from "@/lib/session"
import { prisma } from "@/lib/prisma"
import { clienteSchema, ordenTrabajoSchema, registroProduccionSchema } from "@/lib/schemas/produccion"
import { revalidatePath } from "next/cache"
import { fail } from "@/lib/action-result"

export async function crearCliente(formData: FormData) {
  const user = await getSessionUser()
  if (!user) return fail("No autorizado")

  const rol = user.rol
  if (rol !== "ADMIN" && rol !== "GERENCIA") return fail("Sin permisos")

  const raw = Object.fromEntries(formData.entries())
  const parsed = clienteSchema.safeParse(raw)

  if (!parsed.success) {
    return fail(parsed.error.issues[0].message)
  }

  await prisma.cliente.create({
    data: parsed.data,
  })

  revalidatePath("/produccion/clientes")
}

export async function crearOrdenTrabajo(formData: FormData) {
  const user = await getSessionUser()
  if (!user) return fail("No autorizado")

  const rol = user.rol
  if (rol !== "ADMIN" && rol !== "GERENCIA") return fail("Sin permisos")

  const raw = Object.fromEntries(formData.entries())
  const parsed = ordenTrabajoSchema.safeParse(raw)

  if (!parsed.success) {
    return fail(parsed.error.issues[0].message)
  }

  await prisma.ordenTrabajo.create({
    data: parsed.data,
  })

  revalidatePath("/produccion/ordenes")
}

export async function registrarProduccion(formData: FormData) {
  const user = await getSessionUser()
  if (!user) return fail("No autorizado")

  const rol = user.rol
  if (rol !== "OPERADOR" && rol !== "ADMIN" && rol !== "GERENCIA") {
    return fail("Sin permisos")
  }

  const raw = Object.fromEntries(formData.entries())
  const parsed = registroProduccionSchema.safeParse(raw)

  if (!parsed.success) {
    return fail(parsed.error.issues[0].message)
  }

  const data = parsed.data

  const orden = await prisma.ordenTrabajo.findUnique({ where: { id: data.ordenId }, select: { estado: true } })
  if (!orden) return fail("La orden de trabajo no existe")
  if (orden.estado !== "ABIERTA") return fail("La orden está cerrada. Reábrela para registrar producción.")

  await prisma.registroProduccion.create({
    data: {
      ...data,
      userId: user.id,
    },
  })

  revalidatePath("/produccion")
  revalidatePath(`/produccion/ordenes/${data.ordenId}`)
}

export async function cambiarEstadoOrden(ordenId: string, estado: string) {
  const user = await getSessionUser()
  if (!user) return fail("No autorizado")

  const rol = user.rol
  if (rol !== "ADMIN" && rol !== "GERENCIA") return fail("Sin permisos")
  if (estado !== "ABIERTA" && estado !== "TERMINADA" && estado !== "ENTREGADA") return fail("Estado no válido")

  await prisma.ordenTrabajo.update({
    where: { id: ordenId },
    data: { estado },
  })

  revalidatePath("/produccion")
  revalidatePath("/produccion/ordenes")
  revalidatePath(`/produccion/ordenes/${ordenId}`)
}
