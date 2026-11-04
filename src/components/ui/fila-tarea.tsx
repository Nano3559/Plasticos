import Link from "next/link"

export type Prioridad = "alta" | "media" | "baja" | "ok"

// Los cuatro colores de prioridad de Todoist: P1 rojo, P2 naranja, P3 azul, sin prioridad gris.
const ANILLO: Record<Prioridad, string> = {
  alta: "border-danger bg-danger/10",
  media: "border-warn bg-warn/10",
  baja: "border-info bg-info/10",
  ok: "border-accent bg-accent/15",
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
      className="group -mx-2 flex min-h-14 items-start gap-3 rounded-lg border-b border-line px-2 py-3 transition-colors last:border-b-0 hover:bg-black/[0.035]"
    >
      <span className={`mt-0.5 size-5 shrink-0 rounded-full border-2 ${ANILLO[prioridad]}`} aria-hidden />
      <span className="sr-only">{NOMBRE[prioridad]}: </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-semibold text-fg group-hover:text-brand">{titulo}</span>
        {detalle && <span className="mt-0.5 block text-sm text-subdued">{detalle}</span>}
      </span>
      {derecha && <span className="shrink-0 text-right text-sm tabular-nums text-subdued">{derecha}</span>}
    </Link>
  )
}

export function VacioTodoOk({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 py-6">
      <span className="grid size-8 place-items-center rounded-full bg-accent/15 text-accent" aria-hidden>
        ✓
      </span>
      <p className="text-subdued">{children}</p>
    </div>
  )
}
