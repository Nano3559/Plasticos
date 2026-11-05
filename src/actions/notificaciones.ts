"use server"

import { revalidatePath } from "next/cache"
import { getSessionUser } from "@/lib/session"
import { prisma } from "@/lib/prisma"
import { fail } from "@/lib/action-result"

/** Marca un aviso como leído. Solo el destinatario puede hacerlo. */
export async function marcarLeida(id: string) {
  const user = await getSessionUser()
  if (!user) return fail("No autorizado")
  if (typeof id !== "string" || !id) return fail("Aviso inválido")
  await prisma.notificacion.updateMany({ where: { id, userId: user.id, leidaEn: null }, data: { leidaEn: new Date() } })
  revalidatePath("/notificaciones")
  return { ok: true as const }
}

export async function marcarTodasLeidas() {
  const user = await getSessionUser()
  if (!user) return fail("No autorizado")
  const { count } = await prisma.notificacion.updateMany({
    where: { userId: user.id, leidaEn: null },
    data: { leidaEn: new Date() },
  })
  revalidatePath("/notificaciones")
  return { ok: true as const, count }
}
