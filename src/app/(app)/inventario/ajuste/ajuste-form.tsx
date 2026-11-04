"use client"

import { useTurno } from "@/lib/use-turno"
import { useState } from "react"
import { registrarAjuste } from "@/actions/inventario"
import { unwrap, mensajeError } from "@/lib/action-result"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useRouter } from "next/navigation"
import { ArrowLeft, SlidersHorizontal, Check, AlertCircle, ShieldAlert, Calculator } from "lucide-react"
import Link from "next/link"

interface MaterialConStock {
  id: string
  nombre: string
  categoria: string
  unidad: string
  stock: number
}

const MOTIVOS_AUDITORIA = [
  "Toma física de inventario fin de mes",
  "Pérdida por rotura de saco o derrame",
  "Ajuste por merma de humedad",
  "Corrección por error de digitación",
  "Sobrecupo o pesaje balanza",
]

export function AjusteForm({ materiales }: { materiales: MaterialConStock[] }) {
  const router = useRouter()
  const [materialId, setMaterialId] = useState(materiales[0]?.id || "")
  const [modo, setModo] = useState<"DIRECTO" | "CONTEO_FISICO">("CONTEO_FISICO")
  const [cantidadAjuste, setCantidadAjuste] = useState("")
  const [conteoFisico, setConteoFisico] = useState("")
  const [turno, setTurno] = useTurno()
  const [motivo, setMotivo] = useState(MOTIVOS_AUDITORIA[0])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const selectedMaterial = materiales.find((m) => m.id === materialId)
  const stockSistema = selectedMaterial?.stock || 0

  // Calculate adjustment delta if in physical count mode
  const deltaCalculado =
    modo === "CONTEO_FISICO" && conteoFisico !== ""
      ? Number(conteoFisico) - stockSistema
      : Number(cantidadAjuste) || 0

  const finalAdjustment = modo === "CONTEO_FISICO" ? deltaCalculado : Number(cantidadAjuste)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!materialId) {
      setError("Selecciona un material")
      return
    }
    if (finalAdjustment === 0) {
      setError("El ajuste debe ser distinto de 0 (el conteo coincide con el sistema)")
      return
    }
    if (!motivo.trim()) {
      setError("El motivo es obligatorio para auditoría de inventario")
      return
    }

    setLoading(true)
    setError("")

    const formData = new FormData()
    formData.append("materialId", materialId)
    formData.append("cantidad", finalAdjustment.toString())
    formData.append("turno", turno)
    formData.append("motivo", motivo)

    try {
      unwrap(await registrarAjuste(formData))
      router.push("/inventario")
      router.refresh()
    } catch (err) {
      setError(mensajeError(err, "Error al registrar el ajuste"))
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
          <h1 className="text-lg sm:text-xl font-bold tracking-tight text-fg">
            Ajuste & Auditoría de Stock
          </h1>
          <p className="text-xs text-subdued">
            Corrección inmutable con trazabilidad obligatoria
          </p>
        </div>
      </div>

      <Card className="border-warn/30 shadow-sm bg-card">
        <CardHeader className="pb-3 border-b border-warn/30 bg-warn/10">
          <div className="flex items-center gap-2 text-warn">
            <div className="p-1.5 rounded-lg bg-warn/15 text-warn border border-warn/30">
              <SlidersHorizontal className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold text-fg">
                Ajuste de Saldo de Material
              </CardTitle>
              <p className="text-[11px] text-warn">
                Los registros son inmutables en base de datos.
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-4 space-y-5">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Material Selector */}
            <div className="space-y-1.5">
              <Label htmlFor="materialId" className="text-xs font-semibold text-subdued">
                Material a Ajustar *
              </Label>
              <select
                id="materialId"
                value={materialId}
                onChange={(e) => setMaterialId(e.target.value)}
                className="w-full h-11 rounded-lg border border-line bg-card px-3 text-sm focus:border-warn/60 focus:outline-none"
                required
              >
                {materiales.map((m) => (
                  <option key={m.id} value={m.id}>
                    [{m.categoria}] {m.nombre} (Stock actual: {m.stock.toFixed(2)} {m.unidad})
                  </option>
                ))}
              </select>

              {selectedMaterial && (
                <div className="p-2.5 rounded-lg border border-line bg-elevated text-xs flex items-center justify-between">
                  <span className="text-subdued">Stock teórico en sistema:</span>
                  <span className="font-bold text-fg tabular-nums">
                    {stockSistema.toFixed(2)} {selectedMaterial.unidad}
                  </span>
                </div>
              )}
            </div>

            {/* Mode Toggle: Conteo Físico vs Ajuste Directo */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-subdued">
                Método de Registro
              </Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setModo("CONTEO_FISICO")}
                  className={`p-2.5 rounded-lg text-xs font-semibold border transition text-left ${
 modo === "CONTEO_FISICO"
 ? "bg-warn/10 border-warn/60 text-warn shadow-xs"
 : "bg-card border-line text-subdued hover:bg-elevated"
 }`}
                >
                  <div className="flex items-center gap-1.5">
                    <Calculator className="h-4 w-4 text-warn" />
                    <span>Conteo Físico Real</span>
                  </div>
                  <p className="text-[10px] text-subdued font-normal mt-0.5">
                    Ingresas lo que pesaste y el sistema calcula la diferencia
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setModo("DIRECTO")}
                  className={`p-2.5 rounded-lg text-xs font-semibold border transition text-left ${
 modo === "DIRECTO"
 ? "bg-warn/10 border-warn/60 text-warn shadow-xs"
 : "bg-card border-line text-subdued hover:bg-elevated"
 }`}
                >
                  <div className="flex items-center gap-1.5">
                    <SlidersHorizontal className="h-4 w-4 text-warn" />
                    <span>Diferencia Directa</span>
                  </div>
                  <p className="text-[10px] text-subdued font-normal mt-0.5">
                    Ingresas directamente el valor positivo o negativo (+ / -)
                  </p>
                </button>
              </div>
            </div>

            {/* Inputs based on selected mode */}
            {modo === "CONTEO_FISICO" ? (
              <div className="space-y-2 p-3 rounded-xl border border-warn/30 bg-warn/10">
                <Label htmlFor="conteoFisico" className="text-xs font-semibold text-warn">
                  Stock Físico Pesado en Planta ({selectedMaterial?.unidad || "kg"})
                </Label>
                <div className="relative">
                  <Input
                    id="conteoFisico"
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    placeholder={`ej. ${(stockSistema - 10).toFixed(2)}`}
                    value={conteoFisico}
                    onChange={(e) => setConteoFisico(e.target.value)}
                    required
                    className="h-12 text-lg font-bold text-fg pr-12 bg-card border-warn/30 focus:border-warn/60"
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-muted">
                    {selectedMaterial?.unidad || "kg"}
                  </span>
                </div>

                {conteoFisico !== "" && (
                  <div className="pt-2 border-t border-warn/30 flex items-center justify-between text-xs">
                    <span className="text-subdued">Ajuste resultante a registrar:</span>
                    <span
                      className={`font-bold tabular-nums text-sm ${
 deltaCalculado > 0
 ? "text-accent"
 : deltaCalculado < 0
 ? "text-danger"
 : "text-subdued"
 }`}
                    >
                      {deltaCalculado > 0 ? `+${deltaCalculado.toFixed(2)}` : deltaCalculado.toFixed(2)}{" "}
                      {selectedMaterial?.unidad}
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="cantidadAjuste" className="text-xs font-semibold text-subdued">
                  Cantidad a Ajustar (+ suma / - resta) *
                </Label>
                <Input
                  id="cantidadAjuste"
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  placeholder="ej. -25.5 o +15.0"
                  value={cantidadAjuste}
                  onChange={(e) => setCantidadAjuste(e.target.value)}
                  required
                  className="h-12 text-lg font-bold text-fg focus:border-warn/60"
                />
                <p className="text-[11px] text-subdued">
                  Usa signo menos (-) para mermas o reducciones.
                </p>
              </div>
            )}

            {/* Turno */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-subdued">
                Turno de Auditoría *
              </Label>
              <div className="grid grid-cols-3 gap-2">
                {(["MANANA", "TARDE", "NOCHE"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTurno(t)}
                    className={`h-10 rounded-lg text-xs font-semibold transition border ${
 turno === t
 ? "bg-warn text-white border-warn/60 shadow-xs"
 : "bg-card text-subdued border-line hover:bg-elevated"
 }`}
                  >
                    Turno {t === "MANANA" ? "Mañana" : t === "TARDE" ? "Tarde" : "Noche"}
                  </button>
                ))}
              </div>
            </div>

            {/* Motivo Obligatorio */}
            <div className="space-y-1.5">
              <Label htmlFor="motivo" className="text-xs font-semibold text-subdued flex items-center gap-1.5">
                <ShieldAlert className="h-3.5 w-3.5 text-warn" />
                Motivo / Justificación de Auditoría *
              </Label>
              <Input
                id="motivo"
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder="Indica la razón detallada del ajuste"
                required
                className="h-10 text-sm"
              />
              <div className="flex items-center gap-1.5 flex-wrap pt-1">
                {MOTIVOS_AUDITORIA.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMotivo(m)}
                    className="text-[10px] px-2 py-0.5 rounded bg-highlight hover:bg-highlight text-subdued transition"
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <div className="rounded-lg bg-danger/10 border border-danger/30 p-3 text-xs text-danger flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <Button
              type="submit"
              disabled={loading || finalAdjustment === 0}
              className="w-full h-12 bg-warn hover:bg-warn/90 text-white font-semibold text-sm shadow-sm transition gap-2"
            >
              {loading ? (
                <span>Asentando ajuste...</span>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  <span>
                    Confirmar Ajuste (
                    {finalAdjustment > 0 ? `+${finalAdjustment.toFixed(2)}` : finalAdjustment.toFixed(2)}{" "}
                    {selectedMaterial?.unidad || "kg"})
                  </span>
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
