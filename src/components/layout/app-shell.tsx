"use client"

import { signOut } from "next-auth/react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  LogOut,
  LayoutDashboard,
  Package,
  Factory,
  Receipt,
  BarChart3,
  Calculator,
  User,
  Clock,
} from "lucide-react"

const navItems = [
  { href: "/dashboard", label: "Inicio", icon: LayoutDashboard, roles: ["OPERADOR", "ALMACEN", "ADMIN", "GERENCIA"] },
  { href: "/inventario", label: "Inventario", icon: Package, roles: ["ALMACEN", "ADMIN", "GERENCIA"] },
  { href: "/produccion", label: "Producción", icon: Factory, roles: ["OPERADOR", "ADMIN", "GERENCIA"] },
  { href: "/costos", label: "Costos", icon: Calculator, roles: ["ADMIN", "GERENCIA"] },
  { href: "/cobranzas", label: "Cobranzas", icon: Receipt, roles: ["ADMIN", "GERENCIA"] },
  { href: "/reportes", label: "Reportes", icon: BarChart3, roles: ["ADMIN", "GERENCIA"] },
]

const ROLE_BADGES: Record<string, { label: string; badge: string }> = {
  OPERADOR: { label: "Operador", badge: "bg-amber-100 text-amber-900 border-amber-300" },
  ALMACEN: { label: "Almacén", badge: "bg-cyan-100 text-cyan-900 border-cyan-300" },
  ADMIN: { label: "Administrador", badge: "bg-emerald-100 text-emerald-900 border-emerald-300" },
  GERENCIA: { label: "Gerencia", badge: "bg-purple-100 text-purple-900 border-purple-300" },
}

export function AppShell({
  children,
  user,
}: {
  children: React.ReactNode
  user: { name?: string | null; rol?: string }
}) {
  const pathname = usePathname()
  const userRole = user.rol || "OPERADOR"
  const filteredNav = navItems.filter((item) => item.roles.includes(userRole))
  const roleConfig = ROLE_BADGES[userRole] || { label: userRole, badge: "bg-slate-100 text-slate-800" }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Top Header */}
      <header className="sticky top-0 z-40 border-b border-slate-200/90 bg-white/95 backdrop-blur-md shadow-2xs">
        <div className="max-w-6xl mx-auto flex h-14 items-center justify-between px-3 sm:px-6">
          <div className="flex items-center gap-4 sm:gap-6">
            {/* Logo */}
            <Link
              href="/dashboard"
              className="flex items-center gap-2 font-bold text-sm tracking-tight text-slate-900 group"
            >
              <div className="h-8 w-8 rounded-xl bg-gradient-to-tr from-sky-600 to-teal-500 text-white flex items-center justify-center font-black text-xs shadow-xs group-hover:scale-105 transition-transform">
                <Factory className="h-4 w-4" />
              </div>
              <div className="hidden xs:block leading-tight">
                <div className="font-extrabold text-xs sm:text-sm text-slate-900 leading-none">
                  Planta Bolsas
                </div>
                <div className="text-[10px] text-slate-400 font-medium leading-none mt-0.5">
                  & Reciclado
                </div>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-1">
              {filteredNav.map((item) => {
                const Icon = item.icon
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/dashboard" && pathname.startsWith(item.href))

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      isActive
                        ? "bg-slate-900 text-white shadow-xs"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span>{item.label}</span>
                  </Link>
                )
              })}
            </nav>
          </div>

          {/* User profile & Logout */}
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="text-right hidden sm:block">
              <div className="text-xs font-bold text-slate-900 leading-tight">
                {user.name || "Usuario"}
              </div>
              <span
                className={`inline-block text-[10px] font-bold px-2 py-0.2 rounded-full border mt-0.5 ${roleConfig.badge}`}
              >
                {roleConfig.label}
              </span>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="h-9 px-2.5 rounded-lg text-xs text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition"
              title="Cerrar sesión"
            >
              <LogOut className="h-4 w-4 sm:mr-1" />
              <span className="hidden sm:inline font-medium">Salir</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 px-3 sm:px-6 py-5 pb-24 md:pb-10 max-w-6xl w-full mx-auto">
        {children}
      </main>

      {/* Mobile Bottom Navigation (Touch targets >= 48px) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200/90 bg-white/95 backdrop-blur-md shadow-lg">
        <div className="flex items-center justify-around px-1 py-1 h-16">
          {filteredNav.map((item) => {
            const Icon = item.icon
            const isActive =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href))

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex-1 flex flex-col items-center justify-center gap-0.5 min-h-[48px] rounded-xl text-[10px] transition-colors ${
                  isActive
                    ? "text-sky-600 font-bold"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                <div
                  className={`p-1.5 rounded-lg transition-transform ${
                    isActive ? "bg-sky-50 text-sky-700 scale-105" : ""
                  }`}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <span className="truncate max-w-[56px] text-center">
                  {item.label}
                </span>
              </Link>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
