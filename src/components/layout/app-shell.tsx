"use client"

import { signOut } from "next-auth/react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { ListChecks, LogOut, Plus } from "lucide-react"
import { ACCION_PRINCIPAL, MODULOS, ROL_LABEL, type Rol } from "./modules"
import { TurnoChip } from "./turno-chip"

function esActivo(pathname: string, href: string) {
  return pathname === href || (href !== "/dashboard" && pathname.startsWith(href))
}

export function AppShell({
  children,
  user,
}: {
  children: React.ReactNode
  user: { name?: string | null; rol?: string }
}) {
  const pathname = usePathname()
  const rol = (user.rol as Rol) || "OPERADOR"
  const nombre = user.name || "Usuario"
  const modulos = MODULOS.filter((m) => m.roles.includes(rol))
  const accion = ACCION_PRINCIPAL[rol]
  // El botón "+" flotante solo aparece en las pantallas principales, para no tapar formularios
  const enPantallaPrincipal = MODULOS.some((m) => m.href === pathname)

  return (
    <div className="min-h-dvh bg-canvas text-fg">
      <a
        href="#contenido"
        className="sr-only z-50 rounded-lg bg-fg px-4 py-2 font-semibold text-white focus:not-sr-only focus:absolute focus:left-4 focus:top-4"
      >
        Saltar al contenido
      </a>

      {/* ── Barra superior: igual que la de todoist.com ───────────── */}
      <header className="sticky top-0 z-40 border-b border-line bg-canvas/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:px-6">
          <Link href="/dashboard" className="flex shrink-0 items-center gap-2.5 rounded-lg py-1 pr-2">
            <span className="grid size-9 place-items-center rounded-[10px] bg-brand text-on-brand">
              <ListChecks className="size-5" strokeWidth={2.5} />
            </span>
            <span className="text-lg font-extrabold tracking-tight">Planta</span>
          </Link>

          <nav aria-label="Navegación principal" className="ml-3 hidden lg:block">
            <ul className="flex items-center gap-1">
              {modulos.map((m) => {
                const activo = esActivo(pathname, m.href)
                return (
                  <li key={m.href}>
                    <Link
                      href={m.href}
                      aria-current={activo ? "page" : undefined}
                      className={`inline-flex h-10 items-center rounded-lg px-3.5 text-[15px] font-semibold transition-colors ${
                        activo ? "bg-brand/10 text-brand" : "text-subdued hover:bg-black/[0.05] hover:text-fg"
                      }`}
                    >
                      {m.label}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </nav>

          <div className="ml-auto flex items-center gap-3">
            <TurnoChip className="hidden xl:inline-flex" />
            <Link
              href={accion.href}
              className="hidden h-10 items-center gap-1.5 whitespace-nowrap rounded-lg bg-brand px-4 text-sm font-semibold text-on-brand transition-colors hover:bg-brand-hover lg:inline-flex"
            >
              <Plus className="size-4" strokeWidth={2.5} />
              {accion.label}
            </Link>

            <div className="flex items-center gap-2 border-l border-line pl-3">
              <span
                className="grid size-9 shrink-0 place-items-center rounded-full bg-brand/10 text-sm font-bold text-brand"
                aria-hidden
              >
                {nombre.trim().charAt(0).toUpperCase() || "U"}
              </span>
              <div className="hidden min-w-0 leading-tight xl:block">
                <p className="max-w-36 truncate text-sm font-semibold">{nombre}</p>
                <p className="text-xs text-subdued">{ROL_LABEL[rol] ?? rol}</p>
              </div>
              <button
                type="button"
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="grid size-10 place-items-center rounded-lg text-subdued transition-colors hover:bg-black/[0.05] hover:text-fg"
                aria-label="Cerrar sesión"
                title="Cerrar sesión"
              >
                <LogOut className="size-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main id="contenido" className="mx-auto w-full max-w-6xl px-4 pb-32 pt-6 sm:px-6 lg:pb-16 lg:pt-10">
        {children}
      </main>

      {/* ── Móvil: botón + y pestañas inferiores ──────────────────── */}
      {enPantallaPrincipal && (
        <Link
          href={accion.href}
          aria-label={accion.label}
          className="fixed bottom-[calc(76px+env(safe-area-inset-bottom))] right-4 z-40 grid size-14 place-items-center rounded-full bg-brand text-on-brand shadow-[0_6px_18px_rgba(209,69,59,0.4)] transition-colors hover:bg-brand-hover lg:hidden"
        >
          <Plus className="size-7" strokeWidth={2.5} />
        </Link>
      )}
      <nav
        aria-label="Navegación principal"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-panel pb-[env(safe-area-inset-bottom)] lg:hidden"
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
                  <Icon className="size-6" strokeWidth={activo ? 2.5 : 1.75} />
                  <span className="max-w-full truncate">{m.label}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>
    </div>
  )
}
