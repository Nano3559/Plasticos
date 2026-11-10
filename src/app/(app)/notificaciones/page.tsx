import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { getSessionUser } from "@/lib/session"
import { ROLES_AVISO_INVENTARIO } from "@/lib/avisos-texto"
import { ListaAvisos, type Aviso } from "./lista-avisos"

export const dynamic = "force-dynamic"

const MAXIMO = 100

export default async function NotificacionesPage() {
  const user = await getSessionUser()
  if (!user) redirect("/login")

  const filas = await prisma.notificacion.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: MAXIMO,
  })
  const avisos: Aviso[] = filas.map((n) => ({
    id: n.id,
    tipo: n.tipo,
    titulo: n.titulo,
    detalle: n.detalle,
    href: n.href,
    leida: n.leidaEn !== null,
    creada: n.createdAt.toISOString(),
  }))
  const recibe = ROLES_AVISO_INVENTARIO.includes(user.rol) || user.rol === "ADMIN"

  return <ListaAvisos avisos={avisos} recibe={recibe} maximo={MAXIMO} />
}
