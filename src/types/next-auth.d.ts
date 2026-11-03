import NextAuth, { DefaultSession } from "next-auth"

declare module "next-auth" {
  interface User {
    rol: "OPERADOR" | "ALMACEN" | "ADMIN" | "GERENCIA"
  }

  interface Session {
    user: {
      id: string
      rol: "OPERADOR" | "ALMACEN" | "ADMIN" | "GERENCIA"
    } & DefaultSession["user"]
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string
    rol: "OPERADOR" | "ALMACEN" | "ADMIN" | "GERENCIA"
  }
}
