"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { signIn } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AlertCircle, Check, LineChart, ListChecks, Scale, ShieldCheck, Warehouse } from "lucide-react"

// Los accesos rápidos usan las contraseñas del seed: solo existen en desarrollo.
const ES_DESARROLLO = process.env.NODE_ENV === "development"

const PERFILES_DEMO = [
  { email: "operador@planta.local", label: "Operador", detalle: "Balanza y OTs", icon: Scale, color: "#eb8909" },
  { email: "almacen@planta.local", label: "Almacén", detalle: "Materia prima", icon: Warehouse, color: "#246fe0" },
  { email: "admin@planta.local", label: "Administración", detalle: "Clientes y cobros", icon: ShieldCheck, color: "#299438" },
  { email: "gerencia@planta.local", label: "Gerencia", detalle: "Costos y reportes", icon: LineChart, color: "#884dff" },
]

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleLogin(userEmail = email, userPass = password) {
    if (!userEmail || !userPass) {
      setError("Escribe tu correo y tu contraseña.")
      return
    }

    setLoading(true)
    setError("")

    try {
      const res = await signIn("credentials", {
        email: userEmail,
        password: userPass,
        redirect: false,
      })

      if (res?.error) {
        setError("Correo o contraseña incorrectos, o el usuario está desactivado.")
        setLoading(false)
        return
      }

      router.replace("/dashboard")
      router.refresh()
    } catch {
      setError("No se pudo conectar con el servidor. Revisa la conexión e inténtalo otra vez.")
      setLoading(false)
    }
  }

  return (
    <div className="min-h-dvh bg-canvas">
      <header className="mx-auto flex h-16 max-w-6xl items-center px-4 sm:px-6">
        <span className="flex items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-[10px] bg-brand text-on-brand">
            <ListChecks className="size-5" strokeWidth={2.5} />
          </span>
          <span className="text-lg font-extrabold tracking-tight">Planta</span>
        </span>
      </header>

      <main className="mx-auto grid max-w-6xl items-center gap-10 px-4 pb-16 pt-6 sm:px-6 lg:grid-cols-[1.1fr_1fr] lg:gap-16 lg:pt-14">
        <section>
          <h1 className="text-[2.6rem] font-extrabold leading-[1.05] tracking-tight sm:text-6xl">
            Claridad en la planta.
          </h1>
          <p className="mt-5 max-w-lg text-lg text-subdued">
            Inventario, producción y cobranzas en un solo lugar, para que ningún kilo ni ningún cobro se pierda.
          </p>
          <ul className="mt-8 space-y-4">
            {[
              "Cada entrada y salida de material queda registrada",
              "Costo y desperdicio por cada 100 kg",
              "Cartera de clientes con antigüedad y alertas",
            ].map((t) => (
              <li key={t} className="flex items-center gap-3">
                <span className="grid size-6 shrink-0 place-items-center rounded-full bg-brand text-on-brand">
                  <Check className="size-4" strokeWidth={3} />
                </span>
                <span className="text-[17px]">{t}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-2xl border border-line bg-panel p-6 shadow-[0_1px_2px_rgba(32,32,32,0.04),0_12px_32px_rgba(32,32,32,0.06)] sm:p-9">
          <h2 className="text-2xl font-bold tracking-tight">Inicia sesión</h2>
          <p className="mt-1 text-sm text-subdued">Usa el correo y la contraseña que te dio Administración.</p>

          {error && (
            <div
              role="alert"
              className="mt-6 flex items-start gap-3 rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm font-medium text-danger"
            >
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleLogin()
            }}
            className="mt-6 space-y-5"
          >
            <div className="space-y-2">
              <Label htmlFor="email">Correo</Label>
              <Input
                id="email"
                type="email"
                autoComplete="username"
                placeholder="usuario@planta.local"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-12"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                placeholder="Tu contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-12"
              />
            </div>

            <Button type="submit" size="lg" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <span className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                  Entrando…
                </>
              ) : (
                "Entrar"
              )}
            </Button>
          </form>

          {ES_DESARROLLO && (
            <div className="mt-8 border-t border-line pt-6" role="group" aria-labelledby="demo-titulo">
              <h3 id="demo-titulo" className="text-sm font-bold">
                Perfiles de prueba
              </h3>
              <p className="mt-1 text-xs text-muted">Solo en desarrollo. Contraseña del seed: 123456</p>
              <ul className="mt-3 grid gap-1 sm:grid-cols-2">
                {PERFILES_DEMO.map((p) => {
                  const Icon = p.icon
                  return (
                    <li key={p.email}>
                      <button
                        type="button"
                        disabled={loading}
                        onClick={() => {
                          setEmail(p.email)
                          setPassword("123456")
                          handleLogin(p.email, "123456")
                        }}
                        className="flex w-full items-center gap-3 rounded-lg p-2 text-left transition-colors hover:bg-black/[0.04] disabled:opacity-50"
                      >
                        <span
                          className="grid size-10 shrink-0 place-items-center rounded-lg"
                          style={{ backgroundColor: `${p.color}1f`, color: p.color }}
                        >
                          <Icon className="size-5" />
                        </span>
                        <span>
                          <span className="block text-sm font-semibold">{p.label}</span>
                          <span className="block text-xs text-subdued">{p.detalle}</span>
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
