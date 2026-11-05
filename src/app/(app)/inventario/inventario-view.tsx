"use client"

import { useState } from "react"
import Link from "next/link"
import { ChevronRight, Package, PackageX, Plus, Search, X } from "lucide-react"
import { formatBs, formatNumero, formatPrecio } from "@/lib/formato"
import { CATEGORIA_MATERIAL } from "@/lib/etiquetas"
import { Button } from "@/components/ui/button"
import { Cifras } from "@/components/ui/cifras"
import { Encabezado } from "@/components/ui/encabezado"
import { FilaTarea } from "@/components/ui/fila-tarea"
import { Input } from "@/components/ui/input"
import { Vacio } from "@/components/ui/mensaje"
import { Seccion } from "@/components/ui/seccion"

interface MaterialConStock {
  id: string
  nombre: string
  categoria: string
  unidad: string
  stockMinimo: number
  costoPromedio: number
  stock: number
}

const cantidad = (n: number, unidad: string) => `${formatNumero(n, 1)} ${unidad}`
const sinTildes = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()

const ACCIONES = [
  { href: "/inventario/entrada", texto: "Entrada de material" },
  { href: "/inventario/salida", texto: "Vale de salida" },
  { href: "/inventario/ajuste", texto: "Ajuste" },
]

export function InventarioView({ materiales }: { materiales: MaterialConStock[] }) {
  const [busqueda, setBusqueda] = useState("")
  const [categoria, setCategoria] = useState("TODOS")

  const bajos = materiales.filter((m) => m.stockMinimo > 0 && m.stock < m.stockMinimo)
  const kgEnAlmacen = materiales.reduce((s, m) => s + (m.unidad === "kg" ? Math.max(0, m.stock) : 0), 0)
  const valor = materiales.reduce((s, m) => s + Math.max(0, m.stock) * m.costoPromedio, 0)
  const categorias = ["TODOS", ...Object.keys(CATEGORIA_MATERIAL).filter((c) => materiales.some((m) => m.categoria === c))]

  const q = sinTildes(busqueda.trim())
  const filtrados = materiales.filter((m) => (categoria === "TODOS" || m.categoria === categoria) && (!q || sinTildes(m.nombre).includes(q)))

  return (
    <div className="space-y-10">
      <Encabezado
        titulo="Inventario"
        descripcion="Stock de resinas, molido, pigmentos y tintas. Cada movimiento queda registrado y no se borra."
        acciones={
          <Button asChild size="sm" variant="outline">
            <Link href="/inventario/nuevo">
              <Plus /> Material nuevo
            </Link>
          </Button>
        }
      >
        <div className="flex flex-wrap gap-x-4 gap-y-1" role="group" aria-label="Movimientos">
          {ACCIONES.map((a) => (
            <Link
              key={a.href}
              href={a.href}
              className="group inline-flex h-10 items-center gap-2 text-[14px] text-subdued transition-colors hover:text-brand-ink"
            >
              <span className="grid size-[18px] place-items-center rounded-full text-brand transition-colors group-hover:bg-brand group-hover:text-on-brand">
                <Plus className="size-4" strokeWidth={2.5} />
              </span>
              {a.texto}
            </Link>
          ))}
        </div>
      </Encabezado>

      <Cifras
        items={[
          { etiqueta: "En almacén", valor: `${formatNumero(kgEnAlmacen, 0)} kg`, nota: "materiales medidos en kg" },
          { etiqueta: "Valor del stock", valor: formatBs(valor, 0), nota: "a costo promedio" },
          { etiqueta: "Materiales", valor: String(materiales.length) },
          { etiqueta: "Bajo el mínimo", valor: String(bajos.length), nota: bajos.length ? "reponer" : "todo en orden", tono: bajos.length ? "danger" : undefined },
        ]}
      />

      {bajos.length > 0 && (
        <Seccion titulo="Bajo el mínimo" cuenta={bajos.length}>
          <div>
            {bajos.map((m) => (
              <FilaTarea
                key={m.id}
                href={`/inventario/${m.id}`}
                prioridad={m.stock <= 0 ? "alta" : "media"}
                titulo={m.nombre}
                detalle={`Quedan ${cantidad(m.stock, m.unidad)} · mínimo ${cantidad(m.stockMinimo, m.unidad)}`}
              />
            ))}
          </div>
        </Seccion>
      )}

      <Link
        href="/inventario/rechazos"
        className="flex items-center justify-between gap-3 rounded-lg bg-elevated px-4 py-3 text-sm transition-colors hover:bg-highlight"
      >
        <span className="flex items-center gap-2.5">
          <PackageX className="size-4 text-danger" />
          <span>
            <span className="font-semibold">Rechazos por proveedor</span>
            <span className="ml-2 text-subdued">quién entrega material malo</span>
          </span>
        </span>
        <ChevronRight className="size-4 text-muted" />
      </Link>

      <Seccion titulo="Materiales" cuenta={filtrados.length}>
        <div className="space-y-3 py-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
            <Input
              type="search"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar material"
              aria-label="Buscar material"
              className="pl-9 pr-9"
            />
            {busqueda && (
              <button
                type="button"
                onClick={() => setBusqueda("")}
                aria-label="Borrar búsqueda"
                className="absolute right-2 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-md text-muted hover:text-fg"
              >
                <X className="size-4" />
              </button>
            )}
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Categoría">
            {categorias.map((c) => {
              const activo = c === categoria
              const n = c === "TODOS" ? materiales.length : materiales.filter((m) => m.categoria === c).length
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCategoria(c)}
                  aria-pressed={activo}
                  className={`inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium transition ${
                    activo ? "border-brand bg-brand-soft text-brand-ink" : "border-line text-subdued hover:bg-elevated"
                  }`}
                >
                  {c === "TODOS" ? "Todos" : CATEGORIA_MATERIAL[c]}
                  <span className="text-xs tabular-nums opacity-70">{n}</span>
                </button>
              )
            })}
          </div>
        </div>

        {filtrados.length === 0 ? (
          <Vacio icono={Package}>{busqueda ? "Ningún material coincide con la búsqueda." : "No hay materiales en esta categoría."}</Vacio>
        ) : (
          <ul>
            {filtrados.map((m) => {
              const bajo = m.stockMinimo > 0 && m.stock < m.stockMinimo
              const pct = m.stockMinimo > 0 ? Math.min(100, (m.stock / (m.stockMinimo * 2)) * 100) : 100
              return (
                <li key={m.id}>
                  <Link href={`/inventario/${m.id}`} className="group flex items-center gap-4 border-b border-line py-3">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] group-hover:text-brand-ink">{m.nombre}</span>
                      <span className="mt-0.5 block text-[13px] text-subdued">
                        {CATEGORIA_MATERIAL[m.categoria] ?? m.categoria}
                        {m.stockMinimo > 0 && ` · mínimo ${cantidad(m.stockMinimo, m.unidad)}`}
                        {m.costoPromedio > 0 && ` · ${formatPrecio(m.costoPromedio)}/${m.unidad}`}
                      </span>
                    </span>
                    <span className="w-28 shrink-0 text-right">
                      <span className={`block font-semibold tabular-nums ${bajo ? "text-danger" : ""}`}>{cantidad(m.stock, m.unidad)}</span>
                      {m.stockMinimo > 0 && (
                        <span className="mt-1 block h-1 overflow-hidden rounded-full bg-black/[0.07]" aria-hidden>
                          <span className={`block h-full rounded-full ${bajo ? "bg-danger" : "bg-accent"}`} style={{ width: `${pct}%` }} />
                        </span>
                      )}
                    </span>
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </Seccion>
    </div>
  )
}
