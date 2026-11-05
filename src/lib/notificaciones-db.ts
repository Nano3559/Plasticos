import { prisma } from "@/lib/prisma"

export async function contarSinLeer(userId: string): Promise<number> {
  return prisma.notificacion.count({ where: { userId, leidaEn: null } })
}
