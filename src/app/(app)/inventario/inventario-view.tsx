"use client"

import { useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  SlidersHorizontal,
  Plus,
  Search,
  AlertTriangle,
  Package,
  Layers,
  ChevronRight,
  TrendingDown,
  Sparkles,
  X,
  Boxes,
} from "lucide-react"
import { crearMaterial } from "@/actions/inventario"

interface MaterialConStock {
  id: string
  nombre: string
  categoria: string
  unidad: string
  stockMinimo: number
  costoPromedio: number
  stock: number
}

const CATEGORIAS_CONFIG: Record<string, { label: string; badgeClass: string }> = {
  TODOS: { label: "Todos", badgeClass: "" },
  VIRGEN: { label: "Virgen (PEAD / PEBD)", badgeClass: "bg-blue-50 text-blue-700 border-blue-200" },
  RECICLADO: { label: "Reciclado / Molido", badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  TINTA: { label: "Tintas Flexo", badgeClass: "bg-purple-50 text-purple-700 border-purple-200" },
  MASTER_BATCH: { label: "Masterbatch / Pigmentos", badgeClass: "bg-amber-50 text-amber-700 border-amber-200" },
  SOLVENTE: { label: "Solventes", badgeClass: "bg-cyan-50 text-cyan-700 border-cyan-200" },
  OTRO: { label: "Otros", badgeClass: "bg-slate-50 text-slate-700 border-slate-200" },
}

export function InventarioView({
  materiales,
  rol,
}: {
  materiales: MaterialConStock[]
  rol?: string
}) {
  const [busqueda, setBusqueda] = useState("")
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState("TODOS")
  const [modalNuevo, setModalNuevo] = useState(false)
  const [loadingNuevo, setLoadingNuevo] = useState(false)
  const [errorNuevo, setErrorNuevo] = useState("")

  const canManage = rol === "ALMACEN" || rol === "ADMIN" || rol === "GERENCIA"

  const filtrados = materiales.filter((m) => {
    const matchText =
      m.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      m.categoria.toLowerCase().includes(busqueda.toLowerCase())
    const matchCat =
      categoriaSeleccionada === "TODOS" || m.categoria === categoriaSeleccionada
    return matchText && matchCat
  })

  const alertas = materiales.filter(
    (m) => m.stock < m.stockMinimo && m.stockMinimo > 0
  )

  const totalKg = materiales.reduce((sum, m) => sum + (m.unidad === "kg" ? m.stock : 0), 0)

  async function handleCrearMaterial(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoadingNuevo(true)
    setErrorNuevo("")
    const formData = new FormData(e.currentTarget)
    try {
      await crearMaterial(formData)
      setModalNuevo(false)
      window.location.reload()
    } catch (err: any) {
      setErrorNuevo(err.message || "Error al crear material")
      setLoadingNuevo(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Header & Fast Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              Almacén & Inventario
            </h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-slate-100 text-slate-700 border border-slate-200">
              {materiales.length} Ítems
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500">
            Control físico de resinas vírgenes, molido reciclado, pigmentos y tintas flexográficas
          </p>
        </div>

        {canManage && (
          <div className="flex items-center gap-2">
            <Button
              onClick={() => setModalNuevo(true)}
              size="sm"
              className="bg-slate-900 hover:bg-slate-800 text-white font-medium gap-1.5 shadow-sm"
            >
              <Plus className="h-4 w-4" />
              <span>Nuevo Material</span>
            </Button>
          </div>
        )}
      </div>

      {/* Primary Movement Quick Tiles */}
      {canManage && (
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          <Link href="/inventario/entrada" className="group">
            <div className="h-20 sm:h-22 rounded-xl border border-emerald-200/80 bg-emerald-50/50 hover:bg-emerald-100/60 transition p-2.5 sm:p-3 flex flex-col justify-between shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] sm:text-xs font-bold text-emerald-800 uppercase tracking-wider">
                  Recepción
                </span>
                <div className="p-1 rounded-lg bg-emerald-500/10 text-emerald-700 group-hover:scale-110 transition-transform">
                  <ArrowDownToLine className="h-4 w-4" />
                </div>
              </div>
              <div>
                <div className="text-sm sm:text-base font-bold text-emerald-950">
                  + Entrada
                </div>
                <div className="text-[10px] sm:text-xs text-emerald-700 truncate">
                  Proveedores / Lotes
                </div>
              </div>
            </div>
          </Link>

          <Link href="/inventario/salida" className="group">
            <div className="h-20 sm:h-22 rounded-xl border border-sky-200/80 bg-sky-50/50 hover:bg-sky-100/60 transition p-2.5 sm:p-3 flex flex-col justify-between shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] sm:text-xs font-bold text-sky-800 uppercase tracking-wider">
                  Despacho
                </span>
                <div className="p-1 rounded-lg bg-sky-500/10 text-sky-700 group-hover:scale-110 transition-transform">
                  <ArrowUpFromLine className="h-4 w-4" />
                </div>
              </div>
              <div>
                <div className="text-sm sm:text-base font-bold text-sky-950">
                  - Salida
                </div>
                <div className="text-[10px] sm:text-xs text-sky-700 truncate">
                  A Planta / OTs
                </div>
              </div>
            </div>
          </Link>

          <Link href="/inventario/ajuste" className="group">
            <div className="h-20 sm:h-22 rounded-xl border border-amber-200/80 bg-amber-50/50 hover:bg-amber-100/60 transition p-2.5 sm:p-3 flex flex-col justify-between shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] sm:text-xs font-bold text-amber-800 uppercase tracking-wider">
                  Auditoría
                </span>
                <div className="p-1 rounded-lg bg-amber-500/10 text-amber-700 group-hover:scale-110 transition-transform">
                  <SlidersHorizontal className="h-4 w-4" />
                </div>
              </div>
              <div>
                <div className="text-sm sm:text-base font-bold text-amber-950">
                  ± Ajuste
                </div>
                <div className="text-[10px] sm:text-xs text-amber-700 truncate">
                  Inventario físico
                </div>
              </div>
            </div>
          </Link>
        </div>
      )}

      {/* Critical Stock Alert Banner */}
      {alertas.length > 0 && (
        <div className="rounded-xl border border-rose-200 bg-rose-50/70 p-3.5 sm:p-4 shadow-xs">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-rose-500/10 text-rose-600 shrink-0">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div className="space-y-2 flex-1">
              <div>
                <h3 className="text-sm font-semibold text-rose-900">
                  {alertas.length} Material{alertas.length > 1 ? "es" : ""} por debajo del Stock Mínimo
                </h3>
                <p className="text-xs text-rose-700">
                  Riesgo de parada en extrusión o impresión. Se requiere reposición urgente.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {alertas.map((m) => {
                  const pct = m.stockMinimo > 0 ? (m.stock / m.stockMinimo) * 100 : 0
                  return (
                    <Link
                      key={m.id}
                      href={`/inventario/${m.id}`}
                      className="p-2 rounded-lg bg-white/90 border border-rose-200/80 hover:border-rose-300 transition flex items-center justify-between"
                    >
                      <div className="min-w-0 pr-2">
                        <div className="text-xs font-semibold text-slate-800 truncate">
                          {m.nombre}
                        </div>
                        <div className="text-[11px] text-rose-600 font-medium">
                          {m.stock.toFixed(2)} / {m.stockMinimo.toFixed(2)} {m.unidad} ({pct.toFixed(0)}%)
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-rose-400 shrink-0" />
                    </Link>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="rounded-xl border border-slate-200/90 bg-white p-3.5 shadow-xs">
          <div className="text-xs font-medium text-slate-500">Total en Bodega</div>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 tabular-nums">
              {totalKg.toLocaleString("es-BO", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
            </span>
            <span className="text-xs font-medium text-slate-500">kg</span>
          </div>
          <div className="mt-1 text-[11px] text-slate-400">Resinas + Molido en stock</div>
        </div>

        <div className="rounded-xl border border-slate-200/90 bg-white p-3.5 shadow-xs">
          <div className="text-xs font-medium text-slate-500">Materias Primas</div>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 tabular-nums">
              {materiales.length}
            </span>
            <span className="text-xs font-medium text-slate-500">códigos</span>
          </div>
          <div className="mt-1 text-[11px] text-slate-400">Vírgenes, molidos y aditivos</div>
        </div>

        <div className="col-span-2 sm:col-span-1 rounded-xl border border-slate-200/90 bg-white p-3.5 shadow-xs">
          <div className="text-xs font-medium text-slate-500">Estado General</div>
          <div className="mt-1 flex items-center gap-1.5">
            <span className={`inline-block h-2.5 w-2.5 rounded-full ${alertas.length === 0 ? "bg-emerald-500" : "bg-rose-500 animate-pulse"}`} />
            <span className="text-sm font-bold text-slate-900">
              {alertas.length === 0 ? "Stock Saludable" : `${alertas.length} en Alerta`}
            </span>
          </div>
          <div className="mt-1 text-[11px] text-slate-400">
            {alertas.length === 0 ? "Sin quiebres de inventario" : "Reponer materiales críticos"}
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre (ej. Polietileno, Molido Cristal, Masterbatch, Tinta Blanca)..."
            className="pl-10 h-10 bg-white border-slate-200 text-sm shadow-xs"
          />
          {busqueda && (
            <button
              onClick={() => setBusqueda("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {Object.entries(CATEGORIAS_CONFIG).map(([key, cfg]) => {
            const active = categoriaSeleccionada === key
            const count =
              key === "TODOS"
                ? materiales.length
                : materiales.filter((m) => m.categoria === key).length

            return (
              <button
                key={key}
                onClick={() => setCategoriaSeleccionada(key)}
                className={`whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1.5 ${
                  active
                    ? "bg-slate-900 text-white shadow-xs"
                    : "bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-50"
                }`}
              >
                <span>{cfg.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-semibold ${
                    active ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {count}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Material Grid / List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtrados.map((m) => {
          const isCritical = m.stock < m.stockMinimo && m.stockMinimo > 0
          const ratio = m.stockMinimo > 0 ? (m.stock / m.stockMinimo) * 100 : 100
          const catInfo = CATEGORIAS_CONFIG[m.categoria] || {
            label: m.categoria,
            badgeClass: "bg-slate-100 text-slate-700",
          }

          return (
            <Link
              key={m.id}
              href={`/inventario/${m.id}`}
              className="group block rounded-xl border border-slate-200/90 bg-white hover:border-slate-300 hover:shadow-md transition p-4 space-y-3 relative overflow-hidden"
            >
              {/* Top Accent Strip */}
              <div
                className={`absolute top-0 left-0 right-0 h-1 ${
                  isCritical
                    ? "bg-rose-500"
                    : m.stock > 0
                    ? "bg-emerald-500"
                    : "bg-slate-300"
                }`}
              />

              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1 min-w-0">
                  <span
                    className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-md border ${catInfo.badgeClass}`}
                  >
                    {catInfo.label}
                  </span>
                  <h3 className="text-sm font-semibold text-slate-900 group-hover:text-sky-600 transition truncate">
                    {m.nombre}
                  </h3>
                </div>

                <div className="p-1 rounded-md text-slate-400 group-hover:text-slate-600 group-hover:translate-x-0.5 transition shrink-0">
                  <ChevronRight className="h-4 w-4" />
                </div>
              </div>

              {/* Stock Metric & Progress Bar */}
              <div className="space-y-1.5">
                <div className="flex items-baseline justify-between">
                  <div className="flex items-baseline gap-1">
                    <span
                      className={`text-2xl font-bold tracking-tight tabular-nums ${
                        isCritical ? "text-rose-600" : "text-slate-900"
                      }`}
                    >
                      {m.stock.toLocaleString("es-BO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    <span className="text-xs font-medium text-slate-500">{m.unidad}</span>
                  </div>

                  <div className="text-right text-[11px] text-slate-500">
                    Mín: <span className="font-semibold text-slate-700">{m.stockMinimo.toFixed(2)}</span>
                  </div>
                </div>

                {/* Progress bar according to status-visualization-patterns */}
                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      isCritical
                        ? "bg-rose-500"
                        : ratio >= 100
                        ? "bg-emerald-500"
                        : "bg-amber-400"
                    }`}
                    style={{ width: `${Math.min(ratio, 100)}%` }}
                  />
                </div>
              </div>

              {/* Card Footer: Cost & Ledger Hint */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                <span>
                  Costo:{" "}
                  <strong className="text-slate-700 font-mono">
                    Bs. {Number(m.costoPromedio).toFixed(2)}/{m.unidad}
                  </strong>
                </span>
                <span className="text-sky-600 group-hover:underline font-medium">
                  Ver Kardex →
                </span>
              </div>
            </Link>
          )
        })}

        {filtrados.length === 0 && (
          <div className="col-span-full rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center space-y-3">
            <div className="inline-flex p-3 rounded-full bg-slate-100 text-slate-400">
              <Package className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800">
                No se encontraron materiales
              </p>
              <p className="text-xs text-slate-500">
                {busqueda
                  ? "Prueba con otro término de búsqueda"
                  : "Aún no hay materiales en esta categoría"}
              </p>
            </div>
            {canManage && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setModalNuevo(true)}
                className="gap-1.5"
              >
                <Plus className="h-4 w-4" />
                Registrar nuevo material
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Modal: Crear Nuevo Material */}
      {modalNuevo && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-sky-50 text-sky-600">
                  <Boxes className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Nuevo Material / Resina
                  </h3>
                  <p className="text-xs text-slate-500">
                    Añade un insumo para el control de planta
                  </p>
                </div>
              </div>
              <button
                onClick={() => setModalNuevo(false)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCrearMaterial} className="space-y-3.5">
              <div className="space-y-1.5">
                <Label htmlFor="nombre" className="text-xs font-semibold text-slate-700">
                  Nombre del Material *
                </Label>
                <Input
                  id="nombre"
                  name="nombre"
                  placeholder="ej. PEAD Virgen 0.02, Molido Cristal, Tinta Blanca"
                  required
                  className="h-10 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="categoria" className="text-xs font-semibold text-slate-700">
                  Categoría *
                </Label>
                <select
                  id="categoria"
                  name="categoria"
                  className="w-full h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm focus:border-sky-500 focus:outline-none"
                  required
                >
                  <option value="VIRGEN">Virgen (PEAD / PEBD)</option>
                  <option value="RECICLADO">Reciclado / Molido</option>
                  <option value="TINTA">Tinta Flexográfica</option>
                  <option value="MASTER_BATCH">Masterbatch / Pigmento</option>
                  <option value="SOLVENTE">Solvente / Diluyente</option>
                  <option value="OTRO">Otro insumo</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="unidad" className="text-xs font-semibold text-slate-700">
                    Unidad de Medida
                  </Label>
                  <Input
                    id="unidad"
                    name="unidad"
                    defaultValue="kg"
                    required
                    className="h-10 text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="stockMinimo" className="text-xs font-semibold text-slate-700">
                    Stock Mínimo (Alerta)
                  </Label>
                  <Input
                    id="stockMinimo"
                    name="stockMinimo"
                    type="number"
                    step="0.01"
                    defaultValue="100"
                    required
                    className="h-10 text-sm"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="costoPromedio" className="text-xs font-semibold text-slate-700">
                  Costo Unitario Inicial (Bs. por unidad)
                </Label>
                <Input
                  id="costoPromedio"
                  name="costoPromedio"
                  type="number"
                  step="0.01"
                  defaultValue="0"
                  className="h-10 text-sm"
                />
              </div>

              {errorNuevo && (
                <div className="rounded-lg bg-rose-50 border border-rose-200 p-2.5 text-xs text-rose-700 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>{errorNuevo}</span>
                </div>
              )}

              <div className="pt-2 flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setModalNuevo(false)}
                  disabled={loadingNuevo}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={loadingNuevo}
                  className="bg-slate-900 hover:bg-slate-800 text-white"
                >
                  {loadingNuevo ? "Guardando..." : "Crear Material"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
