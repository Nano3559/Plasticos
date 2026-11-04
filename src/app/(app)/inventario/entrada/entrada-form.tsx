"use client"

import { useTurno } from "@/lib/use-turno"
import { formatBs } from "@/lib/formato"
import { useState } from "react"
import { registrarEntrada } from "@/actions/inventario"
import { unwrap, mensajeError } from "@/lib/action-result"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useRouter } from "next/navigation"
import { ArrowLeft, ArrowDownToLine, Check, AlertCircle } from "lucide-react"
import Link from "next/link"

interface MaterialOption {
  id: string
  nombre: string
  categoria: string
  unidad: string
  costoPromedio: number
}

const PRESET_KGS = [25, 50, 100, 250, 500, 1000]
const PROVEEDORES_FRECUENTES = ["Braskem", "Dow Chemical", "YPFB", "PoliEtilenos Bolivia", "Reciclador Asociado", "Tintas Gráficas"]

export function EntradaForm({ materiales }: { materiales: MaterialOption[] }) {
  const router = useRouter()
  const [materialId, setMaterialId] = useState(materiales[0]?.id || "")
  const [cantidad, setCantidad] = useState("")
  const [turno, setTurno] = useTurno()
  const [proveedor, setProveedor] = useState("")
  const [lote, setLote] = useState("")
  const [costoUnitario, setCostoUnitario] = useState(() => {
    const m = materiales[0]
    return m && m.costoPromedio > 0 ? m.costoPromedio.toString() : ""
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  // Al elegir otro material se sugiere su costo promedio actual (se puede cambiar)
  function elegirMaterial(id: string) {
    setMaterialId(id)
    const mat = materiales.find((m) => m.id === id)
    setCostoUnitario(mat && mat.costoPromedio > 0 ? mat.costoPromedio.toString() : "")
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!materialId) {
      setError("Selecciona un material")
      return
    }
    if (!cantidad || Number(cantidad) <= 0) {
      setError("Ingresa una cantidad válida mayor a 0")
      return
    }

    setLoading(true)
    setError("")

    const formData = new FormData()
    formData.append("materialId", materialId)
    formData.append("cantidad", cantidad)
    formData.append("turno", turno)
    if (proveedor) formData.append("proveedor", proveedor)
    if (lote) formData.append("lote", lote)
    if (costoUnitario) formData.append("costoUnitario", costoUnitario)

    try {
      unwrap(await registrarEntrada(formData))
      router.push("/inventario")
      router.refresh()
    } catch (err) {
      setError(mensajeError(err, "Error al registrar la entrada"))
      setLoading(false)
    }
  }

  const selectedMaterial = materiales.find((m) => m.id === materialId)

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* Back button and page title */}
      <div className="flex items-center gap-2">
        <Link href="/inventario">
          <Button variant="ghost" size="sm" className="h-9 w-9 p-0 rounded-lg">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-lg sm:text-xl font-bold tracking-tight text-fg">
            Recepción de Materia Prima
          </h1>
          <p className="text-xs text-subdued">
            Ingreso de resinas vírgenes, molidos, masterbatch y tintas al almacén
          </p>
        </div>
      </div>

      <Card className="border-line shadow-sm bg-card">
        <CardHeader className="pb-3 border-b border-line">
          <div className="flex items-center gap-2 text-accent">
            <div className="p-1.5 rounded-lg bg-accent/10 text-accent border border-accent/30">
              <ArrowDownToLine className="h-4 w-4" />
            </div>
            <CardTitle className="text-base font-semibold text-fg">
              Formulario de Entrada
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="pt-4 space-y-5">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Material Selector */}
            <div className="space-y-1.5">
              <Label htmlFor="materialId" className="text-xs font-semibold text-subdued">
                Material / Resina *
              </Label>
              <select
                id="materialId"
                value={materialId}
                onChange={(e) => elegirMaterial(e.target.value)}
                className="w-full h-11 rounded-lg border border-line bg-card px-3 text-sm focus:border-accent/60 focus:outline-none"
                required
              >
                {materiales.map((m) => (
                  <option key={m.id} value={m.id}>
                    [{m.categoria}] {m.nombre} ({m.unidad})
                  </option>
                ))}
              </select>
              {selectedMaterial && (
                <div className="text-[11px] text-subdued flex items-center gap-2">
                  <span>Categoría: <strong>{selectedMaterial.categoria}</strong></span>
                  <span>•</span>
                  <span>Costo ref: <strong>{formatBs(selectedMaterial.costoPromedio)}</strong></span>
                </div>
              )}
            </div>

            {/* Turno Selector */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-subdued">
                Turno de Recepción *
              </Label>
              <div className="grid grid-cols-3 gap-2">
                {(["MANANA", "TARDE", "NOCHE"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTurno(t)}
                    className={`h-10 rounded-lg text-xs font-semibold transition border ${
 turno === t
 ? "bg-brand text-on-brand border-brand shadow-xs"
 : "bg-card text-subdued border-line hover:bg-elevated"
 }`}
                  >
                    Turno {t === "MANANA" ? "Mañana" : t === "TARDE" ? "Tarde" : "Noche"}
                  </button>
                ))}
              </div>
            </div>

            {/* Cantidad Input + Presets */}
            <div className="space-y-2">
              <Label htmlFor="cantidad" className="text-xs font-semibold text-subdued">
                Cantidad Recibida ({selectedMaterial?.unidad || "kg"}) *
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
                  className="h-12 text-lg font-bold text-fg pr-12 focus:border-accent/60"
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-muted">
                  {selectedMaterial?.unidad || "kg"}
                </span>
              </div>

              {/* Quick Presets */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] text-muted">Presets rápidos:</span>
                {PRESET_KGS.map((kg) => (
                  <button
                    key={kg}
                    type="button"
                    onClick={() => setCantidad(kg.toString())}
                    className="text-xs px-2.5 py-1 rounded-md bg-highlight hover:bg-accent/10 hover:text-accent font-semibold text-subdued border border-line transition"
                  >
                    +{kg} kg
                  </button>
                ))}
              </div>
            </div>

            {/* Provider and Batch */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="proveedor" className="text-xs font-semibold text-subdued">
                  Proveedor
                </Label>
                <Input
                  id="proveedor"
                  placeholder="ej. Braskem, Dow, YPFB"
                  value={proveedor}
                  onChange={(e) => setProveedor(e.target.value)}
                  className="h-10 text-sm"
                />
                <div className="flex items-center gap-1 flex-wrap pt-0.5">
                  {PROVEEDORES_FRECUENTES.slice(0, 3).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setProveedor(p)}
                      className="text-[10px] text-subdued hover:text-accent underline"
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="lote" className="text-xs font-semibold text-subdued">
                  Número de Lote / Guía
                </Label>
                <Input
                  id="lote"
                  placeholder="ej. LOT-2026-X8"
                  value={lote}
                  onChange={(e) => setLote(e.target.value)}
                  className="h-10 text-sm"
                />
              </div>
            </div>

            {/* Costo Unitario */}
            <div className="space-y-1.5">
              <Label htmlFor="costoUnitario" className="text-xs font-semibold text-subdued">
                Costo Unitario (Bs / {selectedMaterial?.unidad || "kg"})
              </Label>
              <Input
                id="costoUnitario"
                type="number"
                inputMode="decimal"
                step="0.0001"
                placeholder="ej. 14.50"
                value={costoUnitario}
                onChange={(e) => setCostoUnitario(e.target.value)}
                className="h-10 text-sm"
              />
              <p className="text-[11px] text-muted">
                Si se ingresa, actualizará automáticamente el costo promedio del material.
              </p>
            </div>

            {error && (
              <div className="rounded-lg bg-danger/10 border border-danger/30 p-3 text-xs text-danger flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-brand hover:bg-brand-hover text-on-brand font-semibold text-sm shadow-sm transition gap-2"
            >
              {loading ? (
                <span>Guardando en almacén...</span>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  <span>Registrar Entrada en Almacén</span>
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
