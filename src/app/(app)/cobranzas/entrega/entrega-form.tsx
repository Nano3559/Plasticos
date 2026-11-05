"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { registrarEntrega } from "@/actions/cobranzas"
import { isActionError } from "@/lib/action-result"
import { formatBs, formatKg, formatNumero, leerNumero, numeroParaEnviar, formatPrecio } from "@/lib/formato"
import { hoyLocal } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { CampoNumero } from "@/components/ui/campo-numero"
import { Encabezado } from "@/components/ui/encabezado"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { MensajeError } from "@/components/ui/mensaje"
import { Selector } from "@/components/ui/selector"

type OrdenOpcion = { id: string; etiqueta: string; pedido: number; producido: number; entregado: number; precio: number }

export function EntregaForm({ ordenes, ordenInicial }: { ordenes: OrdenOpcion[]; ordenInicial?: string }) {
  const router = useRouter()
  const [pendiente, iniciar] = useTransition()
  const [error, setError] = useState("")
  const [ordenId, setOrdenId] = useState(ordenInicial ?? "")
  const [kg, setKg] = useState("")
  const [bultos, setBultos] = useState("")
  const [remision, setRemision] = useState("")
  const [fecha, setFecha] = useState(hoyLocal)

  const o = ordenes.find((x) => x.id === ordenId)
  const k = leerNumero(kg) || 0
  const porEntregar = o ? Math.max(0, o.pedido - o.entregado) : 0
  const masQueProducido = !!o && o.entregado + k > o.producido + 0.5

  return (
    <div className="max-w-2xl space-y-8">
      <Encabezado
        miga={{ href: "/cobranzas", texto: "Cobranzas" }}
        titulo="Registrar entrega"
        descripcion="Producto que sale al cliente con nota de remisión. Genera la deuda al precio de la OT."
      />
      <form
        onSubmit={(e) => {
          e.preventDefault()
          setError("")
          const fd = new FormData()
          fd.set("ordenId", ordenId)
          fd.set("kgEntregados", numeroParaEnviar(kg))
          fd.set("fecha", fecha)
          if (bultos.trim()) fd.set("bultos", numeroParaEnviar(bultos))
          if (remision.trim()) fd.set("notaRemision", remision.trim())
          iniciar(async () => {
            const r = await registrarEntrega(fd)
            if (isActionError(r)) setError(r.error)
            else {
              router.push(`/cobranzas/cliente/${r.clienteId}`)
              router.refresh()
            }
          })
        }}
        className="space-y-6"
      >
        <MensajeError>{error}</MensajeError>
        <div className="space-y-2">
          <Label htmlFor="ordenId">Orden de trabajo</Label>
          <Selector id="ordenId" value={ordenId} onChange={(e) => setOrdenId(e.target.value)} required>
            <option value="" disabled>
              {ordenes.length === 0 ? "No hay órdenes por entregar" : "Elige la OT"}
            </option>
            {ordenes.map((x) => (
              <option key={x.id} value={x.id}>
                {x.etiqueta}
              </option>
            ))}
          </Selector>
          {o && (
            <p className="text-xs text-muted">
              Pedido {formatKg(o.pedido, 0)} · producido {formatKg(o.producido, 0)} · entregado {formatKg(o.entregado, 0)} ·{" "}
              <span className="font-semibold text-fg">faltan {formatKg(porEntregar, 0)}</span> · {formatPrecio(o.precio)}/kg
            </p>
          )}
        </div>
        <div className="grid gap-4 sm:grid-cols-[1fr_140px]">
          <div className="space-y-2">
            <div className="flex items-baseline justify-between">
              <Label htmlFor="kg">Kg entregados</Label>
              {o && porEntregar > 0 && (
                <button type="button" onClick={() => setKg(formatNumero(porEntregar, 2))} className="text-xs font-semibold text-brand-ink hover:underline">
                  Todo lo que falta
                </button>
              )}
            </div>
            <CampoNumero id="kg" valor={kg} onCambio={setKg} unidad="kg" grande placeholder="0" required />
            {masQueProducido && <p className="-mt-3 text-xs text-warn">Es más de lo que figura como producido para esta OT.</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="bultos">Bultos</Label>
            <CampoNumero id="bultos" valor={bultos} onCambio={setBultos} decimales={1} grande placeholder="5,5" />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="remision">N° de nota de remisión</Label>
            <Input id="remision" value={remision} onChange={(e) => setRemision(e.target.value)} maxLength={40} autoComplete="off" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="fecha">Fecha</Label>
            <Input id="fecha" type="date" value={fecha} max={hoyLocal()} onChange={(e) => setFecha(e.target.value)} required />
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg bg-elevated px-4 py-3">
          <p className="text-sm text-subdued">{o && k > 0 ? `${formatNumero(k, 2)} kg × ${formatPrecio(o.precio)}` : "Valor de la entrega"}</p>
          <p className="text-xl font-extrabold tabular-nums text-brand-ink">{formatBs(o ? k * o.precio : 0)}</p>
        </div>
        <p className="-mt-3 text-xs text-muted">Cuando lo entregado llega a lo pedido, la OT pasa sola a «Entregada».</p>
        <div className="flex gap-2">
          <Button type="submit" disabled={pendiente || !ordenId || !(k > 0)}>
            {pendiente ? "Guardando…" : "Registrar entrega"}
          </Button>
          <Button type="button" variant="ghost" onClick={() => router.back()}>
            Cancelar
          </Button>
        </div>
      </form>
    </div>
  )
}
