"use client"

import { useState, useTransition } from "react"
import { AlertCircle, Check, Copy, KeyRound, LockOpen, MessageCircle, Pencil, Plus, ShieldAlert, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { actualizarUsuario, crearUsuario, desbloquearUsuario, restablecerClave } from "@/actions/usuarios"
import { isActionError } from "@/lib/action-result"

export type UsuarioFila = {
  id: string
  nombre: string
  email: string
  rol: "OPERADOR" | "ALMACEN" | "ADMIN" | "GERENCIA"
  activo: boolean
  debeCambiarClave: boolean
  bloqueado: boolean
  claveDePrueba: boolean
  ultimoAcceso: string | null
  soyYo: boolean
}

const ROLES: { valor: UsuarioFila["rol"]; nombre: string; detalle: string }[] = [
  { valor: "OPERADOR", nombre: "Operador", detalle: "Registra la producción de su turno" },
  { valor: "ALMACEN", nombre: "Almacén", detalle: "Entradas, salidas y stock de materiales" },
  { valor: "ADMIN", nombre: "Administración", detalle: "Clientes, órdenes, entregas, cobros y costos" },
  { valor: "GERENCIA", nombre: "Gerencia", detalle: "Todo, más reportes y usuarios" },
]
const nombreRol = (r: string) => ROLES.find((x) => x.valor === r)?.nombre ?? r

function haceCuanto(iso: string | null) {
  if (!iso) return "Nunca entró"
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60_000)
  if (min < 2) return "Activo ahora"
  if (min < 60) return `Entró hace ${min} min`
  const h = Math.round(min / 60)
  if (h < 24) return `Entró hace ${h} h`
  const d = Math.round(h / 24)
  return d === 1 ? "Entró ayer" : `Entró hace ${d} días`
}

