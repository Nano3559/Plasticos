import type { NextAuthConfig } from "next-auth"

type Rol = "OPERADOR" | "ALMACEN" | "ADMIN" | "GERENCIA"

/** Qué roles pueden entrar a cada sección. La primera coincidencia gana. */
const ACCESO: { prefijo: string; roles: Rol[] }[] = [
  { prefijo: "/dashboard", roles: ["OPERADOR", "ALMACEN", "ADMIN", "GERENCIA"] },
  { prefijo: "/inventario", roles: ["ALMACEN", "ADMIN", "GERENCIA"] },
  { prefijo: "/produccion/clientes", roles: ["ADMIN", "GERENCIA"] },
  { prefijo: "/produccion/ordenes/nueva", roles: ["ADMIN", "GERENCIA"] },
  { prefijo: "/produccion", roles: ["OPERADOR", "ADMIN", "GERENCIA"] },
  { prefijo: "/costos", roles: ["ADMIN", "GERENCIA"] },
  { prefijo: "/cobranzas", roles: ["ADMIN", "GERENCIA"] },
  { prefijo: "/reportes", roles: ["ADMIN", "GERENCIA"] },
]

export const authConfig = {
  pages: {
    signIn: "/login",
  },
  callbacks: {
    // jwt y session viven aquí (y no solo en auth.ts) para que el proxy también vea el rol
    jwt({ token, user }) {
      if (user) {
        token.rol = (user as { rol?: Rol }).rol
        token.id = user.id
      }
      return token
    },
    session({ session, token }) {
      if (session.user) {
        Object.assign(session.user, { rol: token.rol, id: token.id })
      }
      return session
    },
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user
      const regla = ACCESO.find((r) => nextUrl.pathname.startsWith(r.prefijo))

      if (regla) {
        if (!isLoggedIn) return false // redirige a /login
        const rol = (auth?.user as { rol?: Rol } | undefined)?.rol
        if (!rol || !regla.roles.includes(rol)) {
          return Response.redirect(new URL("/dashboard", nextUrl))
        }
        return true
      }
      if (isLoggedIn && nextUrl.pathname === "/login") {
        return Response.redirect(new URL("/dashboard", nextUrl))
      }
      return true
    },
  },
  providers: [], // Credentials se configura en auth.ts
} satisfies NextAuthConfig
