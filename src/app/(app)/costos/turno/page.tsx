"use client"

import { useState, useEffect } from "react"
import { registrarCostoTurno } from "@/actions/costos"
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
  const [fecha, setFecha] = useState(new Date().toISOString().split("T")[0])
  const [turno, setTurno] = useState<"MANANA" | "TARDE" | "NOCHE">("MANANA")
  const [manoObra, setManoObra] = useState("")
  const [energia, setEnergia] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    const hora = new Date().getHours()
    if (hora >= 6 && hora < 14) setTurno("MANANA")
    else if (hora >= 14 && hora < 22) setTurno("TARDE")
    else setTurno("NOCHE")
  }, [])

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
      await registrarCostoTurno(formData)
      router.push("/costos")
      router.refresh()
    } catch (err: any) {
      setError(err.message || "Error al registrar costos del turno")
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
          <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900">
            Costo Operativo por Turno
          </h1>
          <p className="text-xs text-slate-500">
            Asignación de costos para el cálculo industrial de conversión por 100 kg
          </p>
        </div>
      </div>

      <Card className="border-slate-200 shadow-sm bg-white">
        <CardHeader className="pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2 text-sky-700">
            <div className="p-1.5 rounded-lg bg-sky-50 text-sky-700 border border-sky-200">
              <Calculator className="h-4 w-4" />
            </div>
            <CardTitle className="text-base font-semibold text-slate-900">
              Planilla & Electricidad del Turno
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="pt-4 space-y-5">
          <form onSubmit={onSubmit} className="space-y-4">
            {/* Fecha */}
            <div className="space-y-1.5">
              <Label htmlFor="fecha" className="text-xs font-semibold text-slate-700">
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
              <Label className="text-xs font-semibold text-slate-700">
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
                        ? "bg-sky-600 text-white border-sky-600 shadow-xs"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    Turno {t === "MANANA" ? "Mañana" : t === "TARDE" ? "Tarde" : "Noche"}
                  </button>
                ))}
              </div>
            </div>

            {/* Mano de Obra Input */}
            <div className="space-y-2">
              <Label htmlFor="manoObra" className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-slate-500" />
                Mano de Obra (Bs.) *
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
                  className="h-11 text-base font-bold text-slate-900 pr-12 focus:border-sky-500"
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                  Bs.
                </span>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] text-slate-400">Presets:</span>
                {PRESETS_MO.map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setManoObra(val.toString())}
                    className="text-xs px-2 py-0.5 rounded bg-slate-100 hover:bg-sky-50 hover:text-sky-700 text-slate-600 font-semibold transition"
                  >
                    Bs. {val}
                  </button>
                ))}
              </div>
            </div>

            {/* Energía Eléctrica Input */}
            <div className="space-y-2">
              <Label htmlFor="energia" className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <Zap className="h-3.5 w-3.5 text-amber-500" />
                Energía Eléctrica Consumida (Bs.) *
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
                  className="h-11 text-base font-bold text-slate-900 pr-12 focus:border-sky-500"
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                  Bs.
                </span>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] text-slate-400">Presets:</span>
                {PRESETS_ENERGIA.map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setEnergia(val.toString())}
                    className="text-xs px-2 py-0.5 rounded bg-slate-100 hover:bg-amber-50 hover:text-amber-700 text-slate-600 font-semibold transition"
                  >
                    Bs. {val}
                  </button>
                ))}
              </div>
            </div>

            {/* Total Live Preview */}
            <div className="p-3.5 rounded-xl border border-sky-100 bg-sky-50/50 flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-sky-900">
                  Total Costo Directo del Turno:
                </span>
                <p className="text-[11px] text-sky-700">
                  Mano de obra + Energía
                </p>
              </div>
              <div className="text-lg font-bold text-sky-950 tabular-nums">
                Bs. {totalTurno.toFixed(2)}
              </div>
            </div>

            {error && (
              <div className="rounded-lg bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <Button
              type="submit"
              disabled={loading || totalTurno <= 0}
              className="w-full h-12 bg-sky-600 hover:bg-sky-500 text-white font-semibold text-sm shadow-sm transition gap-2"
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
