"use client"

import { useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { PackageX, Percent } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { registrarNotaCredito } from "@/actions/cobranzas"
import { isActionError } from "@/lib/action-result"
import { formatBs, leerNumero, numeroParaEnviar } from "@/lib/formato"
import { CampoNumero } from "@/components/ui/campo-numero"
import { Encabezado } from "@/components/ui/encabezado"
import { MensajeError } from "@/components/ui/mensaje"
import { Selector } from "@/components/ui/selector"

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
  const kgNum = leerNumero(kg) || 0
  const montoCalculado = tipo === "DEVOLUCION" && orden ? Math.round(kgNum * orden.precio * 100) / 100 : leerNumero(monto) || 0
  const excede = tipo === "DEVOLUCION" && orden ? kgNum > orden.disponibleKg + 0.005 : false

  return (
    <div className="max-w-2xl space-y-8">
      <Encabezado
        miga={{ href: "/cobranzas", texto: "Cobranzas" }}
        titulo="Devolución o descuento"
        descripcion="Rebaja lo que el cliente debe. No cuenta como cobro: no entró plata."
      />

      <form
        onSubmit={(e) => {
          e.preventDefault()
          setError("")
          const fd = new FormData(e.currentTarget)
          fd.set("tipo", tipo)
          if (kg) fd.set("kg", numeroParaEnviar(kg))
          if (monto) fd.set("monto", numeroParaEnviar(monto))
          iniciar(async () => {
            const r = await registrarNotaCredito(fd)
            if (isActionError(r)) setError(r.error)
            else router.push(`/cobranzas/resumen?cliente=${clienteId}`)
          })
        }}
        className="space-y-6"
      >
        <MensajeError>{error}</MensajeError>

        <div className="space-y-2">
          <Label htmlFor="clienteId">Cliente</Label>
          <Selector
            id="clienteId"
            name="clienteId"
            required
            value={clienteId}
            onChange={(e) => {
              setClienteId(e.target.value)
              setOrdenId("")
            }}
          >
            <option value="" disabled>
              Elige el cliente
            </option>
            {clientes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </Selector>
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
          <Selector
            id="ordenId"
            name="ordenId"
            value={ordenId}
            onChange={(e) => setOrdenId(e.target.value)}
            required={tipo === "DEVOLUCION"}
            disabled={!clienteId}
          >
            <option value="">{!clienteId ? "Primero elige el cliente" : delCliente.length === 0 ? "Este cliente no tiene entregas" : "Elige la OT"}</option>
            {delCliente.map((o) => (
              <option key={o.id} value={o.id} disabled={tipo === "DEVOLUCION" && o.disponibleKg <= 0}>
                {o.etiqueta} — {formatBs(o.precio)}/kg{tipo === "DEVOLUCION" ? ` · hasta ${o.disponibleKg.toLocaleString("es-BO")} kg` : ""}
              </option>
            ))}
          </Selector>
          {orden && orden.remisiones.length > 0 && (
            <p className="text-xs text-muted">Notas de remisión de esta OT: {orden.remisiones.slice(0, 8).join(", ")}</p>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {tipo === "DEVOLUCION" ? (
            <div className="space-y-2">
              <Label htmlFor="kg">Kg devueltos</Label>
<CampoNumero id="kg" valor={kg} onCambio={setKg} unidad="kg" placeholder="13,60" aria-invalid={excede || undefined} required />
              {excede && orden && <p className="text-xs text-danger">Máximo {orden.disponibleKg.toLocaleString("es-BO")} kg para esta OT.</p>}
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="monto">Monto a descontar (Bs)</Label>
              <CampoNumero id="monto" valor={monto} onCambio={setMonto} unidad="Bs" placeholder="150,00" required />
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
