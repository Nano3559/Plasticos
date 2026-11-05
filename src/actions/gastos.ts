"use server"

import { revalidatePath } from "next/cache"
import { getSessionUser } from "@/lib/session"
import { prisma } from "@/lib/prisma"
import { gastoSchema } from "@/lib/schemas/gastos"
import { fail } from "@/lib/action-result"

const puedeGestionar = (rol: string) => rol === "ADMIN" || rol === "GERENCIA"

export async function registrarGasto(formData: FormData) {
  const user = await getSessionUser()
  if (!user) return fail("No autorizado")
  if (!puedeGestionar(user.rol)) return fail("Sin permisos")

  const raw = Object.fromEntries(formData.entries())
  const parsed = gastoSchema.safeParse(raw)
  if (!parsed.success) return fail(parsed.error.issues[0].message)

  const { fecha, categoria, descripcion, comprobante, monto } = parsed.data
  const gasto = await prisma.gasto.create({
    data: {
      // Día calendario a medianoche UTC, igual que el resto de fechas de la app
      fecha: new Date(`${fecha}T00:00:00.000Z`),
      categoria,
      descripcion,
      comprobante,
      monto,
      userId: user.id,
    },
    select: { id: true, fecha: true },
  })

  revalidatePath("/costos")
  revalidatePath("/costos/gastos")
  return { ok: true as const, mes: gasto.fecha.toISOString().slice(0, 7) }
}

export async function eliminarGasto(id: string) {
  const user = await getSessionUser()
  if (!user) return fail("No autorizado")
  if (!puedeGestionar(user.rol)) return fail("Sin permisos")
  if (typeof id !== "string" || !id) return fail("Gasto inválido")

  const { count } = await prisma.gasto.deleteMany({ where: { id } })
  if (count === 0) return fail("Ese gasto ya no existe")

  revalidatePath("/costos")
  revalidatePath("/costos/gastos")
  return { ok: true as const }
}
