"use client"

import { useState } from "react"
import { signOut } from "next-auth/react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Hash, LogOut, PanelLeft, Plus, Users } from "lucide-react"
import { ACCION_PRINCIPAL, MODULOS, ROL_LABEL, type Rol } from "./modules"
import { TurnoChip } from "./turno-chip"
import { Campana } from "./campana"

function esActivo(pathname: string, href: string) {
  if (href === "/produccion" && ["/produccion/extrusion","/produccion/impresion","/produccion/confeccion"].some(r=>pathname.startsWith(r))) return false
  return pathname === href || (href !== "/dashboard" && pathname.startsWith(href))
}

/** Ícono de "Hoy" de Todoist: un calendario con el número del día. */
function IconoHoy({ className = "" }: { className?: string }) {
  const dia = new Intl.DateTimeFormat("es-BO", { timeZone: "America/La_Paz", day: "numeric" }).format(new Date())
  return (
    <span className={`relative inline-grid size-6 place-items-center ${className}`} aria-hidden>
      <svg viewBox="0 0 24 24" className="absolute inset-0 size-6" fill="none" stroke="currentColor" strokeWidth="1.6">
        <rect x="3.5" y="4.5" width="17" height="16" rx="3" />
        <path d="M3.5 9h17" />
      </svg>
      <span className="relative mt-[5px] text-[9px] font-bold leading-none tabular-nums" suppressHydrationWarning>
        {dia}
      </span>
    </span>
  )
}

