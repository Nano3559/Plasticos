import NextAuth, { CredentialsSignin } from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { authConfig } from "./auth.config"
import { prisma } from "@/lib/prisma"
import { normalizarEmail, trasIntentoFallido } from "@/lib/claves"
import bcrypt from "bcryptjs"
import { z } from "zod"

const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
})

/** Demasiados intentos fallidos: el login muestra cuánto esperar. */
class CuentaBloqueada extends CredentialsSignin {
  code = "bloqueado"
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  session: { strategy: "jwt", maxAge: 12 * 60 * 60 }, // 12 horas: un turno largo, luego hay que volver a entrar
  providers: [
    Credentials({
      name: "Credenciales",
      credentials: {
        email: { label: "Correo", type: "email" },
        password: { label: "Contraseña", type: "password" },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials)
        if (!parsed.success) return null

        const email = normalizarEmail(parsed.data.email)
        const user = await prisma.user.findUnique({ where: { email } })
        if (!user || !user.activo) return null

        const ahora = new Date()
        if (user.bloqueadoHasta && user.bloqueadoHasta > ahora) throw new CuentaBloqueada()

        const isValid = await bcrypt.compare(parsed.data.password, user.passwordHash)
        if (!isValid) {
          const estado = trasIntentoFallido(user.intentosFallidos, ahora)
          await prisma.user.update({ where: { id: user.id }, data: estado })
          if (estado.bloqueadoHasta) throw new CuentaBloqueada()
          return null
        }

        await prisma.user.update({
          where: { id: user.id },
          data: { intentosFallidos: 0, bloqueadoHasta: null, ultimoAcceso: ahora },
        })

        return {
          id: user.id,
          name: user.nombre,
          email: user.email,
          rol: user.rol,
          sesionVersion: user.sesionVersion,
          debeCambiarClave: user.debeCambiarClave,
        }
      },
    }),
  ],
})
