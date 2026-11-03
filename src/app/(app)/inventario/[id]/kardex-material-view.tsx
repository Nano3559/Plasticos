"use client"

import { useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  ArrowLeft,
  ArrowDownToLine,
  ArrowUpFromLine,
  SlidersHorizontal,
  Package,
  Calendar,
  User,
  Tag,
  AlertTriangle,
  FileText,
  Clock,
  Filter,
} from "lucide-react"

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
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                {material.categoria}
              </span>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                {material.nombre}
              </h1>
            </div>
            <p className="text-xs text-slate-500">
              Kardex físico valorado • Libro de movimientos inmutables
            </p>
          </div>
        </div>

        {/* Action shortcuts */}
        <div className="flex items-center gap-2">
          <Link href="/inventario/entrada">
            <Button size="sm" variant="outline" className="gap-1.5 text-xs text-emerald-700 border-emerald-200 hover:bg-emerald-50">
              <ArrowDownToLine className="h-3.5 w-3.5" />
              <span>+ Entrada</span>
            </Button>
          </Link>
          <Link href="/inventario/salida">
            <Button size="sm" variant="outline" className="gap-1.5 text-xs text-sky-700 border-sky-200 hover:bg-sky-50">
              <ArrowUpFromLine className="h-3.5 w-3.5" />
              <span>- Salida</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Cards Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl border border-slate-200/90 bg-white shadow-xs">
          <div className="text-[11px] font-medium text-slate-500">Stock Actual en Planta</div>
          <div className="mt-1 flex items-baseline gap-1">
            <span
              className={`text-2xl font-bold tracking-tight tabular-nums ${
                isLowStock ? "text-rose-600" : "text-slate-900"
              }`}
            >
              {material.stock.toLocaleString("es-BO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="text-xs font-medium text-slate-500">{material.unidad}</span>
          </div>
          {isLowStock && (
            <div className="mt-1 text-[11px] font-semibold text-rose-600 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              <span>Por debajo del mín ({material.stockMinimo.toFixed(2)})</span>
            </div>
          )}
        </div>

        <div className="p-3.5 rounded-xl border border-slate-200/90 bg-white shadow-xs">
          <div className="text-[11px] font-medium text-slate-500">Stock Mínimo Alerta</div>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-2xl font-bold tracking-tight text-slate-900 tabular-nums">
              {material.stockMinimo.toFixed(2)}
            </span>
            <span className="text-xs font-medium text-slate-500">{material.unidad}</span>
          </div>
          <div className="mt-1 text-[11px] text-slate-400">Punto de reorden</div>
        </div>

        <div className="p-3.5 rounded-xl border border-slate-200/90 bg-white shadow-xs">
          <div className="text-[11px] font-medium text-slate-500">Total Entradas Acum.</div>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-2xl font-bold tracking-tight text-emerald-700 tabular-nums">
              +{totalEntradas.toLocaleString("es-BO", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
            </span>
            <span className="text-xs font-medium text-slate-500">{material.unidad}</span>
          </div>
          <div className="mt-1 text-[11px] text-slate-400">Ingresos históricos</div>
        </div>

        <div className="p-3.5 rounded-xl border border-slate-200/90 bg-white shadow-xs">
          <div className="text-[11px] font-medium text-slate-500">Total Salidas / Consumo</div>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-2xl font-bold tracking-tight text-sky-700 tabular-nums">
              -{totalSalidas.toLocaleString("es-BO", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
            </span>
            <span className="text-xs font-medium text-slate-500">{material.unidad}</span>
          </div>
          <div className="mt-1 text-[11px] text-slate-400">Consumido en producción</div>
        </div>
      </div>

      {/* Kardex Ledger Card */}
      <Card className="border-slate-200/90 shadow-sm bg-white overflow-hidden">
        <CardHeader className="pb-3 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base font-semibold text-slate-900">
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
                    ? "bg-slate-900 text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="divide-y divide-slate-100">
            {filtrados.map((m) => {
              const isEntrada = m.tipo === "ENTRADA"
              const isSalida = m.tipo === "SALIDA"
              const isAjuste = m.tipo === "AJUSTE"

              return (
                <div key={m.id} className="p-3.5 sm:p-4 hover:bg-slate-50/60 transition space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    {/* Badge and Details */}
                    <div className="flex items-start gap-2.5">
                      <div
                        className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${
                          isEntrada
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : isSalida
                            ? "bg-sky-50 text-sky-700 border border-sky-200"
                            : "bg-amber-50 text-amber-700 border border-amber-200"
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
                                ? "bg-emerald-100/70 text-emerald-800"
                                : isSalida
                                ? "bg-sky-100/70 text-sky-800"
                                : "bg-amber-100/70 text-amber-800"
                            }`}
                          >
                            {m.tipo}
                          </span>
                          <span className="text-xs text-slate-400">
                            Turno {m.turno === "MANANA" ? "Mañana" : m.turno === "TARDE" ? "Tarde" : "Noche"}
                          </span>
                        </div>

                        {m.motivo && (
                          <p className="text-xs font-medium text-slate-800">
                            {m.motivo}
                          </p>
                        )}

                        <div className="flex items-center gap-2 text-[11px] text-slate-500 flex-wrap pt-0.5">
                          {m.proveedor && (
                            <span>Prov: <strong>{m.proveedor}</strong></span>
                          )}
                          {m.lote && <span>Lote: <strong>{m.lote}</strong></span>}
                          {m.ordenNumero && (
                            <span className="text-sky-700 font-semibold">
                              OT #{m.ordenNumero}
                            </span>
                          )}
                          {m.costoUnitario && (
                            <span>Costo: Bs. {m.costoUnitario.toFixed(2)}/{material.unidad}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Numeric delta and resulting balance */}
                    <div className="text-right shrink-0">
                      <div
                        className={`text-base font-bold tabular-nums ${
                          isEntrada
                            ? "text-emerald-700"
                            : isSalida
                            ? "text-rose-600"
                            : m.cantidad > 0
                            ? "text-emerald-700"
                            : "text-rose-600"
                        }`}
                      >
                        {isEntrada ? "+" : isSalida ? "-" : m.cantidad > 0 ? "+" : ""}
                        {Math.abs(m.cantidad).toFixed(2)} {material.unidad}
                      </div>

                      <div className="text-[11px] text-slate-400 tabular-nums">
                        Saldo: <strong className="text-slate-700">{m.saldoAcumulado.toFixed(2)}</strong> {material.unidad}
                      </div>
                    </div>
                  </div>

                  {/* Footer metadata: Operator and timestamp */}
                  <div className="pt-1 text-[11px] text-slate-400 flex items-center justify-between border-t border-slate-50">
                    <span className="flex items-center gap-1 text-slate-500">
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
              <div className="p-8 text-center text-sm text-slate-500">
                No hay movimientos registrados para este filtro
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
