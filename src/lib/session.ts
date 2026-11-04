import { auth } from "@/auth"

export type Rol = "OPERADOR" | "ALMACEN" | "ADMIN" | "GERENCIA"

export async function getSessionUser() {
  const session = await auth()
  if (!session?.user) return null
  const user = session.user as { id?: string; rol?: Rol; name?: string | null }
  if (!user.id || !user.rol) return null
  return { id: user.id, rol: user.rol, name: user.name ?? null }
}

/** Fecha calendario (YYYY-MM-DD) en America/La_Paz, no en UTC. */
export function fechaLaPaz(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/La_Paz",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date)
}
