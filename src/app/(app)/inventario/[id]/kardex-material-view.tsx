"use client"

import { formatBs } from "@/lib/formato"
import { useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft, ArrowDownToLine, ArrowUpFromLine, SlidersHorizontal, User, AlertTriangle, Clock } from "lucide-react"

interface MovimientoItem {
  id: string
  tipo: "ENTRADA" | "SALIDA" | "AJUSTE"
  cantidad: number
  costoUnitario: number | null
  turno: string
  motivo: string | null
  proveedor: string | null
  lote: string | null
  ordenNumero: number | null
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

export function KardexMaterialView({
  material,
  movimientos,
}: {
  material: MaterialData
  movimientos: MovimientoItem[]
}) {
  const [filtroTipo, setFiltroTipo] = useState<string>("TODOS")

  const filtrados = movimientos.filter((m) => {
    if (filtroTipo === "TODOS") return true
    return m.tipo === filtroTipo
  })

  const totalEntradas = movimientos
    .filter((m) => m.tipo === "ENTRADA")
    .reduce((s, m) => s + m.cantidad, 0)

  const totalSalidas = movimientos
    .filter((m) => m.tipo === "SALIDA")
    .reduce((s, m) => s + m.cantidad, 0)

  const isLowStock = material.stock < material.stockMinimo && material.stockMinimo > 0

  return (
    <div className="space-y-6">
      {/* Navigation header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/inventario">
            <Button variant="ghost" size="sm" className="h-9 w-9 p-0 rounded-lg">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-md bg-highlight text-subdued border border-line">
                {material.categoria}
              </span>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-fg">
                {material.nombre}
              </h1>
            </div>
            <p className="text-xs text-subdued">
              Kardex físico valorado • Libro de movimientos inmutables
            </p>
          </div>
        </div>

        {/* Action shortcuts */}
        <div className="flex items-center gap-2">
          <Link href="/inventario/entrada">
            <Button size="sm" variant="outline" className="gap-1.5 text-xs text-accent border-accent/30 hover:bg-accent/10">
              <ArrowDownToLine className="h-3.5 w-3.5" />
              <span>+ Entrada</span>
            </Button>
          </Link>
          <Link href="/inventario/salida">
            <Button size="sm" variant="outline" className="gap-1.5 text-xs text-info border-info/30 hover:bg-info/10">
              <ArrowUpFromLine className="h-3.5 w-3.5" />
              <span>- Salida</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Cards Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl border border-line bg-card shadow-xs">
          <div className="text-[11px] font-medium text-subdued">Stock Actual en Planta</div>
          <div className="mt-1 flex items-baseline gap-1">
            <span
              className={`text-2xl font-bold tracking-tight tabular-nums ${
 isLowStock ? "text-danger" : "text-fg"
 }`}
            >
              {material.stock.toLocaleString("es-BO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="text-xs font-medium text-subdued">{material.unidad}</span>
          </div>
          {isLowStock && (
            <div className="mt-1 text-[11px] font-semibold text-danger flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              <span>Por debajo del mín ({material.stockMinimo.toFixed(2)})</span>
            </div>
          )}
        </div>

        <div className="p-3.5 rounded-xl border border-line bg-card shadow-xs">
          <div className="text-[11px] font-medium text-subdued">Stock Mínimo Alerta</div>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-2xl font-bold tracking-tight text-fg tabular-nums">
              {material.stockMinimo.toFixed(2)}
            </span>
            <span className="text-xs font-medium text-subdued">{material.unidad}</span>
          </div>
          <div className="mt-1 text-[11px] text-muted">Punto de reorden</div>
        </div>

        <div className="p-3.5 rounded-xl border border-line bg-card shadow-xs">
          <div className="text-[11px] font-medium text-subdued">Total Entradas Acum.</div>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-2xl font-bold tracking-tight text-accent tabular-nums">
              +{totalEntradas.toLocaleString("es-BO", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
            </span>
            <span className="text-xs font-medium text-subdued">{material.unidad}</span>
          </div>
          <div className="mt-1 text-[11px] text-muted">Ingresos históricos</div>
        </div>

        <div className="p-3.5 rounded-xl border border-line bg-card shadow-xs">
          <div className="text-[11px] font-medium text-subdued">Total Salidas / Consumo</div>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-2xl font-bold tracking-tight text-info tabular-nums">
              -{totalSalidas.toLocaleString("es-BO", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
            </span>
            <span className="text-xs font-medium text-subdued">{material.unidad}</span>
          </div>
          <div className="mt-1 text-[11px] text-muted">Consumido en producción</div>
        </div>
      </div>

      {/* Kardex Ledger Card */}
      <Card className="border-line shadow-sm bg-card overflow-hidden">
        <CardHeader className="pb-3 border-b border-line flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base font-semibold text-fg">
              Historial de Movimientos ({movimientos.length})
            </CardTitle>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {[
              { key: "TODOS", label: "Todos" },
              { key: "ENTRADA", label: "+ Entradas" },
              { key: "SALIDA", label: "- Salidas" },
              { key: "AJUSTE", label: "± Ajustes" },
            ].map((f) => (
              <button
                key={f.key}
                onClick={() => setFiltroTipo(f.key)}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition ${
 filtroTipo === f.key
 ? "bg-elevated text-fg shadow-xs"
 : "bg-highlight text-subdued hover:bg-highlight"
 }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="divide-y divide-line">
            {filtrados.map((m) => {
              const isEntrada = m.tipo === "ENTRADA"
              const isSalida = m.tipo === "SALIDA"
              const isAjuste = m.tipo === "AJUSTE"

              return (
                <div key={m.id} className="p-3.5 sm:p-4 hover:bg-elevated/60 transition space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    {/* Badge and Details */}
                    <div className="flex items-start gap-2.5">
                      <div
                        className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${
 isEntrada
 ? "bg-accent/10 text-accent border border-accent/30"
 : isSalida
 ? "bg-info/10 text-info border border-info/30"
 : "bg-warn/10 text-warn border border-warn/30"
 }`}
                      >
                        {isEntrada ? (
                          <ArrowDownToLine className="h-4 w-4" />
                        ) : isSalida ? (
                          <ArrowUpFromLine className="h-4 w-4" />
                        ) : (
                          <SlidersHorizontal className="h-4 w-4" />
                        )}
                      </div>

                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-xs font-bold px-2 py-0.5 rounded-md ${
 isEntrada
 ? "bg-accent/15 text-accent"
 : isSalida
 ? "bg-info/15 text-info"
 : "bg-warn/15 text-warn"
 }`}
                          >
                            {m.tipo}
                          </span>
                          <span className="text-xs text-muted">
                            Turno {m.turno === "MANANA" ? "Mañana" : m.turno === "TARDE" ? "Tarde" : "Noche"}
                          </span>
                        </div>

                        {m.motivo && (
                          <p className="text-xs font-medium text-fg">
                            {m.motivo}
                          </p>
                        )}

                        <div className="flex items-center gap-2 text-[11px] text-subdued flex-wrap pt-0.5">
                          {m.proveedor && (
                            <span>Prov: <strong>{m.proveedor}</strong></span>
                          )}
                          {m.lote && <span>Lote: <strong>{m.lote}</strong></span>}
                          {m.ordenNumero && (
                            <span className="text-info font-semibold">
                              OT #{m.ordenNumero}
                            </span>
                          )}
                          {m.costoUnitario && (
                            <span>Costo: {formatBs(m.costoUnitario)}/{material.unidad}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Numeric delta and resulting balance */}
                    <div className="text-right shrink-0">
                      <div
                        className={`text-base font-bold tabular-nums ${
 isEntrada
 ? "text-accent"
 : isSalida
 ? "text-danger"
 : m.cantidad > 0
 ? "text-accent"
 : "text-danger"
 }`}
                      >
                        {isEntrada ? "+" : isSalida ? "-" : m.cantidad > 0 ? "+" : ""}
                        {Math.abs(m.cantidad).toFixed(2)} {material.unidad}
                      </div>

                      <div className="text-[11px] text-muted tabular-nums">
                        Saldo: <strong className="text-subdued">{m.saldoAcumulado.toFixed(2)}</strong> {material.unidad}
                      </div>
                    </div>
                  </div>

                  {/* Footer metadata: Operator and timestamp */}
                  <div className="pt-1 text-[11px] text-muted flex items-center justify-between border-t border-line">
                    <span className="flex items-center gap-1 text-subdued">
                      <User className="h-3 w-3" />
                      {m.userName}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(m.createdAt).toLocaleString("es-BO")}
                    </span>
                  </div>
                </div>
              )
            })}

            {filtrados.length === 0 && (
              <div className="p-8 text-center text-sm text-subdued">
                No hay movimientos registrados para este filtro
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
