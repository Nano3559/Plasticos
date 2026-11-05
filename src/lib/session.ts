import { cache } from "react"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export type Rol = "OPERADOR" | "ALMACEN" | "ADMIN" | "GERENCIA"

/**
 * Usuario de la sesión, validado contra la base en cada petición: si lo desactivaron,
 * le cambiaron el rol o la contraseña, la sesión vieja deja de valer (devuelve null).
 */
export const getSessionUser = cache(async () => {
  const session = await auth()
  if (!session?.user) return null
  const s = session.user as { id?: string; sesionVersion?: number }
  if (!s.id) return null
  const user = await prisma.user.findUnique({
    where: { id: s.id },
    select: { id: true, nombre: true, email: true, rol: true, activo: true, sesionVersion: true, debeCambiarClave: true },
  })
  if (!user || !user.activo || user.sesionVersion !== (s.sesionVersion ?? 0)) return null
  return { id: user.id, rol: user.rol as Rol, name: user.nombre, email: user.email, debeCambiarClave: user.debeCambiarClave }
})

/** Fecha calendario (YYYY-MM-DD) en America/La_Paz, no en UTC. */
export function fechaLaPaz(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/La_Paz",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date)
}
