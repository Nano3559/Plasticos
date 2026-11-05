import bcrypt from "bcryptjs"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { getSessionUser } from "@/lib/session"
import { CLAVE_DE_PRUEBA } from "@/lib/claves"
import { UsuariosView, type UsuarioFila } from "./usuarios-view"

export const dynamic = "force-dynamic"

export default async function UsuariosPage() {
  const yo = await getSessionUser()
  if (!yo || yo.rol !== "GERENCIA") redirect("/dashboard")

  const usuarios = await prisma.user.findMany({
    orderBy: [{ activo: "desc" }, { nombre: "asc" }],
    select: {
      id: true, nombre: true, email: true, rol: true, activo: true, passwordHash: true,
      debeCambiarClave: true, bloqueadoHasta: true, ultimoAcceso: true,
    },
  })

  // ¿Quién sigue entrando con la contraseña de prueba del seed? (pocos usuarios: se puede comprobar uno por uno)
  const conClaveDePrueba = new Set<string>()
  if (usuarios.length <= 60) {
    const res = await Promise.all(usuarios.map((u) => (u.activo ? bcrypt.compare(CLAVE_DE_PRUEBA, u.passwordHash) : false)))
    usuarios.forEach((u, i) => res[i] && conClaveDePrueba.add(u.id))
  }

  const ahora = new Date()
  const filas: UsuarioFila[] = usuarios.map((u) => ({
    id: u.id,
    nombre: u.nombre,
    email: u.email,
    rol: u.rol,
    activo: u.activo,
    debeCambiarClave: u.debeCambiarClave,
    bloqueado: !!u.bloqueadoHasta && u.bloqueadoHasta > ahora,
    claveDePrueba: conClaveDePrueba.has(u.id),
    ultimoAcceso: u.ultimoAcceso?.toISOString() ?? null,
    soyYo: u.id === yo.id,
  }))

  return <UsuariosView usuarios={filas} />
}
