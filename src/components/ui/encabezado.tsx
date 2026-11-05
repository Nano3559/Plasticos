import Link from "next/link"

/**
 * Encabezado de página, igual en toda la app: migas arriba (a dónde se vuelve),
 * título grande y una línea de descripción. Las acciones van a la derecha.
 */
export function Encabezado({
  miga,
  titulo,
  descripcion,
  acciones,
  children,
}: {
  miga?: { href: string; texto: string } | { href: string; texto: string }[]
  titulo: React.ReactNode
  descripcion?: React.ReactNode
  acciones?: React.ReactNode
  children?: React.ReactNode
}) {
  const migas = miga ? (Array.isArray(miga) ? miga : [miga]) : []
  return (
    <header className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          {migas.length > 0 && (
            <nav aria-label="Ruta" className="text-sm font-medium text-subdued">
              {migas.map((m, i) => (
                <span key={m.href}>
                  {i > 0 && <span className="mx-1.5 text-muted">/</span>}
                  <Link href={m.href} className="hover:text-brand-ink hover:underline">
                    {m.texto}
                  </Link>
                </span>
              ))}
            </nav>
          )}
          <h1 className="mt-1 text-[26px] font-bold leading-tight sm:text-[28px]">{titulo}</h1>
          {descripcion && <p className="mt-1 text-subdued">{descripcion}</p>}
        </div>
        {acciones && <div className="flex flex-wrap items-center gap-2">{acciones}</div>}
      </div>
      {children}
    </header>
  )
}
