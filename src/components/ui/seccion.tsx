import Link from "next/link"
import { ChevronRight } from "lucide-react"

/** Título de sección con contador, como los grupos de tareas de Todoist ("Hoy · 5"). */
export function Seccion({
  titulo,
  cuenta,
  verTodo,
  children,
  className = "",
}: {
  titulo: string
  cuenta?: number
  verTodo?: { href: string; texto?: string }
  children: React.ReactNode
  className?: string
}) {
  return (
    <section className={className} aria-label={titulo}>
      <div className="mb-1 flex items-baseline justify-between gap-3 border-b border-line pb-2">
        <h2 className="text-[15px] font-bold">
          {titulo}
          {cuenta !== undefined && <span className="ml-2 text-sm font-normal text-muted">{cuenta}</span>}
        </h2>
        {verTodo && (
          <Link href={verTodo.href} className="inline-flex items-center gap-0.5 text-[13px] font-semibold text-brand-ink hover:underline">
            {verTodo.texto ?? "Ver todo"} <ChevronRight className="size-4" />
          </Link>
        )}
      </div>
      {children}
    </section>
  )
}
