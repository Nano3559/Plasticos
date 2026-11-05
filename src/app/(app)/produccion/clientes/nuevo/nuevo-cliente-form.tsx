"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { crearCliente } from "@/actions/produccion"
import { isActionError } from "@/lib/action-result"
import { Button } from "@/components/ui/button"
import { Encabezado } from "@/components/ui/encabezado"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { MensajeError } from "@/components/ui/mensaje"

const PLAZOS = [0, 15, 30, 60]

export function NuevoClienteForm({ volverAOrden }: { volverAOrden: boolean }) {
  const router = useRouter()
  const [pendiente, iniciar] = useTransition()
  const [error, setError] = useState("")
  const [dias, setDias] = useState("15")

  return (
    <div className="max-w-2xl space-y-8">
      <Encabezado
        miga={
          volverAOrden
            ? [
                { href: "/produccion/ordenes", texto: "Órdenes" },
                { href: "/produccion/ordenes/nueva", texto: "Nueva orden" },
              ]
            : [
                { href: "/produccion", texto: "Producción" },
                { href: "/produccion/clientes", texto: "Clientes" },
              ]
        }
        titulo="Cliente nuevo"
        descripcion={volverAOrden ? "Después de guardarlo vuelves a la orden con este cliente elegido." : undefined}
      />

      <form
        onSubmit={(e) => {
          e.preventDefault()
          setError("")
          const fd = new FormData(e.currentTarget)
          fd.set("diasCredito", dias.trim() || "0")
          iniciar(async () => {
            const r = await crearCliente(fd)
            if (isActionError(r)) setError(r.error)
            else router.push(volverAOrden ? `/produccion/ordenes/nueva?cliente=${r.id}` : "/produccion/clientes")
          })
        }}
        className="space-y-6"
      >
        <MensajeError>{error}</MensajeError>

        <div className="space-y-2">
          <Label htmlFor="nombre">Nombre o razón social</Label>
          <Input id="nombre" name="nombre" placeholder="Distribuidora Santa Cruz S.R.L." required maxLength={120} autoFocus />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="contacto">Persona de contacto</Label>
            <Input id="contacto" name="contacto" placeholder="Carlos Gómez" maxLength={80} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="telefono">Teléfono o WhatsApp</Label>
            <Input id="telefono" name="telefono" type="tel" inputMode="tel" placeholder="70012345" maxLength={30} />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="direccion">Dirección de entrega</Label>
          <Input id="direccion" name="direccion" placeholder="Av. Doble Vía km 6" maxLength={200} />
        </div>

        <fieldset>
          <legend className="mb-2 text-sm font-semibold">Días de crédito</legend>
          <div className="flex flex-wrap items-center gap-2">
            {PLAZOS.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDias(String(d))}
                aria-pressed={dias === String(d)}
                className={`h-10 rounded-full border px-4 text-sm font-medium transition ${
                  dias === String(d) ? "border-brand bg-brand-soft text-brand-ink" : "border-line text-subdued hover:bg-elevated"
                }`}
              >
                {d === 0 ? "Contado" : `${d} días`}
              </button>
            ))}
            <Input
              aria-label="Otro plazo en días"
              inputMode="numeric"
              value={dias}
              onChange={(e) => setDias(e.target.value.replace(/\D/g, ""))}
              className="w-24"
            />
          </div>
          <p className="mt-2 text-xs text-muted">Pasado este plazo, la deuda aparece como vencida en Cobranzas.</p>
        </fieldset>

        <div className="flex gap-2">
          <Button type="submit" disabled={pendiente}>
            {pendiente ? "Guardando…" : "Guardar cliente"}
          </Button>
          <Button type="button" variant="ghost" onClick={() => router.back()}>
            Cancelar
          </Button>
        </div>
      </form>
    </div>
  )
}
