"use server"

import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { clienteSchema, ordenTrabajoSchema, registroProduccionSchema } from "@/lib/schemas/produccion"
import { revalidatePath } from "next/cache"

export async function crearCliente(formData: FormData) {
  const session = await auth()
  if (!session?.user) throw new Error("No autorizado")

  const rol = (session.user as any).rol
  if (rol !== "ADMIN" && rol !== "GERENCIA") throw new Error("Sin permisos")

  const raw = Object.fromEntries(formData.entries())
  const parsed = clienteSchema.safeParse(raw)

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0].message)
  }

  await prisma.cliente.create({
    data: parsed.data,
  })

  revalidatePath("/produccion/clientes")
}

export async function crearOrdenTrabajo(formData: FormData) {
  const session = await auth()
  if (!session?.user) throw new Error("No autorizado")

  const rol = (session.user as any).rol
  if (rol !== "ADMIN" && rol !== "GERENCIA") throw new Error("Sin permisos")

  const raw = Object.fromEntries(formData.entries())
  const parsed = ordenTrabajoSchema.safeParse(raw)

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0].message)
  }

  await prisma.ordenTrabajo.create({
    data: parsed.data,
  })

  revalidatePath("/produccion/ordenes")
}

export async function registrarProduccion(formData: FormData) {
  const session = await auth()
  if (!session?.user) throw new Error("No autorizado")

  const rol = (session.user as any).rol
  if (rol !== "OPERADOR" && rol !== "ADMIN" && rol !== "GERENCIA") {
    throw new Error("Sin permisos")
  }

  const raw = Object.fromEntries(formData.entries())
  const parsed = registroProduccionSchema.safeParse(raw)

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0].message)
  }

  const data = parsed.data

  await prisma.registroProduccion.create({
    data: {
      ...data,
      userId: (session.user as any).id,
    },
  })

  revalidatePath("/produccion")
  revalidatePath(`/produccion/ordenes/${data.ordenId}`)
}

export async function cambiarEstadoOrden(ordenId: string, estado: string) {
  const session = await auth()
  if (!session?.user) throw new Error("No autorizado")

  const rol = (session.user as any).rol
  if (rol !== "ADMIN" && rol !== "GERENCIA") throw new Error("Sin permisos")

  await prisma.ordenTrabajo.update({
    where: { id: ordenId },
    data: { estado },
  })

  revalidatePath("/produccion")
  revalidatePath("/produccion/ordenes")
  revalidatePath(`/produccion/ordenes/${ordenId}`)
}
