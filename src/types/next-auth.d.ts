import type { DefaultSession } from "next-auth"

type Rol = "OPERADOR" | "ALMACEN" | "ADMIN" | "GERENCIA"

declare module "next-auth" {
  interface User {
    rol: Rol
    sesionVersion?: number
    debeCambiarClave?: boolean
  }

  interface Session {
    user: {
      id: string
      rol: Rol
      sesionVersion: number
      debeCambiarClave: boolean
    } & DefaultSession["user"]
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string
    rol: Rol
    sesionVersion?: number
    debeCambiarClave?: boolean
  }
}
