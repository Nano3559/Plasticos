"use client"

import { useSyncExternalStore } from "react"
import { Clock } from "lucide-react"
import { TURNO_NOMBRE, horaLaPaz, turnoDeHora } from "@/lib/turno"

const FIN: Record<string, number> = { MANANA: 14, TARDE: 22, NOCHE: 30 }

function suscribir(avisar: () => void) {
  const id = window.setInterval(avisar, 30_000)
  return () => window.clearInterval(id)
}
// Minuto actual: cambia solo una vez por minuto, así React no re-renderiza de más
const minuto = () => Math.floor(Date.now() / 60_000)

/** Turno en curso y cuánto falta para que termine. Se calcula con la hora de Bolivia. */
export function TurnoChip({ className = "" }: { className?: string }) {
  const m = useSyncExternalStore(suscribir, minuto, () => null)
  if (m === null) return <span className={`inline-block h-8 w-40 rounded-full bg-black/[0.04] ${className}`} aria-hidden />

  const ahora = new Date(m * 60_000)
  const hora = horaLaPaz(ahora)
  const minutos = Number(new Intl.DateTimeFormat("en-US", { timeZone: "America/La_Paz", minute: "numeric" }).format(ahora))
  let h = hora + minutos / 60
  if (h < 6) h += 24
  const turno = turnoDeHora(hora)
  const restante = Math.max(0, Math.round((FIN[turno] - h) * 60))
  const texto = restante >= 60 ? `${Math.floor(restante / 60)} h ${restante % 60} min` : `${restante} min`

  return (
    <span
      className={`inline-flex h-8 items-center gap-1.5 whitespace-nowrap rounded-full bg-elevated px-3 text-sm text-subdued ${className}`}
      title={`Quedan ${texto} del turno ${TURNO_NOMBRE[turno]}`}
    >
      <Clock className="size-3.5" aria-hidden />
      <span className="sr-only">Quedan {texto} del turno {TURNO_NOMBRE[turno]}</span>
      <span aria-hidden>
        {TURNO_NOMBRE[turno].charAt(0).toUpperCase() + TURNO_NOMBRE[turno].slice(1)} · <span className="font-semibold tabular-nums text-fg">{texto}</span>
      </span>
    </span>
  )
}