export function AppShell({
  children,
  user,
  avisosSinLeer = null,
}: {
  children: React.ReactNode
  user: { name?: string | null; rol?: string }
  /** Avisos sin leer al cargar; null si este rol no recibe avisos (no se muestra la campana). */
  avisosSinLeer?: number | null
}) {
  const pathname = usePathname()
  const [lateralAbierta, setLateralAbierta] = useState(true)
  const rol = (user.rol as Rol) || "OPERADOR"
  const nombre = user.name || "Usuario"
  const inicial = nombre.trim().charAt(0).toUpperCase() || "U"
  const modulos = MODULOS.filter((m) => m.roles.includes(rol))
  const inicio = modulos.find((m) => m.href === "/dashboard")
  const proyectos = modulos.filter((m) => m.href !== "/dashboard")
  const accion = ACCION_PRINCIPAL[rol]
  // El botón "+" flotante solo aparece en las pantallas principales, para no tapar formularios
  const enPantallaPrincipal = MODULOS.some((m) => m.href === pathname)

  const itemBase = "flex h-9 items-center gap-2.5 rounded-md px-2 text-[14px] transition-colors"
  const itemClase = (activo: boolean) =>
    `${itemBase} ${activo ? "bg-brand-soft font-medium text-brand-ink" : "text-fg hover:bg-black/[0.045]"}`

  return (
    <div className="min-h-dvh bg-canvas text-fg lg:flex">
      <a
        href="#contenido"
        className="sr-only z-50 rounded-md bg-fg px-4 py-2 font-semibold text-white focus:not-sr-only focus:absolute focus:left-4 focus:top-4"
      >
        Saltar al contenido
      </a>

      {/* ── Barra lateral: la de la app de Todoist ─────────────────── */}
      {lateralAbierta && (
        <aside
          aria-label="Barra lateral"
          className="sticky top-0 hidden h-dvh w-[280px] shrink-0 flex-col bg-sidebar lg:flex"
        >
          <div className="flex items-center gap-1 px-3 pb-2 pt-3">
            <Link
              href="/cuenta"
              title="Mi cuenta"
              aria-current={pathname === "/cuenta" ? "page" : undefined}
              className="flex min-w-0 flex-1 items-center gap-2 rounded-md px-1.5 py-1 transition-colors hover:bg-black/[0.045]"
            >
              <span
                className="grid size-[26px] shrink-0 place-items-center rounded-full bg-brand text-xs font-bold text-on-brand"
                aria-hidden
              >
                {inicial}
              </span>
              <span className="min-w-0 leading-tight">
                <span className="block truncate text-[14px] font-semibold">{nombre}</span>
                <span className="block truncate text-xs text-subdued">{ROL_LABEL[rol] ?? rol}</span>
              </span>
            </Link>
            {avisosSinLeer !== null && <Campana inicial={avisosSinLeer} className="size-8" />}
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="grid size-8 place-items-center rounded-md text-subdued transition-colors hover:bg-black/[0.05] hover:text-fg"
              aria-label="Cerrar sesión"
              title="Cerrar sesión"
            >
              <LogOut className="size-[18px]" />
            </button>
            <button
              type="button"
              onClick={() => setLateralAbierta(false)}
              className="grid size-8 place-items-center rounded-md text-subdued transition-colors hover:bg-black/[0.05] hover:text-fg"
              aria-label="Ocultar barra lateral"
              title="Ocultar barra lateral"
            >
              <PanelLeft className="size-[18px]" />
            </button>
          </div>

          <nav aria-label="Navegación principal" className="flex-1 overflow-y-auto px-3 pb-4">
            {/* Acción principal, como el "Añadir tarea" de Todoist */}
            <Link
              href={accion.href}
              className={`${itemBase} mb-1 font-semibold text-brand-ink hover:bg-black/[0.045]`}
            >
              <span className="grid size-6 place-items-center rounded-full bg-brand text-on-brand">
                <Plus className="size-4" strokeWidth={2.75} />
              </span>
              {accion.label}
            </Link>

            {inicio && (
              <Link
                href={inicio.href}
                aria-current={esActivo(pathname, inicio.href) ? "page" : undefined}
                className={itemClase(esActivo(pathname, inicio.href))}
              >
                <IconoHoy className={esActivo(pathname, inicio.href) ? "text-brand-ink" : "text-brand"} />
                Hoy
              </Link>
            )}

            {proyectos.length > 0 && (
              <>
                <h2 className="mb-1 mt-6 px-2 text-[13px] font-semibold text-subdued">Mis módulos</h2>
                <ul>
                  {proyectos.map((m) => {
                    const activo = esActivo(pathname, m.href)
                    return (
                      <li key={m.href}>
                        <Link href={m.href} aria-current={activo ? "page" : undefined} className={itemClase(activo)}>
                          <Hash className="size-[18px] shrink-0" style={{ color: m.color }} strokeWidth={2} aria-hidden />
                          <span className="min-w-0 flex-1 truncate">{m.label}</span>
                          <span className="truncate text-xs text-muted">{m.descripcion}</span>
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              </>
            )}

            {rol === "GERENCIA" && (
              <>
                <h2 className="mb-1 mt-6 px-2 text-[13px] font-semibold text-subdued">Administración</h2>
                <Link href="/usuarios" aria-current={esActivo(pathname, "/usuarios") ? "page" : undefined} className={itemClase(esActivo(pathname, "/usuarios"))}>
                  <Users className="size-[18px] shrink-0 text-subdued" aria-hidden />
                  Usuarios
                </Link>
              </>
            )}
          </nav>

          <div className="border-t border-line px-5 py-3">
            <TurnoChip />
          </div>
        </aside>
      )}

      <div className="min-w-0 flex-1">
        {/* Botón para volver a mostrar la barra lateral (escritorio) */}
        {!lateralAbierta && (
          <button
            type="button"
            onClick={() => setLateralAbierta(true)}
            className="fixed left-3 top-3 z-40 hidden size-8 place-items-center rounded-md text-subdued transition-colors hover:bg-black/[0.05] hover:text-fg lg:grid"
            aria-label="Mostrar barra lateral"
            title="Mostrar barra lateral"
          >
            <PanelLeft className="size-[18px]" />
          </button>
        )}

        {/* ── Móvil: barra superior compacta ─────────────────────────── */}
        <header className="sticky top-0 z-40 border-b border-line bg-canvas/95 backdrop-blur lg:hidden">
          <div className="flex h-14 items-center gap-3 px-4">
            <Link href="/cuenta" className="flex items-center gap-2" aria-label="Mi cuenta">
              <span className="grid size-8 place-items-center rounded-full bg-brand text-sm font-bold text-on-brand" aria-hidden>
                {inicial}
              </span>
              <span className="text-[15px] font-bold">{nombre.split(" ")[0]}</span>
            </Link>
            <TurnoChip className="ml-auto" />
            {avisosSinLeer !== null && <Campana inicial={avisosSinLeer} className="size-10" />}
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="grid size-10 place-items-center rounded-md text-subdued hover:bg-black/[0.05] hover:text-fg"
              aria-label="Cerrar sesión"
            >
              <LogOut className="size-5" />
            </button>
          </div>
        </header>

        <main id="contenido" className="mx-auto w-full max-w-5xl px-4 pb-32 pt-6 sm:px-8 lg:px-14 lg:pb-16 lg:pt-12">
          {children}
        </main>
      </div>

      {/* ── Móvil: botón + y pestañas inferiores, como la app de Todoist ── */}
      {enPantallaPrincipal && (
        <Link
          href={accion.href}
          aria-label={accion.label}
          className="fixed bottom-[calc(76px+env(safe-area-inset-bottom))] right-4 z-40 grid size-14 place-items-center rounded-full bg-brand text-on-brand shadow-[0_6px_18px_rgba(7,137,155,0.4)] transition-colors hover:bg-brand-hover lg:hidden"
        >
          <Plus className="size-7" strokeWidth={2.5} />
        </Link>
      )}
      <nav
        aria-label="Navegación principal"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-sidebar pb-[env(safe-area-inset-bottom)] lg:hidden"
      >
        <ul className="flex items-stretch justify-around px-1">
          {modulos.map((m) => {
            const activo = esActivo(pathname, m.href)
            const Icon = m.icon
            return (
              <li key={m.href} className="flex-1">
                <Link
                  href={m.href}
                  aria-current={activo ? "page" : undefined}
                  className={`flex min-h-[60px] flex-col items-center justify-center gap-1 text-[11px] ${
                    activo ? "font-bold text-brand" : "font-medium text-subdued"
                  }`}
                >
                  {m.href === "/dashboard" ? (
                    <IconoHoy />
                  ) : (
                    <Icon className="size-6" strokeWidth={activo ? 2.25 : 1.75} />
                  )}
                  <span className="max-w-full truncate">{m.href === "/dashboard" ? "Hoy" : m.label}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>
    </div>
  )
}
