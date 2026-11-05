"use client"

import { Moon, Sun, Sunset } from "lucide-react"
import type { Turno } from "@/lib/turno"
import { Opciones } from "./opciones"

/** Turno con tres botones. El valor inicial lo da useTurno() según la hora de Bolivia. */
export function ElegirTurno({ valor, onCambio }: { valor: Turno; onCambio: (t: Turno) => void }) {
  return (
    <Opciones<Turno>
      nombre="turno"
      etiqueta="Turno"
      valor={valor}
      onCambio={onCambio}
      opciones={[
        { valor: "MANANA", texto: "Mañana", icono: Sun },
        { valor: "TARDE", texto: "Tarde", icono: Sunset },
        { valor: "NOCHE", texto: "Noche", icono: Moon },
      ]}
    />
  )
}
