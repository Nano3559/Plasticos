"use server"

import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { entregaSchema, pagoSchema } from "@/lib/schemas/cobranzas"
import { revalidatePath } from "next/cache"

export async function registrarEntrega(formData: FormData) {
  const session = await auth()
  if (!session?.user) throw new Error("No autorizado")

  const rol = (session.user as any).rol
  if (rol !== "ADMIN" && rol !== "GERENCIA") throw new Error("Sin permisos")

  const raw = Object.fromEntries(formData.entries())
  const parsed = entregaSchema.safeParse(raw)

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0].message)
  }

  const { ordenId, notaRemision, fecha, kgEntregados, bultos } = parsed.data

  await prisma.entrega.create({
    data: {
      ordenId,
      notaRemision: notaRemision || null,
      fecha: fecha ? new Date(fecha) : new Date(),
      kgEntregados,
      bultos: bultos || null,
    },
  })

  revalidatePath("/cobranzas")
}

export async function registrarPago(formData: FormData) {
  const session = await auth()
  if (!session?.user) throw new Error("No autorizado")

  const rol = (session.user as any).rol
  if (rol !== "ADMIN" && rol !== "GERENCIA") throw new Error("Sin permisos")

  const raw = Object.fromEntries(formData.entries())
  const parsed = pagoSchema.safeParse(raw)

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0].message)
  }

  const { clienteId, ordenId, monto, fecha, medio, referencia } = parsed.data

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
