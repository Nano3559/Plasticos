"use client"

import { useState, useSyncExternalStore } from "react"
import { turnoActual, type Turno } from "@/lib/turno"

const sinSuscripcion = () => () => {}

/**
 * Turno en curso, con la opción de cambiarlo a mano.
 * El servidor renderiza "MANANA" y el navegador lo ajusta a la hora real sin desajuste de hidratación.
 */
export function useTurno(): [Turno, (t: Turno) => void] {
  const detectado = useSyncExternalStore(sinSuscripcion, turnoActual, () => "MANANA" as Turno)
  const [elegido, setElegido] = useState<Turno | null>(null)
  return [elegido ?? detectado, setElegido]
}
