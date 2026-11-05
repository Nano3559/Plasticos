"use client"

import { useState, useTransition } from "react"
import { AlertCircle, Check, Eye, EyeOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cambiarMiClave } from "@/actions/usuarios"
import { isActionError } from "@/lib/action-result"
import { CLAVE_MINIMA, problemaDeClave } from "@/lib/claves"

export function CambiarClaveForm({ email, nombre }: { email: string; nombre: string }) {
  const [pendiente, iniciar] = useTransition()
  const [error, setError] = useState("")
  const [nueva, setNueva] = useState("")
  const [repetir, setRepetir] = useState("")
  const [ver, setVer] = useState(false)

  const problema = nueva ? problemaDeClave(nueva, { email, nombre }) : null
  const coinciden = repetir.length > 0 && nueva === repetir

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        setError("")
        const fd = new FormData(e.currentTarget)
        iniciar(async () => {
          const r = await cambiarMiClave(fd)
          // Si sale bien, la acción cierra la sesión y lleva al login
          if (isActionError(r)) setError(r.error)
        })
      }}
      className="space-y-5"
    >
      {error && (
        <div role="alert" className="flex items-start gap-3 rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm font-medium text-danger">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="actual">Contraseña actual</Label>
        <Input id="actual" name="actual" type={ver ? "text" : "password"} autoComplete="current-password" required />
      </div>

      <div className="space-y-2">
        <Label htmlFor="nueva">Contraseña nueva</Label>
        <Input
          id="nueva"
          name="nueva"
          type={ver ? "text" : "password"}
          autoComplete="new-password"
          required
          minLength={CLAVE_MINIMA}
          value={nueva}
          onChange={(e) => setNueva(e.target.value)}
          aria-describedby="ayuda-nueva"
          aria-invalid={!!problema || undefined}
        />
        <p id="ayuda-nueva" className={`text-xs ${problema ? "text-danger" : nueva ? "text-accent" : "text-muted"}`}>
          {problema ?? (nueva ? "Buena contraseña." : `Al menos ${CLAVE_MINIMA} caracteres. Una frase corta como «bobina-azul-73» es fácil de recordar y difícil de adivinar.`)}
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="repetir">Repite la contraseña nueva</Label>
        <Input
          id="repetir"
          name="repetir"
          type={ver ? "text" : "password"}
          autoComplete="new-password"
          required
          value={repetir}
          onChange={(e) => setRepetir(e.target.value)}
          aria-invalid={(repetir.length > 0 && !coinciden) || undefined}
        />
        {repetir.length > 0 && (
          <p className={`flex items-center gap-1 text-xs ${coinciden ? "text-accent" : "text-danger"}`}>
            {coinciden ? <Check className="size-3.5" /> : null}
            {coinciden ? "Coinciden." : "No coinciden todavía."}
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pendiente || !!problema || !coinciden}>
          {pendiente ? "Guardando…" : "Cambiar contraseña"}
        </Button>
        <button type="button" onClick={() => setVer((v) => !v)} className="inline-flex h-10 items-center gap-1.5 text-[13px] text-subdued hover:text-fg">
          {ver ? <EyeOff className="size-4" /> : <Eye className="size-4" />} {ver ? "Ocultar" : "Mostrar"} contraseñas
        </button>
      </div>
      <p className="text-xs text-muted">Después de cambiarla vas a volver a entrar con la nueva. Se cierra la sesión en tus otros dispositivos.</p>
    </form>
  )
}
