"use server"

import { getSessionUser } from "@/lib/session"
import { prisma } from "@/lib/prisma"
import { costoTurnoSchema } from "@/lib/schemas/costos"
import { revalidatePath } from "next/cache"
import { fail } from "@/lib/action-result"

export async function registrarCostoTurno(formData: FormData) {
  const user = await getSessionUser()
  if (!user) return fail("No autorizado")

  const rol = user.rol
  if (rol !== "ADMIN" && rol !== "GERENCIA") return fail("Sin permisos")

  const raw = Object.fromEntries(formData.entries())
  const parsed = costoTurnoSchema.safeParse(raw)

  if (!parsed.success) {
    return fail(parsed.error.issues[0].message)
  }

  const { fecha, turno, manoObra, energia } = parsed.data

  await prisma.costoTurno.upsert({
    where: {
      fecha_turno: {
        fecha: new Date(fecha),
        turno,
      },
    },
    update: {
      manoObra,
      energia,
    },
    create: {
      fecha: new Date(fecha),
      turno,
      manoObra,
      energia,
    },
  })

  revalidatePath("/costos")
}
