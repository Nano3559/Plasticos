"use server"

import bcrypt from "bcryptjs"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { signOut } from "@/auth"
import { getSessionUser, type Rol } from "@/lib/session"
import { fail, type ActionError } from "@/lib/action-result"
import { claveTemporal, normalizarEmail, problemaDeClave } from "@/lib/claves"

const ROLES = ["OPERADOR", "ALMACEN", "ADMIN", "GERENCIA"] as const

async function exigirGerencia() {
  const user = await getSessionUser()
  if (!user) return { error: fail("Tu sesión terminó. Vuelve a entrar.") }
  if (user.rol !== "GERENCIA") return { error: fail("Solo Gerencia puede administrar usuarios.") }
  return { user }
}

/** No puede quedar la planta sin nadie que administre usuarios. */
async function quedariaSinGerencia(idQueCambia: string) {
  const otros = await prisma.user.count({ where: { rol: "GERENCIA", activo: true, id: { not: idQueCambia } } })
  return otros === 0
}

const nuevoSchema = z.object({
  nombre: z.string().trim().min(2, "Escribe el nombre de la persona.").max(80),
  email: z.string().trim().email("El correo no es válido."),
  rol: z.enum(ROLES, { errorMap: () => ({ message: "Elige un rol." }) }),
})

export type ResultadoClave = { ok: true; claveTemporal: string; nombre: string; email: string } | ActionError

/** Crea el usuario con una contraseña temporal que debe cambiar al entrar. */
export async function crearUsuario(formData: FormData): Promise<ResultadoClave> {
  const g = await exigirGerencia()
  if (g.error) return g.error

  const parsed = nuevoSchema.safeParse(Object.fromEntries(formData.entries()))
  if (!parsed.success) return fail(parsed.error.issues[0].message)
  const email = normalizarEmail(parsed.data.email)

  if (await prisma.user.findUnique({ where: { email }, select: { id: true } })) {
    return fail("Ya existe un usuario con ese correo.")
  }

  const clave = claveTemporal()
  await prisma.user.create({
    data: {
      nombre: parsed.data.nombre,
      email,
      rol: parsed.data.rol,
      passwordHash: await bcrypt.hash(clave, 10),
      debeCambiarClave: true,
    },
  })
  revalidatePath("/usuarios")
  return { ok: true, claveTemporal: clave, nombre: parsed.data.nombre, email }
}

const edicionSchema = z.object({
  id: z.string().min(1),
  nombre: z.string().trim().min(2, "Escribe el nombre de la persona.").max(80),
  rol: z.enum(ROLES),
  activo: z.enum(["true", "false"]).transform((v) => v === "true"),
})

/** Cambia nombre, rol o estado. Si cambia el rol o se desactiva, sus sesiones abiertas se cierran. */
export async function actualizarUsuario(formData: FormData): Promise<{ ok: true } | ActionError> {
  const g = await exigirGerencia()
  if (g.error) return g.error

  const parsed = edicionSchema.safeParse(Object.fromEntries(formData.entries()))
  if (!parsed.success) return fail(parsed.error.issues[0].message)
  const { id, nombre, rol, activo } = parsed.data

  const actual = await prisma.user.findUnique({ where: { id }, select: { rol: true, activo: true } })
  if (!actual) return fail("El usuario no existe.")

  if (id === g.user.id && (!activo || rol !== "GERENCIA")) {
    return fail("No puedes desactivarte ni quitarte el rol de Gerencia a ti mismo. Pídeselo a otra persona de Gerencia.")
  }
  const dejaDeSerGerencia = actual.rol === "GERENCIA" && actual.activo && (rol !== "GERENCIA" || !activo)
  if (dejaDeSerGerencia && (await quedariaSinGerencia(id))) {
    return fail("Tiene que quedar al menos una persona de Gerencia activa.")
  }

  const cierraSesiones = actual.rol !== rol || actual.activo !== activo
  await prisma.user.update({
    where: { id },
    data: { nombre, rol: rol as Rol, activo, ...(cierraSesiones ? { sesionVersion: { increment: 1 } } : {}) },
  })
  revalidatePath("/usuarios")
  return { ok: true }
}

/** Nueva contraseña temporal: cierra sus sesiones, lo desbloquea y le pide cambiarla al entrar. */
export async function restablecerClave(id: string): Promise<ResultadoClave> {
  const g = await exigirGerencia()
  if (g.error) return g.error
  if (id === g.user.id) return fail("Para cambiar tu propia contraseña usa «Mi cuenta».")

  const user = await prisma.user.findUnique({ where: { id }, select: { nombre: true, email: true } })
  if (!user) return fail("El usuario no existe.")

  const clave = claveTemporal()
  await prisma.user.update({
    where: { id },
    data: {
      passwordHash: await bcrypt.hash(clave, 10),
      debeCambiarClave: true,
      sesionVersion: { increment: 1 },
      intentosFallidos: 0,
      bloqueadoHasta: null,
    },
  })
  revalidatePath("/usuarios")
  return { ok: true, claveTemporal: clave, nombre: user.nombre, email: user.email }
}

/** Quita el bloqueo por intentos fallidos sin cambiar la contraseña. */
export async function desbloquearUsuario(id: string): Promise<{ ok: true } | ActionError> {
  const g = await exigirGerencia()
  if (g.error) return g.error
  await prisma.user.update({ where: { id }, data: { intentosFallidos: 0, bloqueadoHasta: null } })
  revalidatePath("/usuarios")
  return { ok: true }
}

const miClaveSchema = z
  .object({
    actual: z.string().min(1, "Escribe tu contraseña actual."),
    nueva: z.string(),
    repetir: z.string(),
  })
  .refine((d) => d.nueva === d.repetir, { message: "Las dos contraseñas nuevas no coinciden.", path: ["repetir"] })

/** Cada persona cambia su contraseña. Después tiene que volver a entrar (se cierran todas sus sesiones). */
export async function cambiarMiClave(formData: FormData): Promise<{ ok: true } | ActionError> {
  const sesion = await getSessionUser()
  if (!sesion) return fail("Tu sesión terminó. Vuelve a entrar.")

  const parsed = miClaveSchema.safeParse(Object.fromEntries(formData.entries()))
  if (!parsed.success) return fail(parsed.error.issues[0].message)
  const { actual, nueva } = parsed.data

  const user = await prisma.user.findUnique({ where: { id: sesion.id }, select: { passwordHash: true, email: true, nombre: true } })
  if (!user) return fail("El usuario no existe.")
  if (!(await bcrypt.compare(actual, user.passwordHash))) return fail("La contraseña actual no es correcta.")
  if (actual === nueva) return fail("La contraseña nueva tiene que ser distinta de la actual.")
  const problema = problemaDeClave(nueva, { email: user.email, nombre: user.nombre })
  if (problema) return fail(problema)

  await prisma.user.update({
    where: { id: sesion.id },
    data: { passwordHash: await bcrypt.hash(nueva, 10), debeCambiarClave: false, sesionVersion: { increment: 1 } },
  })
  // Se cierran todas sus sesiones: vuelve a entrar con la contraseña nueva
  await signOut({ redirectTo: "/login?motivo=clave" })
  return { ok: true }
}
