import { AlertCircle, Info } from "lucide-react"

/** Error de un formulario: arriba del formulario, con rol de alerta para lectores de pantalla. */
export function MensajeError({ children }: { children: React.ReactNode }) {
  if (!children) return null
  return (
    <div role="alert" className="flex items-start gap-3 rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm font-medium text-danger">
      <AlertCircle className="mt-0.5 size-4 shrink-0" />
      <span>{children}</span>
    </div>
  )
}

/** Nota informativa (no es un error). */
export function MensajeInfo({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 rounded-lg bg-elevated px-4 py-3 text-sm text-subdued">
      <Info className="mt-0.5 size-4 shrink-0" />
      <span>{children}</span>
    </div>
  )
}

/** Lista o sección vacía. */
export function Vacio({ icono: Icono, children }: { icono?: React.ComponentType<{ className?: string }>; children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 py-12 text-center text-subdued">
      {Icono && <Icono className="size-8 text-muted" />}
      <div>{children}</div>
    </div>
  )
}
