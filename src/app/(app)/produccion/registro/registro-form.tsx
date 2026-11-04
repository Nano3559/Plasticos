"use client"

import { useTurno } from "@/lib/use-turno"
import { useState, useMemo } from "react"
import { registrarProduccion } from "@/actions/produccion"
import { unwrap, mensajeError } from "@/lib/action-result"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  Scale,
  Layers,
  Printer,
  Scissors,
  Sun,
  Sunset,
  Moon,
  CheckCircle2,
  AlertCircle,
  Wand2,
  Clock,
  Sparkles,
} from "lucide-react"
import Link from "next/link"

interface OrdenInfo {
  id: string
  numero: number
  producto: string
  medida?: string | null
  mezclaNota?: string | null
  kgPedidos: number
  totalFabricado: number
  clienteNombre: string
}


export function RegistroForm({ ordenes }: { ordenes: OrdenInfo[] }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  // Form State
  const [selectedOrdenId, setSelectedOrdenId] = useState<string>(ordenes[0]?.id || "")
  const [area, setArea] = useState<"EXTRUSION" | "IMPRESION" | "CONFECCION">("EXTRUSION")
  const [turno, setTurno] = useTurno()

  // Numeric weights
  const [kgEntrada, setKgEntrada] = useState<string>("")
  const [kgBuenos, setKgBuenos] = useState<string>("")
  const [kgMerma, setKgMerma] = useState<string>("")
  const [kgRechazado, setKgRechazado] = useState<string>("0")
  const [horasMaquina, setHorasMaquina] = useState<string>("")

  // Orden seleccionada actualmente
  const selectedOrden = useMemo(() => {
    return ordenes.find((o) => o.id === selectedOrdenId)
  }, [ordenes, selectedOrdenId])

  // Balance en vivo de la balanza
  const balance = useMemo(() => {
    const entrada = parseFloat(kgEntrada) || 0
    const buenos = parseFloat(kgBuenos) || 0
    const merma = parseFloat(kgMerma) || 0
    const rechazado = parseFloat(kgRechazado) || 0

    const totalSalida = buenos + merma + rechazado
    const diff = Math.round((entrada - totalSalida) * 100) / 100
    const esValido = entrada > 0 && Math.abs(diff) < 0.01

    const rendimiento = entrada > 0 ? Math.round((buenos / entrada) * 100) : 0
    const mermaPorc = entrada > 0 ? Math.round((merma / entrada) * 100) : 0

    return {
      entrada,
      buenos,
      merma,
      rechazado,
      totalSalida,
      diff,
      esValido,
      rendimiento,
      mermaPorc,
    }
  }, [kgEntrada, kgBuenos, kgMerma, kgRechazado])

  // Auto-completar Kilos Buenos con la diferencia restante
  function handleAutoCompletar() {
    const entrada = parseFloat(kgEntrada) || 0
    const merma = parseFloat(kgMerma) || 0
    const rechazado = parseFloat(kgRechazado) || 0
    const restante = Math.max(0, entrada - merma - rechazado)
    setKgBuenos(restante > 0 ? restante.toFixed(2) : "0")
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!balance.esValido) {
      setError("La balanza debe cuadrar exactamente: Kilos Entrada = Buenos + Merma + Rechazo.")
      return
    }

    setLoading(true)
    setError("")

    const formData = new FormData()
    formData.append("ordenId", selectedOrdenId)
    formData.append("area", area)
    formData.append("turno", turno)
    formData.append("kgEntrada", kgEntrada)
    formData.append("kgBuenos", kgBuenos)
    formData.append("kgMerma", kgMerma)
    formData.append("kgRechazado", kgRechazado || "0")
    if (horasMaquina) formData.append("horasMaquina", horasMaquina)

    try {
      unwrap(await registrarProduccion(formData))
      router.push("/produccion")
      router.refresh()
    } catch (err) {
      setError(mensajeError(err, "Error al registrar producción"))
      setLoading(false)
    }
  }

  return (
    <div className="space-y-5 max-w-2xl mx-auto pb-10">
      {/* Header con botón atrás */}
      <div className="flex items-center gap-3">
        <Link href="/produccion">
          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg border">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-xl font-bold tracking-tight">Registro de Producción</h1>
          <p className="text-xs text-muted-foreground">Control de pesaje y balance por turno</p>
        </div>
      </div>

      <form onSubmit={onSubmit} className="space-y-5">
        {/* Paso 1: Orden de Trabajo */}
        <Card className="rounded-xl border shadow-xs">
          <CardHeader className="p-4 pb-3">
            <CardTitle className="text-sm font-semibold flex items-center justify-between">
              <span>1. Orden de Trabajo</span>
              <span className="text-xs font-normal text-muted-foreground">OT activa</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 space-y-3">
            <select
              id="ordenId"
              value={selectedOrdenId}
              onChange={(e) => setSelectedOrdenId(e.target.value)}
              className="w-full h-12 rounded-xl border bg-background px-3.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
              required
            >
              {ordenes.length === 0 && <option value="">No hay órdenes abiertas disponibles</option>}
              {ordenes.map((ot) => (
                <option key={ot.id} value={ot.id}>
                  OT #{ot.numero} — {ot.producto} ({ot.clienteNombre})
                </option>
              ))}
            </select>

            {/* Ficha rápida de la OT seleccionada (info-card-patterns) */}
            {selectedOrden && (
              <div className="rounded-lg bg-black/[0.03] border p-3 text-xs space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="font-semibold text-foreground">{selectedOrden.clienteNombre}</span>
                    <p className="text-muted-foreground">
                      {selectedOrden.producto} {selectedOrden.medida ? `(${selectedOrden.medida})` : ""}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-foreground">
                      {selectedOrden.totalFabricado.toFixed(0)} / {selectedOrden.kgPedidos.toFixed(0)} kg
                    </span>
                    <p className="text-[10px] text-muted-foreground">Avance acumulado</p>
                  </div>
                </div>

                {selectedOrden.mezclaNota && (
                  <div className="pt-1.5 border-t border-border/60 flex items-center gap-1.5 text-warn">
                    <Sparkles className="h-3 w-3 shrink-0" />
                    <span className="text-[11px] font-medium">Mezcla: {selectedOrden.mezclaNota}</span>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Paso 2: Selección de Área (Segmented Cards con colores semánticos) */}
        <Card className="rounded-xl border shadow-xs">
          <CardHeader className="p-4 pb-3">
            <CardTitle className="text-sm font-semibold">2. Área del Proceso</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setArea("EXTRUSION")}
                className={`h-20 flex flex-col items-center justify-center gap-1.5 rounded-xl border text-xs font-semibold transition-all ${
 area === "EXTRUSION"
 ? "border-warn/60 bg-warn/10 text-warn shadow-xs ring-2 ring-warn/20"
 : "border-border hover:bg-black/[0.03] text-muted-foreground"
 }`}
              >
                <Layers className="h-5 w-5" />
                <span>Extrusión</span>
              </button>

              <button
                type="button"
                onClick={() => setArea("IMPRESION")}
                className={`h-20 flex flex-col items-center justify-center gap-1.5 rounded-xl border text-xs font-semibold transition-all ${
 area === "IMPRESION"
 ? "border-info/60 bg-info/10 text-info dark:text-info shadow-xs ring-2 ring-info/20"
 : "border-border hover:bg-black/[0.03] text-muted-foreground"
 }`}
              >
                <Printer className="h-5 w-5" />
                <span>Impresión</span>
              </button>

              <button
                type="button"
                onClick={() => setArea("CONFECCION")}
                className={`h-20 flex flex-col items-center justify-center gap-1.5 rounded-xl border text-xs font-semibold transition-all ${
 area === "CONFECCION"
 ? "border-accent/60 bg-accent/10 text-accent dark:text-accent shadow-xs ring-2 ring-accent/20"
 : "border-border hover:bg-black/[0.03] text-muted-foreground"
 }`}
              >
                <Scissors className="h-5 w-5" />
                <span>Confección</span>
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Paso 3: Turno de Trabajo */}
        <Card className="rounded-xl border shadow-xs">
          <CardHeader className="p-4 pb-3">
            <CardTitle className="text-sm font-semibold flex items-center justify-between">
              <span>3. Turno de Trabajo</span>
              <span className="text-xs font-normal text-muted-foreground">Horario del operario</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setTurno("MANANA")}
                className={`h-14 flex items-center justify-center gap-2 rounded-xl border text-xs font-semibold transition-all ${
 turno === "MANANA"
 ? "border-primary bg-primary/10 text-primary shadow-xs ring-1 ring-primary/30"
 : "border-border hover:bg-black/[0.03] text-muted-foreground"
 }`}
              >
                <Sun className="h-4 w-4 text-warn" />
                <span>Mañana</span>
              </button>

              <button
                type="button"
                onClick={() => setTurno("TARDE")}
                className={`h-14 flex items-center justify-center gap-2 rounded-xl border text-xs font-semibold transition-all ${
 turno === "TARDE"
 ? "border-primary bg-primary/10 text-primary shadow-xs ring-1 ring-primary/30"
 : "border-border hover:bg-black/[0.03] text-muted-foreground"
 }`}
              >
                <Sunset className="h-4 w-4 text-warn" />
                <span>Tarde</span>
              </button>

              <button
                type="button"
                onClick={() => setTurno("NOCHE")}
                className={`h-14 flex items-center justify-center gap-2 rounded-xl border text-xs font-semibold transition-all ${
 turno === "NOCHE"
 ? "border-primary bg-primary/10 text-primary shadow-xs ring-1 ring-primary/30"
 : "border-border hover:bg-black/[0.03] text-muted-foreground"
 }`}
              >
                <Moon className="h-4 w-4 text-info" />
                <span>Noche</span>
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Paso 4: Balanza y Pesajes en Vivo (status-visualization-patterns + form-patterns) */}
        <Card className="rounded-xl border shadow-xs overflow-hidden">
          <CardHeader className="p-4 pb-3 bg-black/[0.03] border-b">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Scale className="h-4 w-4 text-primary" />
                <span>4. Pesaje y Balanza de Materia Prima</span>
              </CardTitle>
              <span className="text-[11px] text-muted-foreground">Unidad: Kilogramos (kg)</span>
            </div>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            {/* Campo 1: Kilos Entrada */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <Label htmlFor="kgEntrada" className="text-xs font-semibold">
                  Kilos de Entrada (Materia Prima / Rollo) *
                </Label>
                <span className="text-[11px] text-muted-foreground">Total que ingresa a máquina</span>
              </div>
              <div className="relative">
                <Input
                  id="kgEntrada"
                  type="number"
                  step="0.01"
                  min="0"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={kgEntrada}
                  onChange={(e) => setKgEntrada(e.target.value)}
                  className="h-12 text-base font-semibold pr-12 rounded-xl"
                  required
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">
                  kg
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Campo 2: Kilos Buenos */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <Label htmlFor="kgBuenos" className="text-xs font-semibold text-accent dark:text-accent">
                    Kg Buenos *
                  </Label>
                  {balance.entrada > 0 && balance.diff !== 0 && (
                    <button
                      type="button"
                      onClick={handleAutoCompletar}
                      className="text-[10px] text-primary hover:underline flex items-center gap-0.5 font-medium"
                      title="Calcular automáticamente el resto"
                    >
                      <Wand2 className="h-2.5 w-2.5" /> Auto
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Input
                    id="kgBuenos"
                    type="number"
                    step="0.01"
                    min="0"
                    inputMode="decimal"
                    placeholder="0.00"
                    value={kgBuenos}
                    onChange={(e) => setKgBuenos(e.target.value)}
                    className="h-11 font-semibold pr-10 rounded-xl border-accent/40 focus:border-accent/60"
                    required
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">
                    kg
                  </span>
                </div>
              </div>

              {/* Campo 3: Kilos Merma */}
              <div className="space-y-1.5">
                <Label htmlFor="kgMerma" className="text-xs font-semibold text-warn">
                  Kg Merma (Scrap) *
                </Label>
                <div className="relative">
                  <Input
                    id="kgMerma"
                    type="number"
                    step="0.01"
                    min="0"
                    inputMode="decimal"
                    placeholder="0.00"
                    value={kgMerma}
                    onChange={(e) => setKgMerma(e.target.value)}
                    className="h-11 font-semibold pr-10 rounded-xl border-warn/40 focus:border-warn/60"
                    required
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">
                    kg
                  </span>
                </div>
              </div>

              {/* Campo 4: Kilos Rechazados */}
              <div className="space-y-1.5">
                <Label htmlFor="kgRechazado" className="text-xs font-semibold text-danger dark:text-danger">
                  Kg Rechazado
                </Label>
                <div className="relative">
                  <Input
                    id="kgRechazado"
                    type="number"
                    step="0.01"
                    min="0"
                    inputMode="decimal"
                    placeholder="0.00"
                    value={kgRechazado}
                    onChange={(e) => setKgRechazado(e.target.value)}
                    className="h-11 font-semibold pr-10 rounded-xl"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">
                    kg
                  </span>
                </div>
              </div>
            </div>

            {/* Visualizador de Balance en Vivo (Status Visualization Pattern) */}
            <div
              className={`rounded-xl border p-3 transition-colors ${
 balance.entrada === 0
 ? "bg-black/[0.03] border-border text-muted-foreground"
 : balance.esValido
 ? "bg-accent/10 border-accent/30 text-accent dark:text-accent"
 : "bg-warn/10 border-warn/30 text-warn"
 }`}
            >
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5">
                  {balance.esValido ? (
                    <CheckCircle2 className="h-4 w-4 text-accent dark:text-accent" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-warn" />
                  )}
                  <span className="font-semibold">
                    {balance.entrada === 0
                      ? "Ingresa los kilos de entrada para validar la balanza"
                      : balance.esValido
                      ? "Balanza Cuadrada al 100%"
                      : `Descuadre de ${Math.abs(balance.diff).toFixed(2)} kg (${
 balance.diff > 0 ? "Falta asignar" : "Excede la entrada"
 })`}
                  </span>
                </div>

                {balance.entrada > 0 && (
                  <span className="font-mono text-xs">
                    {balance.totalSalida.toFixed(2)} / {balance.entrada.toFixed(2)} kg
                  </span>
                )}
              </div>

              {/* Barra de Distribución Visual */}
              {balance.entrada > 0 && (
                <div className="mt-2.5 space-y-1">
                  <div className="w-full bg-muted-foreground/20 rounded-full h-2 overflow-hidden flex">
                    <div
                      className="bg-accent h-full transition-all duration-200"
                      style={{ width: `${Math.min(100, balance.rendimiento)}%` }}
                      title={`Buenos: ${balance.rendimiento}%`}
                    />
                    <div
                      className="bg-warn h-full transition-all duration-200"
                      style={{ width: `${Math.min(100 - balance.rendimiento, balance.mermaPorc)}%` }}
                      title={`Merma: ${balance.mermaPorc}%`}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-muted-foreground pt-0.5">
                    <span>
                      Rendimiento: <strong className="text-foreground">{balance.rendimiento}%</strong>
                    </span>
                    <span>
                      Merma: <strong className="text-foreground">{balance.mermaPorc}%</strong>
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Campo 5: Horas Máquina (Opcional) */}
            <div className="space-y-1.5 pt-1">
              <Label htmlFor="horasMaquina" className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                <span>Horas máquina trabajadas (opcional)</span>
              </Label>
              <Input
                id="horasMaquina"
                type="number"
                step="0.1"
                min="0"
                inputMode="decimal"
                placeholder="Ej. 7.5"
                value={horasMaquina}
                onChange={(e) => setHorasMaquina(e.target.value)}
                className="h-10 rounded-xl text-sm"
              />
            </div>
          </CardContent>
        </Card>

        {/* Error Server */}
        {error && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-xl flex items-center gap-2 text-xs text-destructive font-medium">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Botón de Envío Ergonómico (mobile-responsive-ux: Touch Target >= 48px) */}
        <Button
          type="submit"
          className="w-full h-14 text-base font-bold rounded-xl shadow-sm transition-all"
          disabled={loading || (balance.entrada > 0 && !balance.esValido)}
        >
          {loading ? "Guardando Registro..." : "Registrar Producción de Turno"}
        </Button>
      </form>
    </div>
  )
}
