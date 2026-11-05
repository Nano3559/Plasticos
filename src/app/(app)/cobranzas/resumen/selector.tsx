"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useTransition } from "react"

type Opcion = { id: string; nombre: string; saldo: number }

/** Elegir «Todos los clientes» o uno, y el periodo. Todo vive en la URL para poder compartir el enlace. */
export function SelectorResumen({
  clientes,
  clienteId,
  meses,
  periodos,
}: {
  clientes: Opcion[]
  clienteId: string | null
  meses: number
  periodos: readonly { meses: number; texto: string }[]
}) {
  const router = useRouter()
  const params = useSearchParams()
  const pathname = usePathname()
  const [cargando, iniciar] = useTransition()

  const ir = (cambios: Record<string, string | null>) => {
    const p = new URLSearchParams(params.toString())
    for (const [k, v] of Object.entries(cambios)) {
      if (v === null || v === "") p.delete(k)
      else p.set(k, v)
    }
    iniciar(() => router.push(`${pathname}${p.size ? `?${p}` : ""}`, { scroll: false }))
  }

  const conDeuda = clientes.filter((c) => c.saldo > 0.5)
  const alDia = clientes.filter((c) => c.saldo <= 0.5)
  const bs = (n: number) => n.toLocaleString("es-BO", { maximumFractionDigits: 0 })

  return (
    <div className={`flex flex-col gap-3 sm:flex-row sm:items-center ${cargando ? "opacity-60" : ""}`} aria-busy={cargando}>
      <label className="sr-only" htmlFor="selector-cliente">
        Cliente
      </label>
      <select
        id="selector-cliente"
        value={clienteId ?? ""}
        onChange={(e) => ir({ cliente: e.target.value || null })}
        className="h-10 w-full min-w-0 rounded-md border border-line-strong bg-panel px-3 text-[14px] font-medium sm:max-w-sm"
      >
        <option value="">Todos los clientes ({clientes.length})</option>
        {conDeuda.length > 0 && (
          <optgroup label="Con saldo por cobrar">
            {conDeuda.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre} — debe Bs {bs(c.saldo)}
              </option>
            ))}
          </optgroup>
        )}
        {alDia.length > 0 && (
          <optgroup label="Al día">
            {alDia.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </optgroup>
        )}
      </select>

      <div role="group" aria-label="Periodo" className="flex shrink-0 rounded-md bg-elevated p-0.5">
        {periodos.map((p) => {
          const activo = p.meses === meses
          return (
            <button
              key={p.meses}
              type="button"
              aria-pressed={activo}
              onClick={() => ir({ meses: p.meses === 12 ? null : String(p.meses) })}
              className={`h-9 rounded-[5px] px-3 text-[13px] font-semibold transition-colors ${
                activo ? "bg-panel text-fg shadow-[0_1px_2px_rgba(32,32,32,0.12)]" : "text-subdued hover:text-fg"
              }`}
            >
              {p.texto}
            </button>
          )
        })}
      </div>
    </div>
  )
}
