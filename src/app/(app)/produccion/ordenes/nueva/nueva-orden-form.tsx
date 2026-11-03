"use client"

import { useState } from "react"
import { crearOrdenTrabajo } from "@/actions/produccion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useRouter } from "next/navigation"
import { ArrowLeft, Plus, Sparkles, DollarSign, Scale, UserPlus } from "lucide-react"
import Link from "next/link"

const mezclasSugeridas = [
  "100% Virgen Cristal",
  "50% Termo + 50% Stretch",
  "70% Reciclado + 30% Virgen",
  "Alta Densidad Pigmentada",
  "Recuperado Negro Reforzado",
]

export function NuevaOrdenForm({ clientes }: { clientes: any[] }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const [kgPedidos, setKgPedidos] = useState<string>("")
  const [precioUnitario, setPrecioUnitario] = useState<string>("")
  const [mezclaNota, setMezclaNota] = useState<string>("")

  const kg = parseFloat(kgPedidos) || 0
  const precio = parseFloat(precioUnitario) || 0
  const totalEstimado = kg * precio

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError("")

    const formData = new FormData(e.currentTarget)

    try {
      await crearOrdenTrabajo(formData)
      router.push("/produccion/ordenes")
      router.refresh()
    } catch (err: any) {
      setError(err.message || "Error al crear orden")
      setLoading(false)
    }
  }

  return (
    <div className="space-y-5 max-w-xl mx-auto pb-10">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/produccion/ordenes">
          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg border">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-xl font-bold tracking-tight">Nueva Orden de Trabajo (OT)</h1>
          <p className="text-xs text-muted-foreground">Registrar un nuevo pedido para producción</p>
        </div>
      </div>

      <Card className="rounded-xl border shadow-xs">
        <CardHeader className="p-4 pb-2 bg-muted/30 border-b">
          <CardTitle className="text-sm font-semibold">Detalles del Pedido</CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-3">
          <form onSubmit={onSubmit} className="space-y-4">
            {/* Cliente */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <Label htmlFor="clienteId" className="text-xs font-semibold">Cliente *</Label>
                <Link
                  href="/produccion/clientes/nuevo"
                  className="text-[11px] text-primary hover:underline flex items-center gap-1 font-medium"
                >
                  <UserPlus className="h-3 w-3" /> Nuevo Cliente
                </Link>
              </div>
              <select
                id="clienteId"
                name="clienteId"
                className="w-full h-11 rounded-xl border bg-background px-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
                required
              >
                <option value="">Seleccionar cliente...</option>
                {clientes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre} {c.diasCredito ? `(${c.diasCredito} días crédito)` : ""}
                  </option>
                ))}
              </select>
            </div>

            {/* Producto y Medida */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="producto" className="text-xs font-semibold">Producto / Tipo de Bolsa *</Label>
                <Input
                  id="producto"
                  name="producto"
                  placeholder="Ej. Bolsa camiseta, Rollo film"
                  className="h-11 rounded-xl text-sm"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="medida" className="text-xs font-semibold">Medida / Especificación</Label>
                <Input
                  id="medida"
                  name="medida"
                  placeholder="Ej. 40x60 cm cal. 1.2"
                  className="h-11 rounded-xl text-sm"
                />
              </div>
            </div>

            {/* Kilos y Precio */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="kgPedidos" className="text-xs font-semibold">Kilogramos Pedidos *</Label>
                <div className="relative">
                  <Input
                    id="kgPedidos"
                    name="kgPedidos"
                    type="number"
                    step="0.01"
                    min="1"
                    inputMode="decimal"
                    placeholder="0.00"
                    value={kgPedidos}
                    onChange={(e) => setKgPedidos(e.target.value)}
                    className="h-11 rounded-xl pr-10 font-semibold text-sm"
                    required
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">
                    kg
                  </span>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="precioUnitario" className="text-xs font-semibold">Precio por Kg *</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">
                    $
                  </span>
                  <Input
                    id="precioUnitario"
                    name="precioUnitario"
                    type="number"
                    step="0.0001"
                    min="0.01"
                    inputMode="decimal"
                    placeholder="0.00"
                    value={precioUnitario}
                    onChange={(e) => setPrecioUnitario(e.target.value)}
                    className="h-11 rounded-xl pl-8 font-semibold text-sm"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Previsualización del valor total del pedido */}
            {totalEstimado > 0 && (
              <div className="p-3 bg-primary/5 border border-primary/20 rounded-xl flex items-center justify-between text-xs">
                <span className="text-muted-foreground font-medium">Valor total del pedido estimado:</span>
                <span className="text-sm font-bold text-primary font-mono">
                  ${totalEstimado.toLocaleString("es-BO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            )}

            {/* Mezcla / Fórmula sugerida */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="mezclaNota" className="text-xs font-semibold">Fórmula de Mezcla (opcional)</Label>
                <span className="text-[11px] text-muted-foreground">Instrucción para extrusor</span>
              </div>
              <Input
                id="mezclaNota"
                name="mezclaNota"
                value={mezclaNota}
                onChange={(e) => setMezclaNota(e.target.value)}
                placeholder="Ej. 50% termo + 50% stretch"
                className="h-11 rounded-xl text-sm"
              />

              {/* Chips sugeridos */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {mezclasSugeridas.map((sug) => (
                  <button
                    key={sug}
                    type="button"
                    onClick={() => setMezclaNota(sug)}
                    className="text-[10px] px-2 py-1 rounded-md border bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                  >
                    + {sug}
                  </button>
                ))}
              </div>
            </div>

            {error && <p className="text-xs text-destructive font-medium">{error}</p>}

            <Button
              type="submit"
              className="w-full h-12 text-sm font-bold rounded-xl shadow-xs transition-all mt-2"
              disabled={loading}
            >
              {loading ? "Creando Orden..." : "Crear Orden de Trabajo"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
