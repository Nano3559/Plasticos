"use client"

import { useId } from "react"
import { cn } from "@/lib/utils"
import { formatNumero, leerNumero } from "@/lib/formato"

/**
 * Campo para kg, Bs o precios. Es de texto (no type="number") para aceptar como se escribe en Bolivia:
 * "1.250,50" o "1250.50". Debajo muestra cómo se entendió cuando hay puntos o comas, para evitar sorpresas.
 * El formulario debe enviar numeroParaEnviar(valor, decimales).
 */
export function CampoNumero({
  id,
  valor,
  onCambio,
  unidad,
  decimales = 2,
  negativo = false,
  grande = false,
  className,
  ...props
}: {
  id?: string
  valor: string
  onCambio: (v: string) => void
  unidad?: string
  decimales?: number
  negativo?: boolean
  grande?: boolean
} & Omit<React.ComponentProps<"input">, "value" | "onChange" | "type">) {
  const auto = useId()
  const idCampo = id ?? auto
  const n = leerNumero(valor, decimales)
  const valido = valor.trim() === "" || (Number.isFinite(n) && (negativo || n >= 0))
  const mostrarLectura = valido && valor.trim() !== "" && /[.,]/.test(valor)

  return (
    <div>
      <div className="relative">
        <input
          id={idCampo}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          value={valor}
          onChange={(e) => onCambio(e.target.value)}
          aria-invalid={!valido || undefined}
          aria-describedby={`${idCampo}-lectura`}
          className={cn(
            "flex w-full min-w-0 rounded-lg border border-line-strong bg-panel px-3 tabular-nums text-fg outline-none transition-[border-color,box-shadow] placeholder:text-muted",
            "hover:border-subdued focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand/20 aria-invalid:border-danger",
            "disabled:pointer-events-none disabled:opacity-50",
            grande ? "h-12 text-lg font-bold" : "h-11 text-base font-semibold md:text-sm",
            unidad && "pr-12",
            className
          )}
          {...props}
        />
        {unidad && (
          <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-muted">{unidad}</span>
        )}
      </div>
      <p id={`${idCampo}-lectura`} className={`mt-1 min-h-4 text-xs ${valido ? "text-muted" : "text-danger"}`} aria-live="polite">
        {!valido
          ? negativo
            ? "Escribe solo números, por ejemplo 1.250,50 o -12,5"
            : "Escribe solo números, por ejemplo 1.250,50"
          : mostrarLectura
            ? `Se guardará: ${formatNumero(n, Math.min(decimales, Math.max(2, (String(n).split(".")[1] ?? "").length)))}${unidad ? ` ${unidad}` : ""}`
            : ""}
      </p>
    </div>
  )
}
