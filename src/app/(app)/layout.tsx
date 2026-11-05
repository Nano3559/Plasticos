import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { AppShell } from "@/components/layout/app-shell"
import { getSessionUser } from "@/lib/session"

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user) redirect("/login")

  // La sesión existe pero ya no vale (usuario desactivado, rol o clave cambiados): se cierra
  const user = await getSessionUser()
  if (!user) redirect("/api/sesion/cerrar?motivo=sesion")

  return <AppShell user={{ name: user.name, rol: user.rol }}>{children}</AppShell>
}
