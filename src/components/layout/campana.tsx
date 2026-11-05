"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Bell } from "lucide-react"

const CADA_MS = 60_000

/** Campana con la cantidad de avisos sin leer. Se actualiza cada minuto, al cambiar de página y al volver a la pestaña. */
export function Campana({ inicial, className = "" }: { inicial: number; className?: string }) {
  const pathname = usePathname()
  const [sinLeer, setSinLeer] = useState(inicial)

  useEffect(() => {
    let vivo = true
    const consultar = async () => {
      if (document.visibilityState !== "visible") return
      try {
        const r = await fetch("/api/notificaciones/conteo", { cache: "no-store" })
        if (r.ok && vivo) setSinLeer((await r.json()).sinLeer ?? 0)
      } catch {
        // sin conexión: se queda con el último número
      }
    }
    void consultar()
    const intervalo = setInterval(consultar, CADA_MS)
    document.addEventListener("visibilitychange", consultar)
    window.addEventListener("avisos:cambio", consultar)
    return () => {
      vivo = false
      clearInterval(intervalo)
      document.removeEventListener("visibilitychange", consultar)
      window.removeEventListener("avisos:cambio", consultar)
    }
  }, [pathname])

  const activo = pathname === "/notificaciones"
  const etiqueta = sinLeer > 0 ? `Avisos: ${sinLeer} sin leer` : "Avisos"
  return (
    <Link
      href="/notificaciones"
      aria-label={etiqueta}
      title={etiqueta}
      aria-current={activo ? "page" : undefined}
      className={`relative grid place-items-center rounded-md transition-colors hover:bg-black/[0.05] hover:text-fg ${
        activo ? "text-brand-ink" : "text-subdued"
      } ${className}`}
    >
      <Bell className="size-[18px]" />
      {sinLeer > 0 && (
        <span className="absolute -right-0.5 -top-0.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-danger px-1 text-[10px] font-bold leading-none text-white tabular-nums">
          {sinLeer > 99 ? "99+" : sinLeer}
        </span>
      )}
    </Link>
  )
}
