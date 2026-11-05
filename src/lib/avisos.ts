import type { Prisma } from "@prisma/client"
import { destinatarios, textoMovimiento, textoRechazo, textoStockBajo, type DatosMovimiento, ROLES_AVISO_INVENTARIO } from "@/lib/avisos-texto"

type Tx = Prisma.TransactionClient

/** Los avisos leídos hace más de este tiempo se borran solos, para que la tabla no crezca sin fin. */
const DIAS_CONSERVAR_LEIDAS = 90

/**
 * Crea los avisos de un movimiento de inventario dentro de la misma transacción:
 * si el movimiento falla, no queda aviso suelto; si se guarda, el aviso también.
 */
export async function avisarMovimiento(
  tx: Tx,
  p: {
    movimientoId: string
    materialId: string
    autorId: string
    datos: Omit<DatosMovimiento, "quien">
    stock: { antes: number; despues: number; minimo: number }
  }
) {
  const [usuarios, autor] = await Promise.all([
    tx.user.findMany({
      where: { activo: true, rol: { in: ROLES_AVISO_INVENTARIO } },
      select: { id: true, rol: true, activo: true },
    }),
    tx.user.findUnique({ where: { id: p.autorId }, select: { nombre: true } }),
  ])
  const para = destinatarios(usuarios, p.autorId)
  if (para.length === 0) return

  const textos = [
    textoMovimiento({ ...p.datos, quien: autor?.nombre ?? "Alguien" }),
    textoStockBajo({ material: p.datos.material, unidad: p.datos.unidad, ...p.stock }),
  ].filter((t) => t !== null)

  const href = `/inventario/${p.materialId}`
  await tx.notificacion.createMany({
    data: para.flatMap((u) => textos.map((t) => ({ userId: u.id, ...t, href, movimientoId: p.movimientoId }))),
  })

  const limite = new Date(Date.now() - DIAS_CONSERVAR_LEIDAS * 86_400_000)
  await tx.notificacion.deleteMany({ where: { leidaEn: { lt: limite } } })
}

/** Aviso de rechazo en extrusión para Almacén y Gerencia, dentro de la transacción del registro. */
export async function avisarRechazo(tx: Tx, p: { autorId: string; datos: Omit<Parameters<typeof textoRechazo>[0], "quien"> }) {
  const [usuarios, autor] = await Promise.all([
    tx.user.findMany({ where: { activo: true, rol: { in: ROLES_AVISO_INVENTARIO } }, select: { id: true, rol: true, activo: true } }),
    tx.user.findUnique({ where: { id: p.autorId }, select: { nombre: true } }),
  ])
  const para = destinatarios(usuarios, p.autorId)
  if (para.length === 0) return
  const t = textoRechazo({ ...p.datos, quien: autor?.nombre ?? "Alguien" })
  await tx.notificacion.createMany({ data: para.map((u) => ({ userId: u.id, ...t, href: "/inventario/rechazos" })) })
}
