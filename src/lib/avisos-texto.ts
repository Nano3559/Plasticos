/** Texto de los avisos de inventario: sin acceso a la base, para poder probarlo. */
import { formatKg } from "@/lib/formato"
import { TURNO_NOMBRE, type Turno } from "@/lib/turno"

export type Rol = "OPERADOR" | "ALMACEN" | "ADMIN" | "GERENCIA"

/** Roles que reciben los avisos de inventario. */
export const ROLES_AVISO_INVENTARIO: Rol[] = ["ALMACEN", "GERENCIA"]

export type DatosMovimiento = {
  tipo: "SALIDA" | "AJUSTE"
  material: string
  unidad: string
  cantidad: number // en AJUSTE trae su signo
  quien: string
  turno: Turno
  motivo?: string | null
  orden?: string | null // "OT #12" o la referencia del Excel
}

export type TextoAviso = { tipo: "SALIDA" | "AJUSTE" | "STOCK_BAJO" | "RECHAZO"; titulo: string; detalle: string }

const cant = (n: number, unidad: string) => (unidad === "kg" ? formatKg(Math.abs(n)) : `${formatKg(Math.abs(n)).replace(" kg", "")} ${unidad}`)

export function textoMovimiento(m: DatosMovimiento): TextoAviso {
  const titulo =
    m.tipo === "SALIDA"
      ? `Salida de ${cant(m.cantidad, m.unidad)} de ${m.material}`
      : `Ajuste ${m.cantidad > 0 ? "+" : "−"}${cant(m.cantidad, m.unidad)} en ${m.material}`
  const partes = [m.quien, `turno ${TURNO_NOMBRE[m.turno]}`]
  if (m.orden) partes.push(m.orden)
  if (m.motivo?.trim()) partes.push(`Motivo: ${m.motivo.trim()}`)
  return { tipo: m.tipo, titulo, detalle: partes.join(" · ") }
}

/**
 * Aviso de stock bajo solo cuando el movimiento CRUZA el mínimo (estaba en o sobre el mínimo
 * y quedó por debajo). Así no se repite el aviso en cada salida mientras siga bajo.
 */
export function textoStockBajo(p: {
  material: string
  unidad: string
  antes: number
  despues: number
  minimo: number
}): TextoAviso | null {
  if (p.minimo <= 0) return null
  if (!(p.antes >= p.minimo && p.despues < p.minimo)) return null
  return {
    tipo: "STOCK_BAJO",
    titulo: `${p.material} quedó bajo el mínimo`,
    detalle: `Quedan ${cant(p.despues, p.unidad)} · mínimo ${cant(p.minimo, p.unidad)}. Conviene reponer.`,
  }
}

/** Destinatarios: los de los roles de aviso, activos, sin contar a quien hizo el movimiento. */
export function destinatarios<T extends { id: string; rol: string; activo: boolean }>(usuarios: T[], autorId: string): T[] {
  return usuarios.filter((u) => u.activo && u.id !== autorId && (ROLES_AVISO_INVENTARIO as string[]).includes(u.rol))
}

/** Aviso de material rechazado en extrusión. */
export function textoRechazo(r: {
  kg: number
  proveedor: string
  lote?: string | null
  material?: string | null
  motivo: string
  quien: string
  turno: Turno
  orden: string
}): TextoAviso {
  const origen = [r.material, r.lote ? `lote ${r.lote}` : null].filter(Boolean).join(", ")
  return {
    tipo: "RECHAZO",
    titulo: `Rechazo de ${formatKg(r.kg)} de ${r.proveedor}${origen ? ` (${origen})` : ""}`,
    detalle: [r.motivo, r.orden, r.quien, `turno ${TURNO_NOMBRE[r.turno]}`].join(" · "),
  }
}
