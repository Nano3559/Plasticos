"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { ArrowUpFromLine, BellOff, CheckCheck, PackageX, SlidersHorizontal, TriangleAlert } from "lucide-react"
import { marcarLeida, marcarTodasLeidas } from "@/actions/notificaciones"
import { Button } from "@/components/ui/button"

export type Aviso = {
  id: string
  tipo: "SALIDA" | "AJUSTE" | "STOCK_BAJO" | "RECHAZO" | "EXTRUSION" | "IMPRESION" | "CONFECCION"
  titulo: string
  detalle: string | null
  href: string | null
  leida: boolean
  creada: string
}

const ICONO = {
  CONFECCION: { I: SlidersHorizontal, clase: "bg-info/10 text-info" },
  IMPRESION: { I: SlidersHorizontal, clase: "bg-info/10 text-info" },
  EXTRUSION: { I: SlidersHorizontal, clase: "bg-info/10 text-info" },
  SALIDA: { I: ArrowUpFromLine, clase: "bg-info/10 text-info" },
  AJUSTE: { I: SlidersHorizontal, clase: "bg-warn/10 text-warn" },
  STOCK_BAJO: { I: TriangleAlert, clase: "bg-danger/10 text-danger" },
  RECHAZO: { I: PackageX, clase: "bg-danger/10 text-danger" },
} as const

/** "hace 5 min", "hace 3 h", "ayer 14:20", "lun 03 nov 09:15" */
function cuando(iso: string, ahora: number): string {
  const d = new Date(iso)
  const min = Math.round((ahora - d.getTime()) / 60_000)
  if (min < 1) return "recién"
  if (min < 60) return `hace ${min} min`
  if (min < 12 * 60) return `hace ${Math.round(min / 60)} h`
  const hora = d.toLocaleTimeString("es-BO", { hour: "2-digit", minute: "2-digit", timeZone: "America/La_Paz" })
  const dia = (x: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/La_Paz" }).format(x)
  if (dia(d) === dia(new Date(ahora - 86_400_000))) return `ayer ${hora}`
  if (dia(d) === dia(new Date(ahora))) return `hoy ${hora}`
  return `${d.toLocaleDateString("es-BO", { weekday: "short", day: "2-digit", month: "short", timeZone: "America/La_Paz" })} ${hora}`
}

export function ListaAvisos({ avisos, recibe, maximo }: { avisos: Aviso[]; recibe: boolean; maximo: number }) {
  const router = useRouter()
  const [pendiente, iniciar] = useTransition()
  const [leidas, setLeidas] = useState<Set<string>>(new Set())
  const [ahora] = useState(() => Date.now())
  const esLeida = (a: Aviso) => a.leida || leidas.has(a.id)
  const sinLeer = avisos.filter((a) => !esLeida(a)).length

  const abrir = (a: Aviso) => {
    if (!esLeida(a)) {
      setLeidas((s) => new Set(s).add(a.id))
      void marcarLeida(a.id).then(() => window.dispatchEvent(new Event("avisos:cambio")))
    }
    if (a.href) router.push(a.href)
  }

  return (
    <div className="max-w-2xl space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[26px] font-bold leading-tight sm:text-[28px]">Avisos</h1>
          <p className="mt-1 text-subdued">
            {sinLeer > 0 ? `${sinLeer} sin leer` : "Estás al día"}
            {recibe && " · movimientos de inventario, rechazos y partes de producción"}
          </p>
        </div>
        {sinLeer > 0 && (
          <Button
            variant="outline"
            size="sm"
            disabled={pendiente}
            onClick={() =>
              iniciar(async () => {
                await marcarTodasLeidas()
                setLeidas(new Set(avisos.map((a) => a.id)))
                window.dispatchEvent(new Event("avisos:cambio"))
                router.refresh()
              })
            }
          >
            <CheckCheck /> Marcar todo como leído
          </Button>
        )}
      </header>

      {avisos.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center text-subdued">
          <BellOff className="size-8 text-muted" aria-hidden />
          <p>{recibe ? "Todavía no hay avisos. Aparecerán aquí cuando alguien saque o ajuste material." : "No tienes avisos."}</p>
        </div>
      ) : (
        <ul className="divide-y divide-line border-y border-line">
          {avisos.map((a) => {
            const { I, clase } = ICONO[a.tipo]
            const leida = esLeida(a)
            return (
              <li key={a.id}>
                <button
                  type="button"
                  onClick={() => abrir(a)}
                  className={`flex w-full items-start gap-3 px-2 py-3 text-left transition-colors hover:bg-elevated ${leida ? "" : "bg-brand-soft/60"}`}
                >
                  <span className={`mt-0.5 grid size-8 shrink-0 place-items-center rounded-full ${clase}`} aria-hidden>
                    <I className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={`block text-sm ${leida ? "font-medium text-subdued" : "font-semibold text-fg"}`}>{a.titulo}</span>
                    {a.detalle && <span className="mt-0.5 block text-[13px] text-subdued">{a.detalle}</span>}
                    <span className="mt-0.5 block text-xs text-muted" suppressHydrationWarning>
                      {cuando(a.creada, ahora)}
                    </span>
                  </span>
                  {!leida && <span className="mt-2 size-2 shrink-0 rounded-full bg-brand" aria-label="Sin leer" />}
                </button>
              </li>
            )
          })}
        </ul>
      )}
      {avisos.length >= maximo && <p className="text-xs text-muted">Se muestran los últimos {maximo} avisos.</p>}
    </div>
  )
}
