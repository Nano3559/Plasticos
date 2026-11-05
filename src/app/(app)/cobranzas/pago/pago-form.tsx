"use client"

import { formatBs } from "@/lib/formato"
import { useState } from "react"
import { registrarPago } from "@/actions/cobranzas"
import { unwrap, mensajeError } from "@/lib/action-result"
import { hoyLocal } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useRouter } from "next/navigation"
import { ArrowLeft, QrCode, Banknote, ArrowRightLeft, CreditCard, Check, AlertCircle } from "lucide-react"
import Link from "next/link"

interface ClienteOption {
  id: string
  nombre: string
}

interface OrdenOption {
  id: string
  numero: number
  producto: string
  clienteId: string
}

const MEDIOS_PAGO = [
  { key: "QR", label: "Cobro QR", icon: QrCode, desc: "Pago simple / Banco Unión / BNB" },
  { key: "EFECTIVO", label: "Efectivo", icon: Banknote, desc: "Recibido en planta / caja" },
  { key: "TRANSFERENCIA", label: "Transferencia", icon: ArrowRightLeft, desc: "Depósito bancario directo" },
  { key: "OTRO", label: "Cheque / Otro", icon: CreditCard, desc: "Cheque o documento de pago" },
]

export function PagoForm({
  clientes,
  ordenes,
  clienteInicial,
}: {
  clientes: ClienteOption[]
  ordenes: OrdenOption[]
  clienteInicial?: string
}) {
  const router = useRouter()
  const [clienteId, setClienteId] = useState(clienteInicial || clientes[0]?.id || "")
  const [ordenId, setOrdenId] = useState("")
  const [monto, setMonto] = useState("")
  const [fecha, setFecha] = useState(hoyLocal)
  type MedioPago = "QR" | "EFECTIVO" | "TRANSFERENCIA" | "OTRO"
  const [medio, setMedio] = useState<MedioPago>("QR")
  const [referencia, setReferencia] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const ordenesDelCliente = ordenes.filter((o) => o.clienteId === clienteId)
  const montoNum = Number(monto) || 0

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!clienteId) {
      setError("Selecciona un cliente")
      return
    }
    if (montoNum <= 0) {
      setError("El monto del abono debe ser mayor a 0")
      return
    }

    setLoading(true)
    setError("")

    const formData = new FormData()
    formData.append("clienteId", clienteId)
    formData.append("monto", monto)
    formData.append("fecha", fecha)
    formData.append("medio", medio)
    if (ordenId) formData.append("ordenId", ordenId)
    if (referencia) formData.append("referencia", referencia)

    try {
      unwrap(await registrarPago(formData))
      router.push("/cobranzas")
      router.refresh()
    } catch (err) {
      setError(mensajeError(err, "Error al asentar el abono"))
      setLoading(false)
    }
  }

  return (
    <div className="max-w-xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Link href="/cobranzas">
          <Button variant="ghost" size="sm" className="h-9 w-9 p-0 rounded-lg">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-lg sm:text-xl font-bold tracking-tight text-fg">
            Abono & Cobranza
          </h1>
          <p className="text-xs text-subdued">
            Registro de pagos para amortizar deuda de remisiones en el Kardex
          </p>
        </div>
      </div>

      <Card className="border-line shadow-sm bg-card">
        <CardHeader className="pb-3 border-b border-line">
          <div className="flex items-center gap-2 text-accent">
            <div className="p-1.5 rounded-lg bg-accent/10 text-accent border border-accent/30">
              <Banknote className="h-4 w-4" />
            </div>
            <CardTitle className="text-base font-semibold text-fg">
              Registrar Cobro
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="pt-4 space-y-5">
          <form onSubmit={onSubmit} className="space-y-4">
            {/* Cliente */}
            <div className="space-y-1.5">
              <Label htmlFor="clienteId" className="text-xs font-semibold text-subdued">
                Cliente *
              </Label>
              <select
                id="clienteId"
                value={clienteId}
                onChange={(e) => {
                  setClienteId(e.target.value)
                  setOrdenId("")
                }}
                className="w-full h-11 rounded-lg border border-line bg-card px-3 text-sm focus:border-accent/60 focus:outline-none"
                required
              >
                {clientes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
              </select>
            </div>

            {/* Fecha */}
            <div className="space-y-1.5">
              <Label htmlFor="fecha" className="text-xs font-semibold text-subdued">
                Fecha del Pago *
              </Label>
              <Input
                id="fecha"
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                required
                className="h-10 text-sm"
              />
            </div>

            {/* Monto Input */}
            <div className="space-y-2">
              <Label htmlFor="monto" className="text-xs font-semibold text-subdued">
                Monto Abonado (Bs) *
              </Label>
              <div className="relative">
                <Input
                  id="monto"
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  placeholder="0.00"
                  value={monto}
                  onChange={(e) => setMonto(e.target.value)}
                  required
                  className="h-12 text-lg font-bold text-fg pr-12 focus:border-accent/60"
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-muted">Bs</span>
              </div>
            </div>

            {/* Medio de Pago Selector Pills */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-subdued">
                Canal de Cobro *
              </Label>
              <div className="grid grid-cols-2 gap-2">
                {MEDIOS_PAGO.map((m) => {
                  const Icon = m.icon
                  const active = medio === m.key
                  return (
                    <button
                      key={m.key}
                      type="button"
                      onClick={() => setMedio(m.key as MedioPago)}
                      className={`p-2.5 rounded-xl border text-left transition ${
 active
 ? "bg-accent/10 border-accent/60 text-accent shadow-xs"
 : "bg-card border-line text-subdued hover:bg-elevated"
 }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <Icon className={`h-4 w-4 ${active ? "text-accent" : "text-muted"}`} />
                        <span className="text-xs font-bold">{m.label}</span>
                      </div>
                      <p className="text-[10px] text-subdued mt-0.5 truncate">
                        {m.desc}
                      </p>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Referencia Comprobante */}
            <div className="space-y-1.5">
              <Label htmlFor="referencia" className="text-xs font-semibold text-subdued">
                N° de Comprobante / Transacción (Opcional)
              </Label>
              <Input
                id="referencia"
                placeholder="ej. Transf. BNB #94821, Depósito 0021"
                value={referencia}
                onChange={(e) => setReferencia(e.target.value)}
                className="h-10 text-sm"
              />
            </div>

            {/* Orden de Trabajo Vinculada (Opcional) */}
            {ordenesDelCliente.length > 0 && (
              <div className="space-y-1.5">
                <Label htmlFor="ordenId" className="text-xs font-semibold text-subdued">
                  Amortizar a Pedido Específico (Opcional)
                </Label>
                <select
                  id="ordenId"
                  value={ordenId}
                  onChange={(e) => setOrdenId(e.target.value)}
                  className="w-full h-10 rounded-lg border border-line bg-card px-3 text-sm focus:border-accent/60 focus:outline-none"
                >
                  <option value="">Abono a cuenta general de cliente</option>
                  {ordenesDelCliente.map((ot) => (
                    <option key={ot.id} value={ot.id}>
                      OT #{ot.numero} — {ot.producto}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {error && (
              <div className="rounded-lg bg-danger/10 border border-danger/30 p-3 text-xs text-danger flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <Button
              type="submit"
              disabled={loading || montoNum <= 0}
              className="w-full h-12 bg-brand hover:bg-brand-hover text-on-brand font-semibold text-sm shadow-sm transition gap-2"
            >
              {loading ? (
                <span>Asentando abono...</span>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  <span>Registrar Cobro de {formatBs(montoNum)}</span>
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
