"use client"

import { formatBs } from "@/lib/formato"
import { useState } from "react"
import { registrarEntrega } from "@/actions/cobranzas"
import { unwrap, mensajeError } from "@/lib/action-result"
import { hoyLocal } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useRouter } from "next/navigation"
import { ArrowLeft, Truck, Check, AlertCircle } from "lucide-react"
import Link from "next/link"

interface OrdenOption {
  id: string
  numero: number
  producto: string
  kgPedidos: number
  precioUnitario: number
  cliente: {
    id: string
    nombre: string
  }
}

export function EntregaForm({ ordenes }: { ordenes: OrdenOption[] }) {
  const router = useRouter()
  const [ordenId, setOrdenId] = useState(ordenes[0]?.id || "")
  const [fecha, setFecha] = useState(hoyLocal)
  const [kgEntregados, setKgEntregados] = useState("")
  const [notaRemision, setNotaRemision] = useState("")
  const [bultos, setBultos] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const selectedOt = ordenes.find((ot) => ot.id === ordenId)
  const kgNum = Number(kgEntregados) || 0
  const valorTotal = selectedOt ? kgNum * Number(selectedOt.precioUnitario) : 0

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!ordenId) {
      setError("Selecciona una orden de trabajo")
      return
    }
    if (kgNum <= 0) {
      setError("La cantidad entregada debe ser mayor a 0")
      return
    }

    setLoading(true)
    setError("")

    const formData = new FormData()
    formData.append("ordenId", ordenId)
    formData.append("fecha", fecha)
    formData.append("kgEntregados", kgEntregados)
    if (notaRemision) formData.append("notaRemision", notaRemision)
    if (bultos) formData.append("bultos", bultos)

    try {
      unwrap(await registrarEntrega(formData))
      router.push("/cobranzas")
      router.refresh()
    } catch (err) {
      setError(mensajeError(err, "Error al registrar la entrega"))
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
            Nota de Remisión & Entrega
          </h1>
          <p className="text-xs text-subdued">
            Despacho de bultos terminados y generación de deuda a crédito
          </p>
        </div>
      </div>

      <Card className="border-line shadow-sm bg-card">
        <CardHeader className="pb-3 border-b border-line">
          <div className="flex items-center gap-2 text-info">
            <div className="p-1.5 rounded-lg bg-info/10 text-info border border-info/30">
              <Truck className="h-4 w-4" />
            </div>
            <CardTitle className="text-base font-semibold text-fg">
              Despacho a Cliente
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="pt-4 space-y-5">
          <form onSubmit={onSubmit} className="space-y-4">
            {/* OT Selector */}
            <div className="space-y-1.5">
              <Label htmlFor="ordenId" className="text-xs font-semibold text-subdued">
                Orden de Trabajo / Pedido *
              </Label>
              <select
                id="ordenId"
                value={ordenId}
                onChange={(e) => setOrdenId(e.target.value)}
                className="w-full h-11 rounded-lg border border-line bg-card px-3 text-sm focus:border-info/60 focus:outline-none"
                required
              >
                {ordenes.map((ot) => (
                  <option key={ot.id} value={ot.id}>
                    OT #{ot.numero} — {ot.producto} ({ot.cliente.nombre})
                  </option>
                ))}
              </select>

              {selectedOt && (
                <div className="p-3 rounded-xl bg-elevated border border-line space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-subdued">Cliente destinatario:</span>
                    <strong className="text-fg">{selectedOt.cliente.nombre}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-subdued">Total pedido en OT:</span>
                    <span className="font-bold text-fg">{Number(selectedOt.kgPedidos).toFixed(2)} kg</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-subdued">Precio pactado:</span>
                    <span className="font-semibold text-accent">
                      {formatBs(Number(selectedOt.precioUnitario))} / kg
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Fecha */}
            <div className="space-y-1.5">
              <Label htmlFor="fecha" className="text-xs font-semibold text-subdued">
                Fecha de Entrega *
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

            {/* Kg Entregados */}
            <div className="space-y-2">
              <Label htmlFor="kgEntregados" className="text-xs font-semibold text-subdued">
                Kilogramos Entregados (Pesaje en Báscula) *
              </Label>
              <div className="relative">
                <Input
                  id="kgEntregados"
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  placeholder="0.00"
                  value={kgEntregados}
                  onChange={(e) => setKgEntregados(e.target.value)}
                  required
                  className="h-12 text-lg font-bold text-fg pr-12 focus:border-info/60"
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-muted">
                  kg
                </span>
              </div>
            </div>

            {/* Bultos and Nota Remision */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="notaRemision" className="text-xs font-semibold text-subdued">
                  N° Nota de Remisión / Guía
                </Label>
                <Input
                  id="notaRemision"
                  placeholder="ej. REM-0492"
                  value={notaRemision}
                  onChange={(e) => setNotaRemision(e.target.value)}
                  className="h-10 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="bultos" className="text-xs font-semibold text-subdued">
                  Cantidad de Bultos / Paquetes
                </Label>
                <Input
                  id="bultos"
                  type="number"
                  placeholder="ej. 10 paquetes"
                  value={bultos}
                  onChange={(e) => setBultos(e.target.value)}
                  className="h-10 text-sm"
                />
              </div>
            </div>

            {/* Total value preview */}
            {selectedOt && kgNum > 0 && (
              <div className="p-3.5 rounded-xl border border-info/30 bg-info/10 flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-info">
                    Importe de Remisión a Crédito:
                  </span>
                  <p className="text-[11px] text-info">
                    {kgNum.toFixed(2)} kg × {formatBs(Number(selectedOt.precioUnitario))}
                  </p>
                </div>
                <div className="text-lg font-bold text-info tabular-nums">
                  {formatBs(valorTotal)}
                </div>
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
              disabled={loading || kgNum <= 0}
              className="w-full h-12 bg-brand hover:bg-brand-hover text-on-brand font-semibold text-sm shadow-sm transition gap-2"
            >
              {loading ? (
                <span>Registrando entrega...</span>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  <span>Confirmar Despacho a Cliente</span>
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
