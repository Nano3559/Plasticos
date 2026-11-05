"use client"

import { formatNumero } from "@/lib/formato"
import { Label } from "@/components/ui/label"
import { Selector } from "@/components/ui/selector"
import type { MaterialForm } from "@/lib/materiales-form"

/** Selector de material con su stock al lado del nombre. */
export function ElegirMaterial({
  materiales,
  valor,
  onCambio,
  mostrarStock = true,
}: {
  materiales: MaterialForm[]
  valor: string
  onCambio: (id: string) => void
  mostrarStock?: boolean
}) {
  const m = materiales.find((x) => x.id === valor)
  return (
    <div className="space-y-2">
      <Label htmlFor="materialId">Material</Label>
      <Selector id="materialId" value={valor} onChange={(e) => onCambio(e.target.value)} required>
        <option value="" disabled>
          Elige el material
        </option>
        {materiales.map((x) => (
          <option key={x.id} value={x.id}>
            {x.nombre}
            {mostrarStock ? ` — hay ${formatNumero(x.stock, 1)} ${x.unidad}` : ""}
          </option>
        ))}
      </Selector>
      {m && mostrarStock && (
        <p className="text-xs text-muted">
          Stock actual: <span className="font-semibold text-fg tabular-nums">{formatNumero(m.stock, 2)} {m.unidad}</span>
        </p>
      )}
    </div>
  )
}
