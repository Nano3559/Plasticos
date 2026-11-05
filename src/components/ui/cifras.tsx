import { Card } from "@/components/ui/card"

export type Cifra = { etiqueta: string; valor: React.ReactNode; nota?: React.ReactNode; tono?: "danger" | "brand" | "accent" | "warn" }

const TONO = { danger: "text-danger", brand: "text-brand-ink", accent: "text-accent", warn: "text-warn" } as const

/** Fila de cifras clave (como en Inicio): 2 columnas en el celular, hasta 4 en pantalla grande. */
export function Cifras({ items, etiqueta }: { items: Cifra[]; etiqueta?: string }) {
  const cols = items.length >= 4 ? "lg:grid-cols-4" : items.length === 3 ? "lg:grid-cols-3" : "lg:grid-cols-2"
  return (
    <Card className={`grid grid-cols-2 gap-0 py-0 ${cols}`} aria-label={etiqueta}>
      {items.map((c, i) => (
        <div
          key={c.etiqueta}
          className={`px-5 py-4 ${i % 2 === 1 ? "border-l border-line" : ""} ${i >= 2 ? "border-t border-line lg:border-t-0" : ""} ${i > 0 ? "lg:border-l" : ""}`}
        >
          <p className="text-sm text-subdued">{c.etiqueta}</p>
          <p className={`mt-1 text-[22px] font-extrabold leading-tight tracking-tight tabular-nums ${c.tono ? TONO[c.tono] : ""}`}>{c.valor}</p>
          {c.nota && <p className="mt-0.5 text-xs text-muted">{c.nota}</p>}
        </div>
      ))}
    </Card>
  )
}
