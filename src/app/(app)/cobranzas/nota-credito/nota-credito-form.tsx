"use client"

import { useMemo, useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { AlertCircle, PackageX, Percent } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { registrarNotaCredito } from "@/actions/cobranzas"
import { isActionError } from "@/lib/action-result"
import { formatBs } from "@/lib/formato"

export type OrdenParaNota = {
  id: string
  clienteId: string
  etiqueta: string
  precio: number
  disponibleKg: number
  remisiones: string[]
  ultimaEntrega: string | null
}

const hoy = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/La_Paz" }).format(new Date())
const selectClase = "h-11 w-full rounded-lg border border-line-strong bg-panel px-3 text-sm"

export function NotaCreditoForm({
  clientes,
  ordenes,
  clienteInicial,
}: {
  clientes: { id: string; nombre: string }[]
  ordenes: OrdenParaNota[]
  clienteInicial?: string
}) {
  const router = useRouter()
  const [pendiente, iniciar] = useTransition()
  const [error, setError] = useState("")
  const [clienteId, setClienteId] = useState(clienteInicial ?? "")
  const [tipo, setTipo] = useState<"DEVOLUCION" | "DESCUENTO">("DEVOLUCION")
  const [ordenId, setOrdenId] = useState("")
  const [kg, setKg] = useState("")
  const [monto, setMonto] = useState("")

  const delCliente = useMemo(() => ordenes.filter((o) => o.clienteId === clienteId), [ordenes, clienteId])
  const orden = delCliente.find((o) => o.id === ordenId)
  const kgNum = Number(kg.replace(",", ".")) || 0
  const montoCalculado = tipo === "DEVOLUCION" && orden ? Math.round(kgNum * orden.precio * 100) / 100 : Number(monto.replace(",", ".")) || 0
  const excede = tipo === "DEVOLUCION" && orden ? kgNum > orden.disponibleKg + 0.005 : false

  return (
    <div className="max-w-2xl space-y-8">
      <header>
        <p className="text-sm font-medium text-subdued">
          <Link href="/cobranzas" className="hover:text-brand-ink hover:underline">
            Cobranzas
          </Link>
        </p>
        <h1 className="mt-1 text-[26px] font-bold leading-tight sm:text-[28px]">Devolución o descuento</h1>
        <p className="mt-1 text-subdued">Rebaja lo que el cliente debe. No cuenta como cobro: no entró plata.</p>
      </header>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          setError("")
          const fd = new FormData(e.currentTarget)
          fd.set("tipo", tipo)
          if (kg) fd.set("kg", kg.replace(",", "."))
          if (monto) fd.set("monto", monto.replace(",", "."))
          iniciar(async () => {
            const r = await registrarNotaCredito(fd)
            if (isActionError(r)) setError(r.error)
            else router.push(`/cobranzas/resumen?cliente=${clienteId}`)
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
          <Label htmlFor="clienteId">Cliente</Label>
          <select
            id="clienteId"
            name="clienteId"
            required
            value={clienteId}
            onChange={(e) => {
              setClienteId(e.target.value)
              setOrdenId("")
            }}
            className={selectClase}
          >
            <option value="" disabled>
              Elige el cliente
            </option>
            {clientes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </select>
        </div>

        <fieldset>
          <legend className="mb-2 text-sm font-semibold">¿Qué pasó?</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {[
              { v: "DEVOLUCION" as const, t: "Devolvió producto", d: "Se descuentan los kg devueltos al precio de la OT", I: PackageX },
              { v: "DESCUENTO" as const, t: "Descuento o ajuste", d: "Rebaja, bonificación o corrección por un monto", I: Percent },
            ].map(({ v, t, d, I }) => (
              <label
                key={v}
                className="flex cursor-pointer items-start gap-3 rounded-lg border border-line p-3 has-[:checked]:border-brand has-[:checked]:bg-brand-soft"
              >
                <input type="radio" name="tipoRadio" checked={tipo === v} onChange={() => setTipo(v)} className="mt-1 accent-[#07899b]" />
                <I className="mt-0.5 size-4 shrink-0 text-subdued" aria-hidden />
                <span>
                  <span className="block text-sm font-semibold">{t}</span>
                  <span className="block text-xs text-subdued">{d}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="space-y-2">
          <Label htmlFor="ordenId">{tipo === "DEVOLUCION" ? "Orden de trabajo del producto devuelto" : "Orden de trabajo (opcional)"}</Label>
          <select
            id="ordenId"
            name="ordenId"
            value={ordenId}
            onChange={(e) => setOrdenId(e.target.value)}
            required={tipo === "DEVOLUCION"}
            disabled={!clienteId}
            className={selectClase}
          >
            <option value="">{!clienteId ? "Primero elige el cliente" : delCliente.length === 0 ? "Este cliente no tiene entregas" : "Elige la OT"}</option>
            {delCliente.map((o) => (
              <option key={o.id} value={o.id} disabled={tipo === "DEVOLUCION" && o.disponibleKg <= 0}>
                {o.etiqueta} — {formatBs(o.precio)}/kg{tipo === "DEVOLUCION" ? ` · hasta ${o.disponibleKg.toLocaleString("es-BO")} kg` : ""}
              </option>
            ))}
          </select>
          {orden && orden.remisiones.length > 0 && (
            <p className="text-xs text-muted">Notas de remisión de esta OT: {orden.remisiones.slice(0, 8).join(", ")}</p>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {tipo === "DEVOLUCION" ? (
            <div className="space-y-2">
              <Label htmlFor="kg">Kg devueltos</Label>
              <Input
                id="kg"
                inputMode="decimal"
                placeholder="13,60"
                value={kg}
                onChange={(e) => setKg(e.target.value)}
                aria-invalid={excede || undefined}
                required
              />
              {excede && orden && <p className="text-xs text-danger">Máximo {orden.disponibleKg.toLocaleString("es-BO")} kg para esta OT.</p>}
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="monto">Monto a descontar (Bs)</Label>
              <Input id="monto" inputMode="decimal" placeholder="150,00" value={monto} onChange={(e) => setMonto(e.target.value)} required />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="fecha">Fecha</Label>
            <Input id="fecha" name="fecha" type="date" defaultValue={hoy()} required />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-[1fr_180px]">
          <div className="space-y-2">
            <Label htmlFor="motivo">Motivo</Label>
            <Input id="motivo" name="motivo" placeholder="Bolsas con falla de sellado" required maxLength={300} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="notaRemision">N.R. relacionada</Label>
            <Input id="notaRemision" name="notaRemision" placeholder="649" />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg bg-elevated px-4 py-3">
          <p className="text-sm text-subdued">
            Se descontará de la deuda
            {tipo === "DEVOLUCION" && orden && kgNum > 0 ? ` (${kgNum.toLocaleString("es-BO")} kg × ${formatBs(orden.precio)})` : ""}
          </p>
          <p className="text-xl font-extrabold tabular-nums text-brand-ink">{formatBs(montoCalculado)}</p>
        </div>

        <div className="flex gap-2">
          <Button type="submit" disabled={pendiente || excede || montoCalculado <= 0}>
            {pendiente ? "Guardando…" : tipo === "DEVOLUCION" ? "Registrar devolución" : "Registrar descuento"}
          </Button>
          <Button type="button" variant="ghost" onClick={() => router.back()}>
            Cancelar
          </Button>
        </div>
        <p className="text-xs text-muted">
          Queda en el kardex del cliente con tu nombre y no se puede editar ni borrar. Si te equivocas, Gerencia puede anularla desde el kardex y la registras de nuevo.
        </p>
      </form>
    </div>
  )
}
