"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { ArrowRightLeft, Banknote, FileText, QrCode } from "lucide-react"
import { registrarPago } from "@/actions/cobranzas"
import { isActionError } from "@/lib/action-result"
import { formatBs, formatNumero, leerNumero, numeroParaEnviar } from "@/lib/formato"
import { hoyLocal } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { CampoNumero } from "@/components/ui/campo-numero"
import { Encabezado } from "@/components/ui/encabezado"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { MensajeError } from "@/components/ui/mensaje"
import { Opciones } from "@/components/ui/opciones"
import { Selector } from "@/components/ui/selector"

type Medio = "QR" | "EFECTIVO" | "TRANSFERENCIA" | "OTRO"

export function PagoForm({
  clientes,
  ordenes,
  clienteInicial,
}: {
  clientes: { id: string; nombre: string; saldo: number; aFavor: number }[]
  ordenes: { id: string; clienteId: string; etiqueta: string }[]
  clienteInicial?: string
}) {
  const router = useRouter()
  const [pendiente, iniciar] = useTransition()
  const [error, setError] = useState("")
  const [clienteId, setClienteId] = useState(clienteInicial ?? "")
  const [ordenId, setOrdenId] = useState("")
  const [monto, setMonto] = useState("")
  const [fecha, setFecha] = useState(hoyLocal)
  const [medio, setMedio] = useState<Medio | "">("")
  const [referencia, setReferencia] = useState("")

  const cliente = clientes.find((c) => c.id === clienteId)
  const delCliente = ordenes.filter((o) => o.clienteId === clienteId)
  const m = leerNumero(monto) || 0
  const excede = !!cliente && cliente.saldo > 0 && m > cliente.saldo + 0.005

  return (
    <div className="max-w-2xl space-y-8">
      <Encabezado miga={{ href: "/cobranzas", texto: "Cobranzas" }} titulo="Registrar pago" descripcion="Plata que entró. Se descuenta de la deuda más antigua del cliente." />
      <form
        onSubmit={(e) => {
          e.preventDefault()
          setError("")
          if (!medio) return setError("Elige cómo pagó.")
          const fd = new FormData()
          fd.set("clienteId", clienteId)
          fd.set("monto", numeroParaEnviar(monto))
          fd.set("fecha", fecha)
          fd.set("medio", medio)
          if (ordenId) fd.set("ordenId", ordenId)
          if (referencia.trim()) fd.set("referencia", referencia.trim())
          iniciar(async () => {
            const r = await registrarPago(fd)
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
          <Label htmlFor="clienteId">Cliente</Label>
          <Selector
            id="clienteId"
            value={clienteId}
            onChange={(e) => {
              setClienteId(e.target.value)
              setOrdenId("")
            }}
            required
          >
            <option value="" disabled>
              Elige el cliente
            </option>
            {clientes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
                {c.saldo > 0.5 ? ` — debe ${formatBs(c.saldo, 0)}` : ""}
              </option>
            ))}
          </Selector>
          {cliente && (
            <p className="text-xs text-muted">
              {cliente.saldo > 0.5 ? (
                <>
                  Debe <span className="font-semibold text-fg">{formatBs(cliente.saldo)}</span>
                </>
              ) : cliente.aFavor > 0 ? (
                `Tiene ${formatBs(cliente.aFavor)} a favor`
              ) : (
                "Está al día"
              )}
            </p>
          )}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <div className="flex items-baseline justify-between">
              <Label htmlFor="monto">Monto</Label>
              {cliente && cliente.saldo > 0.5 && (
                <button type="button" onClick={() => setMonto(formatNumero(cliente.saldo, 2))} className="text-xs font-semibold text-brand-ink hover:underline">
                  Todo el saldo
                </button>
              )}
            </div>
            <CampoNumero id="monto" valor={monto} onCambio={setMonto} unidad="Bs" grande placeholder="0" required />
            {excede && <p className="-mt-3 text-xs text-warn">Es más que la deuda: el resto queda a favor del cliente.</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="fecha">Fecha</Label>
            <Input id="fecha" type="date" value={fecha} max={hoyLocal()} onChange={(e) => setFecha(e.target.value)} required className="h-12" />
          </div>
        </div>
        <Opciones<Medio>
          nombre="medio"
          etiqueta="¿Cómo pagó?"
          valor={medio}
          onCambio={setMedio}
          columnas={4}
          opciones={[
            { valor: "QR", texto: "QR", icono: QrCode },
            { valor: "EFECTIVO", texto: "Efectivo", icono: Banknote },
            { valor: "TRANSFERENCIA", texto: "Transferencia", icono: ArrowRightLeft },
            { valor: "OTRO", texto: "Cheque u otro", icono: FileText },
          ]}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="referencia">N° de operación o recibo</Label>
            <Input id="referencia" value={referencia} onChange={(e) => setReferencia(e.target.value)} maxLength={60} autoComplete="off" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ordenId">Para una OT (opcional)</Label>
            <Selector id="ordenId" value={ordenId} onChange={(e) => setOrdenId(e.target.value)} disabled={!clienteId}>
              <option value="">Abono general</option>
              {delCliente.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.etiqueta}
                </option>
              ))}
            </Selector>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg bg-elevated px-4 py-3">
          <p className="text-sm text-subdued">
            {cliente && cliente.saldo > 0.5 && m > 0 ? `Queda debiendo ${formatBs(Math.max(0, cliente.saldo - m))}` : "Monto del pago"}
          </p>
          <p className="text-xl font-extrabold tabular-nums text-brand-ink">{formatBs(m)}</p>
        </div>
        <div className="flex gap-2">
          <Button type="submit" disabled={pendiente || !clienteId || !(m > 0) || !medio}>
            {pendiente ? "Guardando…" : "Registrar pago"}
          </Button>
          <Button type="button" variant="ghost" onClick={() => router.back()}>
            Cancelar
          </Button>
        </div>
      </form>
    </div>
  )
}
