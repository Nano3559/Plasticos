import type { NextAuthConfig } from "next-auth"

export const authConfig = {
  pages: {
    signIn: "/login",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user
      const protectedRoutes = [
        "/dashboard",
        "/inventario",
        "/produccion",
        "/costos",
        "/cobranzas",
        "/reportes",
      ]
      const isProtected = protectedRoutes.some((route) =>
        nextUrl.pathname.startsWith(route)
      )

      if (isProtected) {
        if (isLoggedIn) return true
        return false // Redirects to /login
      } else if (isLoggedIn && nextUrl.pathname === "/login") {
        return Response.redirect(new URL("/dashboard", nextUrl))
      }
      return true
    },
  },
  providers: [], // Configured with credentials in auth.ts
} satisfies NextAuthConfig
