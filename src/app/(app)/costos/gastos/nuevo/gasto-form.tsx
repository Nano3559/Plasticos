"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { AlertCircle } from "lucide-react"
import { registrarGasto } from "@/actions/gastos"
import { isActionError } from "@/lib/action-result"
import { formatBs, leerNumero } from "@/lib/formato"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const hoy = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/La_Paz" }).format(new Date())
const PRINCIPALES = 6

export function GastoForm({ categorias }: { categorias: string[] }) {
  const router = useRouter()
  const [pendiente, iniciar] = useTransition()
  const [error, setError] = useState("")
  const [categoria, setCategoria] = useState("")
  const [monto, setMonto] = useState("")
  const montoNum = leerNumero(monto) || 0

  return (
    <div className="max-w-2xl space-y-8">
      <header>
        <p className="text-sm font-medium text-subdued">
          <Link href="/costos/gastos" className="hover:text-brand-ink hover:underline">
            Gastos generales
          </Link>
        </p>
        <h1 className="mt-1 text-[26px] font-bold leading-tight sm:text-[28px]">Registrar gasto</h1>
        <p className="mt-1 text-subdued">Mantenimiento, repuestos, fletes, alquiler y todo lo que no es materia prima, mano de obra ni energía.</p>
      </header>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          setError("")
          const fd = new FormData(e.currentTarget)
          iniciar(async () => {
            const r = await registrarGasto(fd)
            if (isActionError(r)) setError(r.error)
            else {
              router.push(`/costos/gastos?mes=${r.mes}`)
              router.refresh()
            }
          })
        }}
        className="space-y-6"
      >
        {error && (
          <div role="alert" className="flex items-start gap-3 rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm font-medium text-danger">
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="categoria">Categoría</Label>
          <div className="flex flex-wrap gap-2">
            {categorias.slice(0, PRINCIPALES).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCategoria(c)}
                aria-pressed={categoria === c}
                className={`h-9 rounded-full border px-3.5 text-sm font-medium transition ${
                  categoria === c ? "border-brand bg-brand-soft text-brand-ink" : "border-line text-subdued hover:bg-elevated"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
          <Input
            id="categoria"
            name="categoria"
            list="categorias-gasto"
            placeholder="O escribe otra"
            value={categoria}
            onChange={(e) => setCategoria(e.target.value)}
            required
            maxLength={60}
            autoComplete="off"
          />
          <datalist id="categorias-gasto">
            {categorias.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="monto">Monto (Bs)</Label>
            <Input id="monto" name="monto" inputMode="decimal" placeholder="350,00" value={monto} onChange={(e) => setMonto(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="fecha">Fecha</Label>
            <Input id="fecha" name="fecha" type="date" defaultValue={hoy()} max={hoy()} required />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-[1fr_180px]">
          <div className="space-y-2">
            <Label htmlFor="descripcion">Detalle (opcional)</Label>
            <Input id="descripcion" name="descripcion" placeholder="Cambio de resistencias de la extrusora 2" maxLength={300} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="comprobante">N° factura o recibo</Label>
            <Input id="comprobante" name="comprobante" placeholder="001234" maxLength={40} />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg bg-elevated px-4 py-3">
          <p className="text-sm text-subdued">{categoria ? `Gasto en ${categoria}` : "Elige una categoría"}</p>
          <p className="text-xl font-extrabold tabular-nums text-brand-ink">{formatBs(montoNum)}</p>
        </div>

        <div className="flex gap-2">
          <Button type="submit" disabled={pendiente || montoNum <= 0 || !categoria.trim()}>
            {pendiente ? "Guardando…" : "Registrar gasto"}
          </Button>
          <Button type="button" variant="ghost" onClick={() => router.back()}>
            Cancelar
          </Button>
        </div>
        <p className="text-xs text-muted">Queda con tu nombre. Si te equivocas, puedes borrarlo desde la lista de gastos y registrarlo de nuevo.</p>
      </form>
    </div>
  )
}
