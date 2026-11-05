"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowDownToLine, ArrowUpFromLine, Plus, SlidersHorizontal } from "lucide-react"
import { formatNumero, formatPrecio } from "@/lib/formato"
import { CATEGORIA_MATERIAL, TURNO_ETIQUETA } from "@/lib/etiquetas"
import { Cifras } from "@/components/ui/cifras"
import { Encabezado } from "@/components/ui/encabezado"
import { Vacio } from "@/components/ui/mensaje"
import { Seccion } from "@/components/ui/seccion"

interface MovimientoItem {
  id: string
  tipo: "ENTRADA" | "SALIDA" | "AJUSTE"
  cantidad: number
  costoUnitario: number | null
  turno: string
  motivo: string | null
  proveedor: string | null
  lote: string | null
  orden: { id: string; etiqueta: string } | null
  userName: string
  createdAt: string
  saldoAcumulado: number
}

interface MaterialData {
  id: string
  nombre: string
  categoria: string
  unidad: string
  stockMinimo: number
  costoPromedio: number
  stock: number
}

const TIPO = {
  ENTRADA: { texto: "Entrada", I: ArrowDownToLine, clase: "bg-accent/12 text-accent" },
  SALIDA: { texto: "Salida", I: ArrowUpFromLine, clase: "bg-warn/12 text-warn" },
  AJUSTE: { texto: "Ajuste", I: SlidersHorizontal, clase: "bg-info/12 text-info" },
} as const
const FILTROS = ["TODOS", "ENTRADA", "SALIDA", "AJUSTE"] as const

const fechaHora = (iso: string) =>
  new Date(iso)
    .toLocaleString("es-BO", { day: "2-digit", month: "short", year: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "America/La_Paz" })
    .replace(".", "")

export function KardexMaterialView({
  material,
  movimientos,
  puedeVerOT,
}: {
  material: MaterialData
  movimientos: MovimientoItem[]
  puedeVerOT: boolean
}) {
  const [filtro, setFiltro] = useState<(typeof FILTROS)[number]>("TODOS")
  const u = material.unidad
  const cant = (n: number) => `${formatNumero(n, 2)} ${u}`
  const filtrados = filtro === "TODOS" ? movimientos : movimientos.filter((m) => m.tipo === filtro)
  const entradas = movimientos.filter((m) => m.tipo === "ENTRADA").reduce((s, m) => s + m.cantidad, 0)
  const salidas = movimientos.filter((m) => m.tipo === "SALIDA").reduce((s, m) => s + m.cantidad, 0)
  const bajo = material.stockMinimo > 0 && material.stock < material.stockMinimo

  return (
    <div className="space-y-10">
      <Encabezado
        miga={{ href: "/inventario", texto: "Inventario" }}
        titulo={material.nombre}
        descripcion={`${CATEGORIA_MATERIAL[material.categoria] ?? material.categoria} · kardex: cada movimiento con el saldo que dejó. No se editan ni se borran.`}
      >
        <div className="flex flex-wrap gap-x-4 gap-y-1" role="group" aria-label="Registrar">
          {[
            { href: `/inventario/entrada?material=${material.id}`, texto: "Entrada" },
            { href: `/inventario/salida?material=${material.id}`, texto: "Vale de salida" },
            { href: `/inventario/ajuste?material=${material.id}`, texto: "Ajuste" },
          ].map((a) => (
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
          {
            etiqueta: "Stock",
            valor: cant(material.stock),
            nota: material.stockMinimo > 0 ? `mínimo ${cant(material.stockMinimo)}` : "sin mínimo",
            tono: bajo ? "danger" : undefined,
          },
          { etiqueta: "Costo promedio", valor: formatPrecio(material.costoPromedio), nota: `por ${u}` },
          { etiqueta: "Entró", valor: cant(entradas), nota: "en total" },
          { etiqueta: "Salió", valor: cant(salidas), nota: "en total" },
        ]}
      />

      <Seccion titulo="Movimientos" cuenta={filtrados.length}>
        <div className="flex gap-2 overflow-x-auto py-3" role="group" aria-label="Tipo de movimiento">
          {FILTROS.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFiltro(f)}
              aria-pressed={filtro === f}
              className={`h-9 shrink-0 rounded-full border px-3.5 text-sm font-medium transition ${
                filtro === f ? "border-brand bg-brand-soft text-brand-ink" : "border-line text-subdued hover:bg-elevated"
              }`}
            >
              {f === "TODOS" ? "Todos" : TIPO[f].texto + "s"}
            </button>
          ))}
        </div>

        {filtrados.length === 0 ? (
          <Vacio>No hay movimientos de este tipo.</Vacio>
        ) : (
          <ul>
            {filtrados.map((m) => {
              const t = TIPO[m.tipo]
              const signo = m.tipo === "SALIDA" || m.cantidad < 0 ? "−" : "+"
              const detalle = [
                m.proveedor,
                m.lote && `lote ${m.lote}`,
                m.motivo,
                m.costoUnitario !== null && m.tipo === "ENTRADA" ? `${formatPrecio(m.costoUnitario)}/${u}` : null,
              ].filter(Boolean)
              return (
                <li key={m.id} className="flex items-start gap-3 border-b border-line py-3 last:border-b-0">
                  <span className={`mt-0.5 grid size-9 shrink-0 place-items-center rounded-lg ${t.clase}`} aria-hidden>
                    <t.I className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">
                      {t.texto}
                      {m.orden &&
                        (puedeVerOT ? (
                          <>
                            {" · "}
                            <Link href={`/produccion/ordenes/${m.orden.id}`} className="font-normal text-brand-ink hover:underline">
                              {m.orden.etiqueta}
                            </Link>
                          </>
                        ) : (
                          <span className="font-normal text-subdued"> · {m.orden.etiqueta}</span>
                        ))}
                    </p>
                    {detalle.length > 0 && <p className="mt-0.5 text-[13px] text-subdued">{detalle.join(" · ")}</p>}
                    <p className="mt-0.5 text-xs text-muted">
                      {fechaHora(m.createdAt)} · turno {(TURNO_ETIQUETA[m.turno] ?? m.turno).toLowerCase()} · {m.userName}
                    </p>
                  </div>
                  <div className="shrink-0 text-right tabular-nums">
                    <p className={`font-bold ${signo === "−" ? "text-warn" : "text-accent"}`}>
                      {signo}
                      {formatNumero(Math.abs(m.cantidad), 2)}
                    </p>
                    <p className="text-xs text-muted">saldo {formatNumero(m.saldoAcumulado, 2)}</p>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </Seccion>
    </div>
  )
}
