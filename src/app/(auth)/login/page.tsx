"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Factory, ShieldCheck, Warehouse, Scale, LineChart, Lock, Mail, AlertCircle, ArrowRight } from "lucide-react"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleLogin(userEmail?: string, userPass?: string) {
    const targetEmail = userEmail || email
    const targetPass = userPass || password

    if (!targetEmail || !targetPass) {
      setError("Por favor ingresa tu correo y contraseña")
      return
    }

    setLoading(true)
    setError("")

    try {
      const res = await signIn("credentials", {
        email: targetEmail,
        password: targetPass,
        redirect: false,
      })

      if (res?.error) {
        setError("Credenciales incorrectas o usuario inactivo en planta")
        setLoading(false)
        return
      }

      window.location.href = "/dashboard"
    } catch (e: any) {
      setError("Error al comunicarse con el servidor")
      setLoading(false)
    }
  }

  function quickFill(fillEmail: string, fillPass: string) {
    setEmail(fillEmail)
    setPassword(fillPass)
    setError("")
    handleLogin(fillEmail, fillPass)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 flex flex-col items-center justify-center p-4 selection:bg-sky-500 selection:text-white">
      {/* Background industrial pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:24px_24px] opacity-40 pointer-events-none" />

      <div className="w-full max-w-md relative z-10 space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-gradient-to-tr from-sky-600 to-teal-400 text-white shadow-xl shadow-sky-500/20 mb-2 border border-sky-300/30">
            <Factory className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Planta Bolsas y Reciclado
          </h1>
          <p className="text-sm text-slate-400">
            Sistema Integral de Operaciones, Pesaje y Costos
          </p>
        </div>

        {/* Main Card */}
        <Card className="border-slate-700/80 bg-slate-900/90 backdrop-blur-md shadow-2xl text-slate-100">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-lg font-semibold text-white">
              Acceso al Sistema
            </CardTitle>
            <CardDescription className="text-xs text-slate-400">
              Ingresa tus credenciales o selecciona un perfil operativo
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <form
              onSubmit={(e) => {
                e.preventDefault()
                handleLogin()
              }}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label htmlFor="email" className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 text-sky-400" />
                  Correo institucional
                </Label>
                <div className="relative">
                  <Input
                    id="email"
                    type="email"
                    placeholder="usuario@planta.local"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="h-11 bg-slate-800/80 border-slate-700 text-white placeholder:text-slate-500 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-colors"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                  <Lock className="h-3.5 w-3.5 text-sky-400" />
                  Contraseña
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-11 bg-slate-800/80 border-slate-700 text-white placeholder:text-slate-500 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-colors"
                />
              </div>

              {error && (
                <div className="rounded-lg bg-rose-500/10 border border-rose-500/30 p-3 flex items-start gap-2.5 text-rose-300 text-xs">
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <Button
                type="submit"
                className="w-full h-12 bg-sky-600 hover:bg-sky-500 text-white font-medium text-sm shadow-lg shadow-sky-600/30 transition-all flex items-center justify-center gap-2"
                disabled={loading}
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    Iniciando turno...
                  </span>
                ) : (
                  <>
                    <span>Entrar a Planta</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </form>

            {/* Quick Floor Access / Test Roles */}
            <div className="pt-2 border-t border-slate-800">
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2.5">
                Acceso rápido por puesto de trabajo:
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => quickFill("operador@planta.local", "123456")}
                  disabled={loading}
                  className="flex items-center gap-2 p-2.5 rounded-lg border border-slate-700/80 bg-slate-800/60 hover:bg-slate-700/70 text-left transition text-slate-200 hover:text-white group"
                >
                  <div className="p-1.5 rounded-md bg-amber-500/10 text-amber-400 group-hover:bg-amber-500/20">
                    <Scale className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold leading-tight">Operador</div>
                    <div className="text-[10px] text-slate-400 leading-tight">Balanza y OTs</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => quickFill("almacen@planta.local", "123456")}
                  disabled={loading}
                  className="flex items-center gap-2 p-2.5 rounded-lg border border-slate-700/80 bg-slate-800/60 hover:bg-slate-700/70 text-left transition text-slate-200 hover:text-white group"
                >
                  <div className="p-1.5 rounded-md bg-cyan-500/10 text-cyan-400 group-hover:bg-cyan-500/20">
                    <Warehouse className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold leading-tight">Almacén</div>
                    <div className="text-[10px] text-slate-400 leading-tight">Materia prima</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => quickFill("admin@planta.local", "123456")}
                  disabled={loading}
                  className="flex items-center gap-2 p-2.5 rounded-lg border border-slate-700/80 bg-slate-800/60 hover:bg-slate-700/70 text-left transition text-slate-200 hover:text-white group"
                >
                  <div className="p-1.5 rounded-md bg-emerald-500/10 text-emerald-400 group-hover:bg-emerald-500/20">
                    <ShieldCheck className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold leading-tight">Administrador</div>
                    <div className="text-[10px] text-slate-400 leading-tight">Gestión total</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => quickFill("gerencia@planta.local", "123456")}
                  disabled={loading}
                  className="flex items-center gap-2 p-2.5 rounded-lg border border-slate-700/80 bg-slate-800/60 hover:bg-slate-700/70 text-left transition text-slate-200 hover:text-white group"
                >
                  <div className="p-1.5 rounded-md bg-purple-500/10 text-purple-400 group-hover:bg-purple-500/20">
                    <LineChart className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold leading-tight">Gerencia</div>
                    <div className="text-[10px] text-slate-400 leading-tight">Costos y reportes</div>
                  </div>
                </button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Footer info */}
        <div className="text-center text-[11px] text-slate-500">
          Terminal de Control de Fábrica • Turnos Mañana / Tarde / Noche
        </div>
      </div>
    </div>
  )
}
