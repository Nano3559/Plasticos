const ESTADOS: Record<string, { texto: string; clase: string }> = {
  ABIERTA: { texto: "En producción", clase: "bg-accent/15 text-accent" },
  TERMINADA: { texto: "Producida", clase: "bg-info/15 text-info" },
  ENTREGADA: { texto: "Entregada", clase: "bg-black/[0.06] text-subdued" },
}

/** Estado de una orden de trabajo, con el mismo texto y color en todas las pantallas. */
export function EstadoOrden({ estado, className = "" }: { estado: string; className?: string }) {
  const e = ESTADOS[estado] ?? { texto: estado, clase: "bg-black/[0.06] text-subdued" }
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${e.clase} ${className}`}>
      {e.texto}
    </span>
  )
}