/** Aviso con la contraseña temporal: se muestra una sola vez. */
function ClaveEntregada({ datos, onCerrar }: { datos: { nombre: string; email: string; claveTemporal: string }; onCerrar: () => void }) {
  const [copiado, setCopiado] = useState(false)
  const texto = `Hola ${datos.nombre.split(" ")[0]}, tu acceso al sistema de la planta:\nCorreo: ${datos.email}\nContraseña temporal: ${datos.claveTemporal}\nAl entrar te pedirá elegir tu propia contraseña.`
  return (
    <div role="status" className="rounded-xl border border-brand/30 bg-brand-soft p-5">
      <div className="flex items-start gap-3">
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-brand text-on-brand" aria-hidden>
          <KeyRound className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-brand-ink">Contraseña temporal de {datos.nombre}</p>
          <p className="mt-0.5 text-[13px] text-brand-ink/80">
            Dásela en persona o por WhatsApp. Solo se muestra ahora: al entrar, {datos.nombre.split(" ")[0]} tendrá que elegir una propia.
          </p>
          <p className="mt-3 select-all rounded-md bg-panel px-3 py-2 font-mono text-lg font-semibold tracking-wide">{datos.claveTemporal}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={async () => {
                await navigator.clipboard.writeText(texto)
                setCopiado(true)
              }}
            >
              {copiado ? <Check /> : <Copy />} {copiado ? "Copiado" : "Copiar mensaje"}
            </Button>
            <Button size="sm" variant="outline" asChild>
              <a href={`https://wa.me/?text=${encodeURIComponent(texto)}`} target="_blank" rel="noreferrer">
                <MessageCircle /> Enviar por WhatsApp
              </a>
            </Button>
            <Button size="sm" variant="ghost" onClick={onCerrar}>
              Listo
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

function Estado({ u }: { u: UsuarioFila }) {
  if (!u.activo) return <span className="rounded-full bg-black/[0.06] px-2 py-0.5 text-xs font-semibold text-subdued">Desactivado</span>
  if (u.bloqueado) return <span className="rounded-full bg-danger/10 px-2 py-0.5 text-xs font-semibold text-danger">Bloqueado 15 min</span>
  if (u.claveDePrueba) return <span className="rounded-full bg-danger/10 px-2 py-0.5 text-xs font-semibold text-danger">Clave de prueba</span>
  if (u.debeCambiarClave) return <span className="rounded-full bg-warn/10 px-2 py-0.5 text-xs font-semibold text-warn">Debe elegir su clave</span>
  return null
}

export function UsuariosView({ usuarios }: { usuarios: UsuarioFila[] }) {
  const [pendiente, iniciar] = useTransition()
  const [error, setError] = useState("")
  const [creando, setCreando] = useState(false)
  const [editando, setEditando] = useState<string | null>(null)
  const [confirmarReset, setConfirmarReset] = useState<string | null>(null)
  const [entregada, setEntregada] = useState<{ nombre: string; email: string; claveTemporal: string } | null>(null)

  const activos = usuarios.filter((u) => u.activo)
  const inactivos = usuarios.filter((u) => !u.activo)
  const conPrueba = usuarios.filter((u) => u.claveDePrueba)

  const correr = (accion: () => Promise<unknown>, alTerminar?: (r: unknown) => void) => {
    setError("")
    iniciar(async () => {
      const r = await accion()
      if (isActionError(r)) setError(r.error)
      else alTerminar?.(r)
    })
  }

  const fila = (u: UsuarioFila) => {
    if (editando === u.id) {
      return (
        <li key={u.id} className="border-b border-line py-4 last:border-b-0">
          <form
            onSubmit={(e) => {
              e.preventDefault()
              const fd = new FormData(e.currentTarget)
              fd.set("id", u.id)
              correr(() => actualizarUsuario(fd), () => setEditando(null))
            }}
            className="grid gap-4 sm:grid-cols-[1fr_200px]"
          >
            <div className="space-y-1.5">
              <Label htmlFor={`nombre-${u.id}`}>Nombre</Label>
              <Input id={`nombre-${u.id}`} name="nombre" defaultValue={u.nombre} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`rol-${u.id}`}>Rol</Label>
              <select id={`rol-${u.id}`} name="rol" defaultValue={u.rol} disabled={u.soyYo} className="h-11 w-full rounded-lg border border-line-strong bg-panel px-3 text-sm">
                {ROLES.map((r) => (
                  <option key={r.valor} value={r.valor}>
                    {r.nombre}
                  </option>
                ))}
              </select>
              {u.soyYo && <input type="hidden" name="rol" value={u.rol} />}
            </div>
            <label className="flex items-center gap-2.5 text-sm sm:col-span-2">
              <input type="checkbox" name="activoCheck" defaultChecked={u.activo} disabled={u.soyYo} className="size-4 accent-[#07899b]" onChange={(e) => {
                const hidden = e.currentTarget.form?.elements.namedItem("activo") as HTMLInputElement | null
                if (hidden) hidden.value = String(e.currentTarget.checked)
              }} />
              <input type="hidden" name="activo" defaultValue={String(u.activo)} />
              Puede entrar al sistema
              {u.soyYo && <span className="text-xs text-muted">(no puedes desactivarte a ti mismo)</span>}
            </label>
            <div className="flex gap-2 sm:col-span-2">
              <Button type="submit" size="sm" disabled={pendiente}>
                Guardar cambios
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => setEditando(null)}>
                Cancelar
              </Button>
            </div>
            <p className="text-xs text-muted sm:col-span-2">Si cambias el rol o lo desactivas, se cierra su sesión en todos sus dispositivos.</p>
          </form>
        </li>
      )
    }

    return (
      <li key={u.id} className="group flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-line py-3 last:border-b-0">
        <span
          className={`grid size-9 shrink-0 place-items-center rounded-full text-sm font-bold ${u.activo ? "bg-brand text-on-brand" : "bg-black/[0.06] text-subdued"}`}
          aria-hidden
        >
          {u.nombre.trim().charAt(0).toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className={`text-[15px] ${u.activo ? "" : "text-subdued line-through decoration-1"}`}>{u.nombre}</span>
            {u.soyYo && <span className="text-xs text-muted">(tú)</span>}
            <Estado u={u} />
          </p>
          <p className="truncate text-[13px] text-subdued">
            {u.email} · {nombreRol(u.rol)} · {haceCuanto(u.ultimoAcceso)}
          </p>
        </div>

        {confirmarReset === u.id ? (
          <div className="flex w-full items-center gap-2 rounded-md bg-elevated px-3 py-2 text-[13px] sm:w-auto">
            <span>¿Crear una contraseña nueva? Se cerrará su sesión.</span>
            <Button
              size="sm"
              disabled={pendiente}
              onClick={() =>
                correr(() => restablecerClave(u.id), (r) => {
                  setConfirmarReset(null)
                  setEntregada(r as { nombre: string; email: string; claveTemporal: string })
                })
              }
            >
              Sí, crear
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setConfirmarReset(null)}>
              No
            </Button>
          </div>
        ) : (
          <div className="flex shrink-0 items-center gap-1">
            {u.bloqueado && (
              <Button size="sm" variant="ghost" disabled={pendiente} onClick={() => correr(() => desbloquearUsuario(u.id))}>
                <LockOpen /> Desbloquear
              </Button>
            )}
            {!u.soyYo && u.activo && (
              <Button size="sm" variant="ghost" onClick={() => setConfirmarReset(u.id)}>
                <KeyRound /> Nueva contraseña
              </Button>
            )}
            <Button size="icon" variant="ghost" aria-label={`Editar a ${u.nombre}`} title="Editar" onClick={() => setEditando(u.id)}>
              <Pencil />
            </Button>
          </div>
        )}
      </li>
    )
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-[26px] font-bold leading-tight sm:text-[28px]">Usuarios</h1>
        <p className="mt-1 text-subdued">
          {activos.length} {activos.length === 1 ? "persona puede" : "personas pueden"} entrar al sistema
          {inactivos.length > 0 && ` · ${inactivos.length} desactivad${inactivos.length === 1 ? "a" : "as"}`}
        </p>
      </header>

      {conPrueba.length > 0 && (
        <div role="alert" className="flex items-start gap-3 rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
          <ShieldAlert className="mt-0.5 size-4 shrink-0" />
          <p>
            <strong>{conPrueba.map((u) => u.nombre).join(", ")}</strong> {conPrueba.length === 1 ? "sigue" : "siguen"} con la contraseña de prueba
            «123456». Cualquiera que conozca el correo puede entrar. Usa «Nueva contraseña» en cada uno
            {conPrueba.some((u) => u.soyYo) ? ", y cambia la tuya en «Mi cuenta»" : ""}.
          </p>
        </div>
      )}

      {error && (
        <div role="alert" className="flex items-start gap-3 rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm font-medium text-danger">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <span className="flex-1">{error}</span>
          <button type="button" onClick={() => setError("")} aria-label="Cerrar aviso">
            <X className="size-4" />
          </button>
        </div>
      )}

      {entregada && <ClaveEntregada datos={entregada} onCerrar={() => setEntregada(null)} />}

      <section aria-label="Lista de usuarios">
        <ul>{activos.map(fila)}</ul>

        {creando ? (
          <form
            onSubmit={(e) => {
              e.preventDefault()
              const fd = new FormData(e.currentTarget)
              const form = e.currentTarget
              correr(() => crearUsuario(fd), (r) => {
                setEntregada(r as { nombre: string; email: string; claveTemporal: string })
                setCreando(false)
                form.reset()
              })
            }}
            className="mt-3 space-y-4 rounded-xl border border-line-strong p-4"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="nuevo-nombre">Nombre</Label>
                <Input id="nuevo-nombre" name="nombre" placeholder="Juan Mamani" required autoFocus />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="nuevo-email">Correo</Label>
                <Input id="nuevo-email" name="email" type="email" placeholder="juan@planta.local" required autoComplete="off" />
              </div>
            </div>
            <fieldset>
              <legend className="mb-2 text-sm font-semibold">Rol</legend>
              <div className="grid gap-2 sm:grid-cols-2">
                {ROLES.map((r, i) => (
                  <label key={r.valor} className="flex cursor-pointer items-start gap-3 rounded-lg border border-line p-3 has-[:checked]:border-brand has-[:checked]:bg-brand-soft">
                    <input type="radio" name="rol" value={r.valor} defaultChecked={i === 0} className="mt-1 accent-[#07899b]" />
                    <span>
                      <span className="block text-sm font-semibold">{r.nombre}</span>
                      <span className="block text-xs text-subdued">{r.detalle}</span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
            <p className="text-xs text-muted">Se crea con una contraseña temporal que verás al guardar. Al entrar por primera vez tendrá que elegir la suya.</p>
            <div className="flex gap-2">
              <Button type="submit" disabled={pendiente}>
                {pendiente ? "Creando…" : "Crear usuario"}
              </Button>
              <Button type="button" variant="ghost" onClick={() => setCreando(false)}>
                Cancelar
              </Button>
            </div>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setCreando(true)}
            className="group mt-1 inline-flex h-11 items-center gap-2 text-[14px] text-subdued hover:text-brand-ink"
          >
            <span className="grid size-[18px] place-items-center rounded-full text-brand group-hover:bg-brand group-hover:text-on-brand">
              <Plus className="size-4" strokeWidth={2.5} />
            </span>
            Agregar usuario
          </button>
        )}
      </section>

      {inactivos.length > 0 && (
        <section aria-label="Usuarios desactivados">
          <h2 className="mb-1 border-b border-line pb-2 text-[15px] font-bold">
            Desactivados <span className="ml-2 text-sm font-normal text-muted">{inactivos.length}</span>
          </h2>
          <ul>{inactivos.map(fila)}</ul>
          <p className="mt-2 text-xs text-muted">Los usuarios no se borran para no perder quién registró cada movimiento. Desactivado, no puede entrar.</p>
        </section>
      )}
    </div>
  )
}
