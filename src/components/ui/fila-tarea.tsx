import Link from "next/link"
import { Check } from "lucide-react"

export type Prioridad = "alta" | "media" | "baja" | "ok"

// Los cuatro colores de prioridad de Todoist: P1 rojo, P2 naranja, P3 azul, sin prioridad gris.
const ANILLO: Record<Prioridad, string> = {
  alta: "border-danger bg-danger/10 text-danger",
  media: "border-warn bg-warn/10 text-warn",
  baja: "border-info bg-info/10 text-info",
  ok: "border-accent bg-accent/15 text-accent",
}
const NOMBRE: Record<Prioridad, string> = { alta: "Urgente", media: "Importante", baja: "Normal", ok: "Al día" }

/**
 * Fila de lista con círculo de prioridad a la izquierda. Es un enlace: abre el detalle.
 * El color nunca va solo: el texto de prioridad está disponible para lectores de pantalla.
 */
export function FilaTarea({
  href,
  prioridad = "baja",
  titulo,
  detalle,
  derecha,
}: {
  href: string
  prioridad?: Prioridad
  titulo: React.ReactNode
  detalle?: React.ReactNode
  derecha?: React.ReactNode
}) {
  return (
    <Link
      href={href}
      className="group flex min-h-14 items-start gap-3 border-b border-line py-3 last:border-b-0"
    >
      {/* Círculo de tarea de Todoist: al pasar el mouse aparece el check */}
      <span
        className={`mt-0.5 grid size-[18px] shrink-0 place-items-center rounded-full border-[1.5px] ${ANILLO[prioridad]}`}
        aria-hidden
      >
        <Check className="size-3 opacity-0 transition-opacity group-hover:opacity-100" strokeWidth={3} />
      </span>
      <span className="sr-only">{NOMBRE[prioridad]}: </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] leading-snug text-fg">{titulo}</span>
        {detalle && <span className="mt-0.5 block text-[13px] text-subdued">{detalle}</span>}
      </span>
      {derecha && <span className="shrink-0 text-right text-sm tabular-nums text-subdued">{derecha}</span>}
    </Link>
  )
}

export function VacioTodoOk({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 py-6">
      <span className="grid size-8 place-items-center rounded-full bg-brand-soft text-brand-ink" aria-hidden>
        <Check className="size-4" strokeWidth={3} />
      </span>
      <p className="text-subdued">{children}</p>
    </div>
  )
}
