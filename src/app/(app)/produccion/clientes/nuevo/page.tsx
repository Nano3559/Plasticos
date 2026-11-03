"use client"

import { useState } from "react"
import { crearCliente } from "@/actions/produccion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useRouter } from "next/navigation"
import { ArrowLeft, UserPlus, Clock } from "lucide-react"
import Link from "next/link"

const diasCreditoPresets = [0, 15, 30, 45, 60]

export default function NuevoClientePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [diasCredito, setDiasCredito] = useState<number>(15)

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError("")

    const formData = new FormData(e.currentTarget)
    formData.set("diasCredito", diasCredito.toString())

    try {
      await crearCliente(formData)
      router.push("/produccion/clientes")
      router.refresh()
    } catch (err: any) {
      setError(err.message || "Error al crear cliente")
      setLoading(false)
    }
  }

  return (
    <div className="space-y-5 max-w-xl mx-auto pb-10">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/produccion/clientes">
          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg border">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-xl font-bold tracking-tight">Nuevo Cliente</h1>
          <p className="text-xs text-muted-foreground">Registrar datos de contacto y condiciones comerciales</p>
        </div>
      </div>

      <Card className="rounded-xl border shadow-xs">
        <CardHeader className="p-4 pb-2 bg-muted/30 border-b">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <UserPlus className="h-4 w-4 text-primary" />
            <span>Información Comercial</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-3">
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="nombre" className="text-xs font-semibold">Razón Social / Nombre Comercial *</Label>
              <Input
                id="nombre"
                name="nombre"
                placeholder="Ej. Distribuidora Santa Cruz S.R.L."
                className="h-11 rounded-xl text-sm"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="contacto" className="text-xs font-semibold">Persona de Contacto</Label>
                <Input
                  id="contacto"
                  name="contacto"
                  placeholder="Ej. Lic. Carlos Gómez"
                  className="h-11 rounded-xl text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="telefono" className="text-xs font-semibold">Teléfono / WhatsApp</Label>
                <Input
                  id="telefono"
                  name="telefono"
                  type="tel"
                  placeholder="Ej. 70012345"
                  className="h-11 rounded-xl text-sm"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="direccion" className="text-xs font-semibold">Dirección de Entrega</Label>
              <Input
                id="direccion"
                name="direccion"
                placeholder="Ej. Av. Doble Vía Km 6, Almacén Central"
                className="h-11 rounded-xl text-sm"
              />
            </div>

            {/* Días de crédito con botones rápidos */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="diasCredito" className="text-xs font-semibold flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>Plazo de Crédito Autorizado</span>
                </Label>
                <span className="text-xs font-bold text-primary">
                  {diasCredito === 0 ? "Pago al Contado" : `${diasCredito} días de crédito`}
                </span>
              </div>

              <div className="grid grid-cols-5 gap-1.5">
                {diasCreditoPresets.map((dias) => (
                  <button
                    key={dias}
                    type="button"
                    onClick={() => setDiasCredito(dias)}
                    className={`h-10 rounded-lg border text-xs font-semibold transition-all ${
                      diasCredito === dias
                        ? "border-primary bg-primary/10 text-primary ring-1 ring-primary/30"
                        : "border-border hover:bg-muted text-muted-foreground"
                    }`}
                  >
                    {dias === 0 ? "Contado" : `${dias}d`}
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
              {loading ? "Guardando Cliente..." : "Registrar Cliente"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
