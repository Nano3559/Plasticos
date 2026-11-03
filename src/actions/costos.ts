"use server"

import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { costoTurnoSchema } from "@/lib/schemas/costos"
import { revalidatePath } from "next/cache"

export async function registrarCostoTurno(formData: FormData) {
  const session = await auth()
  if (!session?.user) throw new Error("No autorizado")

  const rol = (session.user as any).rol
  if (rol !== "ADMIN" && rol !== "GERENCIA") throw new Error("Sin permisos")

  const raw = Object.fromEntries(formData.entries())
  const parsed = costoTurnoSchema.safeParse(raw)

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0].message)
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
