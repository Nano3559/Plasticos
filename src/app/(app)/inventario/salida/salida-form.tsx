"use client"

import { useState, useEffect } from "react"
import { registrarSalida } from "@/actions/inventario"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useRouter } from "next/navigation"
import { ArrowLeft, ArrowUpFromLine, Check, AlertTriangle, AlertCircle, FileText } from "lucide-react"
import Link from "next/link"

interface MaterialConStock {
  id: string
  nombre: string
  categoria: string
  unidad: string
  stock: number
}

interface OrdenOption {
  id: string
  numero: number
  producto: string
  clienteNombre: string
}

const MOTIVOS_FRECUENTES = [
  "Carga Extrusora 1",
  "Carga Extrusora 2",
  "Acondicionamiento de Mezcla (50/50)",
  "Tinta / Solvente a Impresora",
  "Confección / Insumos",
  "Pruebas de Calibración",
]

export function SalidaForm({
  materiales,
  ordenes,
}: {
  materiales: MaterialConStock[]
  ordenes: OrdenOption[]
}) {
  const router = useRouter()
  const [materialId, setMaterialId] = useState(materiales[0]?.id || "")
  const [cantidad, setCantidad] = useState("")
  const [turno, setTurno] = useState<"MANANA" | "TARDE" | "NOCHE">("MANANA")
  const [motivo, setMotivo] = useState(MOTIVOS_FRECUENTES[0])
  const [ordenId, setOrdenId] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  // Shift auto-detection
  useEffect(() => {
    const hora = new Date().getHours()
    if (hora >= 6 && hora < 14) setTurno("MANANA")
    else if (hora >= 14 && hora < 22) setTurno("TARDE")
    else setTurno("NOCHE")
  }, [])

  const selectedMaterial = materiales.find((m) => m.id === materialId)
  const stockDisponible = selectedMaterial?.stock || 0
  const cantNum = Number(cantidad) || 0
  const excedeStock = cantNum > stockDisponible

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!materialId) {
      setError("Selecciona un material")
      return
    }
    if (cantNum <= 0) {
      setError("La cantidad debe ser mayor a 0")
      return
    }
    if (excedeStock) {
      setError(`Stock insuficiente. Solo hay ${stockDisponible.toFixed(2)} ${selectedMaterial?.unidad || "kg"} disponibles`)
      return
    }
    if (!motivo.trim()) {
      setError("Debes indicar el motivo o destino de salida")
      return
    }

    setLoading(true)
    setError("")

    const formData = new FormData()
    formData.append("materialId", materialId)
    formData.append("cantidad", cantidad)
    formData.append("turno", turno)
    formData.append("motivo", motivo)
    if (ordenId) formData.append("ordenId", ordenId)

    try {
      await registrarSalida(formData)
      router.push("/inventario")
      router.refresh()
    } catch (err: any) {
      setError(err.message || "Error al registrar la salida")
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Link href="/inventario">
          <Button variant="ghost" size="sm" className="h-9 w-9 p-0 rounded-lg">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900">
            Vale de Salida a Planta
          </h1>
          <p className="text-xs text-slate-500">
            Despacho de resinas, molido o tintas a las máquinas operativas
          </p>
        </div>
      </div>

      <Card className="border-slate-200 shadow-sm bg-white">
        <CardHeader className="pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2 text-sky-700">
            <div className="p-1.5 rounded-lg bg-sky-50 text-sky-700 border border-sky-200">
              <ArrowUpFromLine className="h-4 w-4" />
            </div>
            <CardTitle className="text-base font-semibold text-slate-900">
              Registrar Despacho
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="pt-4 space-y-5">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Material Selector with live stock badge */}
            <div className="space-y-1.5">
              <Label htmlFor="materialId" className="text-xs font-semibold text-slate-700">
                Material a Despachar *
              </Label>
              <select
                id="materialId"
                value={materialId}
                onChange={(e) => setMaterialId(e.target.value)}
                className="w-full h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm focus:border-sky-500 focus:outline-none"
                required
              >
                {materiales.map((m) => (
                  <option key={m.id} value={m.id}>
                    [{m.categoria}] {m.nombre} — Stock: {m.stock.toFixed(2)} {m.unidad}
                  </option>
                ))}
              </select>

              {selectedMaterial && (
                <div
                  className={`p-2.5 rounded-lg border text-xs flex items-center justify-between ${
                    stockDisponible <= 0
                      ? "bg-rose-50 border-rose-200 text-rose-800"
                      : "bg-slate-50 border-slate-200 text-slate-700"
                  }`}
                >
                  <span>Stock disponible en bodega:</span>
                  <span className="font-bold tabular-nums">
                    {stockDisponible.toFixed(2)} {selectedMaterial.unidad}
                  </span>
                </div>
              )}
            </div>

            {/* Turno */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">
                Turno Operativo *
              </Label>
              <div className="grid grid-cols-3 gap-2">
                {(["MANANA", "TARDE", "NOCHE"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTurno(t)}
                    className={`h-10 rounded-lg text-xs font-semibold transition border ${
                      turno === t
                        ? "bg-sky-600 text-white border-sky-600 shadow-xs"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    Turno {t === "MANANA" ? "Mañana" : t === "TARDE" ? "Tarde" : "Noche"}
                  </button>
                ))}
              </div>
            </div>

            {/* Cantidad Input */}
            <div className="space-y-2">
              <Label htmlFor="cantidad" className="text-xs font-semibold text-slate-700">
                Cantidad a Entregar ({selectedMaterial?.unidad || "kg"}) *
              </Label>
              <div className="relative">
                <Input
                  id="cantidad"
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  placeholder="0.00"
                  value={cantidad}
                  onChange={(e) => setCantidad(e.target.value)}
                  required
                  className={`h-12 text-lg font-bold pr-12 ${
                    excedeStock
                      ? "border-rose-500 text-rose-600 focus:border-rose-500"
                      : "text-slate-900 focus:border-sky-500"
                  }`}
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                  {selectedMaterial?.unidad || "kg"}
                </span>
              </div>

              {excedeStock && (
                <div className="text-xs text-rose-600 flex items-center gap-1.5 font-medium">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>
                    La cantidad supera el stock en bodega ({stockDisponible.toFixed(2)} {selectedMaterial?.unidad}).
                  </span>
                </div>
              )}

              {/* Quick presets that fit within stock */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] text-slate-400">Pre-establecidos:</span>
                {[25, 50, 100, 200].map((kg) => (
                  <button
                    key={kg}
                    type="button"
                    onClick={() => setCantidad(kg.toString())}
                    className="text-xs px-2.5 py-1 rounded-md bg-slate-100 hover:bg-sky-50 hover:text-sky-700 font-semibold text-slate-700 border border-slate-200/80 transition"
                  >
                    {kg} kg
                  </button>
                ))}
                {stockDisponible > 0 && (
                  <button
                    type="button"
                    onClick={() => setCantidad(stockDisponible.toString())}
                    className="text-xs px-2.5 py-1 rounded-md bg-sky-50 text-sky-700 font-semibold border border-sky-200 hover:bg-sky-100 transition"
                  >
                    Todo el stock ({stockDisponible.toFixed(2)} kg)
                  </button>
                )}
              </div>
            </div>

            {/* Motivo / Destino */}
            <div className="space-y-1.5">
              <Label htmlFor="motivo" className="text-xs font-semibold text-slate-700">
                Destino / Motivo de Salida *
              </Label>
              <Input
                id="motivo"
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder="ej. Alimentación extrusora 1, mezcla con reciclado"
                required
                className="h-10 text-sm"
              />
              <div className="flex items-center gap-1.5 flex-wrap pt-1">
                {MOTIVOS_FRECUENTES.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMotivo(m)}
                    className="text-[10px] px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 transition"
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            {/* Orden de Trabajo Vinculada */}
            <div className="space-y-1.5">
              <Label htmlFor="ordenId" className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5 text-slate-400" />
                Vincular a Orden de Trabajo (Opcional)
              </Label>
              <select
                id="ordenId"
                value={ordenId}
                onChange={(e) => setOrdenId(e.target.value)}
                className="w-full h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm focus:border-sky-500 focus:outline-none"
              >
                <option value="">Sin vincular a OT específica</option>
                {ordenes.map((ot) => (
                  <option key={ot.id} value={ot.id}>
                    OT-{ot.numero} • {ot.producto} ({ot.clienteNombre})
                  </option>
                ))}
              </select>
            </div>

            {error && (
              <div className="rounded-lg bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <Button
              type="submit"
              disabled={loading || excedeStock}
              className="w-full h-12 bg-sky-600 hover:bg-sky-500 text-white font-semibold text-sm shadow-sm transition gap-2"
            >
              {loading ? (
                <span>Despachando...</span>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  <span>Confirmar Despacho a Planta</span>
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
