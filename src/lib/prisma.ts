import { PrismaClient } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function crearCliente() {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) throw new Error("Falta DATABASE_URL en el archivo .env")
  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) })
}

export const prisma = globalForPrisma.prisma ?? crearCliente()

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma
