"use client"

import { useTurno } from "@/lib/use-turno"
import { formatBs } from "@/lib/formato"
import { useState } from "react"
import { registrarCostoTurno } from "@/actions/costos"
import { unwrap, mensajeError } from "@/lib/action-result"
import { hoyLocal } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useRouter } from "next/navigation"
import { ArrowLeft, Users, Zap, Check, AlertCircle, Calculator } from "lucide-react"
import Link from "next/link"

const PRESETS_MO = [300, 450, 600, 800]
const PRESETS_ENERGIA = [150, 250, 350, 500]

export default function CostoTurnoPage() {
  const router = useRouter()
  const [fecha, setFecha] = useState(hoyLocal)
  const [turno, setTurno] = useTurno()
  const [manoObra, setManoObra] = useState("")
  const [energia, setEnergia] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const moNum = Number(manoObra) || 0
  const enNum = Number(energia) || 0
  const totalTurno = moNum + enNum

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (moNum <= 0 || enNum <= 0) {
      setError("Mano de obra y energía deben ser mayores a 0")
      return
    }

    setLoading(true)
    setError("")

    const formData = new FormData()
    formData.append("fecha", fecha)
    formData.append("turno", turno)
    formData.append("manoObra", manoObra)
    formData.append("energia", energia)

    try {
      unwrap(await registrarCostoTurno(formData))
      router.push("/costos")
      router.refresh()
    } catch (err) {
      setError(mensajeError(err, "Error al registrar costos del turno"))
      setLoading(false)
    }
  }

  return (
    <div className="max-w-xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Link href="/costos">
          <Button variant="ghost" size="sm" className="h-9 w-9 p-0 rounded-lg">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-lg sm:text-xl font-bold tracking-tight text-fg">
            Costo Operativo por Turno
          </h1>
          <p className="text-xs text-subdued">
            Asignación de costos para el cálculo industrial de conversión por 100 kg
          </p>
        </div>
      </div>

      <Card className="border-line shadow-sm bg-card">
        <CardHeader className="pb-3 border-b border-line">
          <div className="flex items-center gap-2 text-info">
            <div className="p-1.5 rounded-lg bg-info/10 text-info border border-info/30">
              <Calculator className="h-4 w-4" />
            </div>
            <CardTitle className="text-base font-semibold text-fg">
              Planilla & Electricidad del Turno
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="pt-4 space-y-5">
          <form onSubmit={onSubmit} className="space-y-4">
            {/* Fecha */}
            <div className="space-y-1.5">
              <Label htmlFor="fecha" className="text-xs font-semibold text-subdued">
                Fecha del Turno *
              </Label>
              <Input
                id="fecha"
                name="fecha"
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                required
                className="h-10 text-sm"
              />
            </div>

            {/* Turno Selector */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-subdued">
                Turno *
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

            {/* Mano de Obra Input */}
            <div className="space-y-2">
              <Label htmlFor="manoObra" className="text-xs font-semibold text-subdued flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-subdued" />
                Mano de Obra (Bs) *
              </Label>
              <div className="relative">
                <Input
                  id="manoObra"
                  name="manoObra"
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  placeholder="0.00"
                  value={manoObra}
                  onChange={(e) => setManoObra(e.target.value)}
                  required
                  className="h-11 text-base font-bold text-fg pr-12 focus:border-info/60"
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-muted">Bs</span>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] text-muted">Presets:</span>
                {PRESETS_MO.map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setManoObra(val.toString())}
                    className="text-xs px-2 py-0.5 rounded bg-highlight hover:bg-info/10 hover:text-info text-subdued font-semibold transition"
                  >
                    Bs {val}
                  </button>
                ))}
              </div>
            </div>

            {/* Energía Eléctrica Input */}
            <div className="space-y-2">
              <Label htmlFor="energia" className="text-xs font-semibold text-subdued flex items-center gap-1.5">
                <Zap className="h-3.5 w-3.5 text-warn" />
                Energía Eléctrica Consumida (Bs) *
              </Label>
              <div className="relative">
                <Input
                  id="energia"
                  name="energia"
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  placeholder="0.00"
                  value={energia}
                  onChange={(e) => setEnergia(e.target.value)}
                  required
                  className="h-11 text-base font-bold text-fg pr-12 focus:border-info/60"
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-muted">Bs</span>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] text-muted">Presets:</span>
                {PRESETS_ENERGIA.map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setEnergia(val.toString())}
                    className="text-xs px-2 py-0.5 rounded bg-highlight hover:bg-warn/10 hover:text-warn text-subdued font-semibold transition"
                  >
                    Bs {val}
                  </button>
                ))}
              </div>
            </div>

            {/* Total Live Preview */}
            <div className="p-3.5 rounded-xl border border-info/30 bg-info/10 flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-info">
                  Total Costo Directo del Turno:
                </span>
                <p className="text-[11px] text-info">
                  Mano de obra + Energía
                </p>
              </div>
              <div className="text-lg font-bold text-info tabular-nums">
                {formatBs(totalTurno)}
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
              disabled={loading || totalTurno <= 0}
              className="w-full h-12 bg-brand hover:bg-brand-hover text-on-brand font-semibold text-sm shadow-sm transition gap-2"
            >
              {loading ? (
                <span>Guardando costos...</span>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  <span>Registrar Costo del Turno</span>
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
