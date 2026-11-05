"use client"

import { Suspense, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { signIn } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AlertCircle, LineChart, ListChecks, Scale, ShieldCheck, Warehouse } from "lucide-react"

// Los accesos rápidos usan las contraseñas del seed. Se ven en desarrollo, o en producción
// si NEXT_PUBLIC_MOSTRAR_PERFILES_DEMO="true" (útil para probar el despliegue).
const MOSTRAR_PERFILES =
  process.env.NODE_ENV === "development" || process.env.NEXT_PUBLIC_MOSTRAR_PERFILES_DEMO === "true"

const PERFILES_DEMO = [
  { email: "operador@planta.local", label: "Operador", detalle: "Balanza y OTs", icon: Scale, color: "#eb8909" },
  { email: "almacen@planta.local", label: "Almacén", detalle: "Materia prima", icon: Warehouse, color: "#246fe0" },
  { email: "admin@planta.local", label: "Administración", detalle: "Clientes y cobros", icon: ShieldCheck, color: "#299438" },
  { email: "gerencia@planta.local", label: "Gerencia", detalle: "Costos y reportes", icon: LineChart, color: "#884dff" },
]

const AVISOS: Record<string, string> = {
  clave: "Listo, cambiaste tu contraseña. Entra con la nueva.",
  sesion: "Tu sesión se cerró porque cambiaron tus datos de acceso. Vuelve a entrar.",
}

export default function Page() {
  return (
    <Suspense>
      <LoginPage />
    </Suspense>
  )
}

function LoginPage() {
  const router = useRouter()
  const aviso = AVISOS[useSearchParams().get("motivo") ?? ""]
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

      if (res?.code === "bloqueado") {
        setError("Demasiados intentos fallidos. Por seguridad, espera 15 minutos o pide a Gerencia que te desbloquee.")
        setLoading(false)
        return
      }
      if (res?.error) {
        setError("Correo o contraseña incorrectos, o el usuario está desactivado. Después de 5 intentos se bloquea 15 minutos.")
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
      <div className="mx-auto grid min-h-dvh max-w-6xl gap-10 px-5 sm:px-8 lg:grid-cols-[minmax(0,420px)_1fr] lg:gap-20">
        {/* ── Columna del formulario, como el login de Todoist ───────── */}
        <section className="flex flex-col py-8">
          <span className="flex items-center gap-2">
            <span className="grid size-8 place-items-center rounded-lg bg-brand text-on-brand">
              <ListChecks className="size-[18px]" strokeWidth={2.5} />
            </span>
            <span className="text-xl font-bold text-brand-ink">planta</span>
          </span>

          <div className="my-auto pt-12 lg:pt-0">
            <h1 className="text-[32px] font-bold leading-tight">Iniciar sesión</h1>
            <p className="mt-1 text-[15px] text-subdued">Usa el correo y la contraseña que te dio Administración.</p>

          {aviso && !error && (
            <div role="status" className="mt-6 rounded-lg border border-brand/30 bg-brand-soft px-4 py-3 text-sm font-medium text-brand-ink">
              {aviso}
            </div>
          )}

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

          {MOSTRAR_PERFILES && (
            <div className="mt-8 border-t border-line pt-6" role="group" aria-labelledby="demo-titulo">
              <h3 id="demo-titulo" className="text-sm font-bold">
                Perfiles de prueba
              </h3>
              <p className="mt-1 text-xs text-muted">Solo para pruebas. Contraseña: 123456</p>
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
          </div>
        </section>

        {/* ── Ilustración: la lista "Hoy" de la planta ───────────────── */}
        <aside aria-hidden className="hidden items-center py-8 lg:flex">
          <div className="relative w-full overflow-hidden rounded-[28px] bg-brand-soft px-12 pb-0 pt-14">
            <p className="max-w-sm text-[34px] font-bold leading-[1.1] text-brand-ink">Claridad en la planta.</p>
            <p className="mt-3 max-w-sm text-[15px] text-brand-ink/80">
              Inventario, producción y cobranzas en un solo lugar, para que ningún kilo ni ningún cobro se pierda.
            </p>
            <div className="mt-10 rounded-t-2xl bg-panel px-7 pb-8 pt-6 shadow-[0_-4px_30px_rgba(5,95,107,0.10)]">
              <p className="text-[20px] font-bold">Hoy</p>
              <p className="text-[13px] text-subdued">4 tareas</p>
              <ul className="mt-3">
                {[
                  { t: "Pesar bobinas del extrusor 2", d: "Producción · OT #128", c: "border-danger bg-danger/10" },
                  { t: "Registrar entrada de polietileno", d: "Inventario · 1.200 kg", c: "border-warn bg-warn/10" },
                  { t: "Cobrar a Distribuidora Andina", d: "Cobranzas · 45 días", c: "border-info bg-info/10" },
                  { t: "Revisar merma del turno noche", d: "Costos", c: "border-line-strong" },
                ].map((x) => (
                  <li key={x.t} className="flex items-start gap-3 border-b border-line py-3 last:border-b-0">
                    <span className={`mt-0.5 size-[18px] shrink-0 rounded-full border-[1.5px] ${x.c}`} />
                    <span>
                      <span className="block text-[14px]">{x.t}</span>
                      <span className="block text-xs text-subdued">{x.d}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
