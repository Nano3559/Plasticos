"use client"

/**
 * Elegir una opción entre pocas (turno, área, medio de pago…) con botones grandes, cómodos en el celular.
 * Son radios de verdad: se navegan con el teclado y los lectores de pantalla los anuncian.
 */
export function Opciones<T extends string>({
  nombre,
  etiqueta,
  valor,
  onCambio,
  opciones,
  columnas = 3,
}: {
  nombre: string
  etiqueta: string
  valor: T | ""
  onCambio: (v: T) => void
  opciones: { valor: T; texto: string; detalle?: string; icono?: React.ComponentType<{ className?: string }> }[]
  columnas?: 2 | 3 | 4
}) {
  const grid = columnas === 2 ? "grid-cols-2" : columnas === 4 ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-3"
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-semibold">{etiqueta}</legend>
      <div className={`grid gap-2 ${grid}`}>
        {opciones.map(({ valor: v, texto, detalle, icono: Icono }) => (
          <label
            key={v}
            className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-line px-3 py-2 text-sm transition-colors hover:bg-elevated has-[:checked]:border-brand has-[:checked]:bg-brand-soft has-[:checked]:text-brand-ink has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-brand"
          >
            <input type="radio" name={nombre} value={v} checked={valor === v} onChange={() => onCambio(v)} className="sr-only" />
            {Icono && <Icono className="size-4 shrink-0" />}
            <span className="min-w-0">
              <span className="block font-semibold">{texto}</span>
              {detalle && <span className="block text-xs text-subdued">{detalle}</span>}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}
