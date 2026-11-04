"use client"

import { formatBs } from "@/lib/formato"
import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowDownToLine, ArrowUpFromLine, SlidersHorizontal, Plus, Search, AlertTriangle, Package, ChevronRight, X, Boxes } from "lucide-react"
import { crearMaterial } from "@/actions/inventario"
import { unwrap, mensajeError } from "@/lib/action-result"

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
  VIRGEN: { label: "Virgen (PEAD / PEBD)", badgeClass: "bg-info/10 text-info border-info/30" },
  RECICLADO: { label: "Reciclado / Molido", badgeClass: "bg-accent/10 text-accent border-accent/30" },
  TINTA: { label: "Tintas Flexo", badgeClass: "bg-info/10 text-info border-info/30" },
  MASTER_BATCH: { label: "Masterbatch / Pigmentos", badgeClass: "bg-warn/10 text-warn border-warn/30" },
  SOLVENTE: { label: "Solventes", badgeClass: "bg-info/10 text-info border-info/30" },
  OTRO: { label: "Otros", badgeClass: "bg-elevated text-subdued border-line" },
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
      unwrap(await crearMaterial(formData))
      setModalNuevo(false)
      window.location.reload()
    } catch (err) {
      setErrorNuevo(mensajeError(err, "Error al crear material"))
      setLoadingNuevo(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Header & Fast Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-fg">
              Almacén & Inventario
            </h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-highlight text-subdued border border-line">
              {materiales.length} Ítems
            </span>
          </div>
          <p className="text-xs sm:text-sm text-subdued">
            Control físico de resinas vírgenes, molido reciclado, pigmentos y tintas flexográficas
          </p>
        </div>

        {canManage && (
          <div className="flex items-center gap-2">
            <Button
              onClick={() => setModalNuevo(true)}
              size="sm"
              className="font-medium gap-1.5 shadow-sm"
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
            <div className="h-20 sm:h-22 rounded-xl border border-accent/30 bg-accent/10 hover:bg-accent/15 transition p-2.5 sm:p-3 flex flex-col justify-between shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] sm:text-xs font-bold text-accent ">
                  Recepción
                </span>
                <div className="p-1 rounded-lg bg-accent/10 text-accent group-hover:scale-110 transition-transform">
                  <ArrowDownToLine className="h-4 w-4" />
                </div>
              </div>
              <div>
                <div className="text-sm sm:text-base font-bold text-accent">
                  + Entrada
                </div>
                <div className="text-[10px] sm:text-xs text-accent truncate">
                  Proveedores / Lotes
                </div>
              </div>
            </div>
          </Link>

          <Link href="/inventario/salida" className="group">
            <div className="h-20 sm:h-22 rounded-xl border border-info/30 bg-info/10 hover:bg-info/15 transition p-2.5 sm:p-3 flex flex-col justify-between shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] sm:text-xs font-bold text-info ">
                  Despacho
                </span>
                <div className="p-1 rounded-lg bg-info/10 text-info group-hover:scale-110 transition-transform">
                  <ArrowUpFromLine className="h-4 w-4" />
                </div>
              </div>
              <div>
                <div className="text-sm sm:text-base font-bold text-info">
                  - Salida
                </div>
                <div className="text-[10px] sm:text-xs text-info truncate">
                  A Planta / OTs
                </div>
              </div>
            </div>
          </Link>

          <Link href="/inventario/ajuste" className="group">
            <div className="h-20 sm:h-22 rounded-xl border border-warn/30 bg-warn/10 hover:bg-warn/15 transition p-2.5 sm:p-3 flex flex-col justify-between shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] sm:text-xs font-bold text-warn ">
                  Auditoría
                </span>
                <div className="p-1 rounded-lg bg-warn/10 text-warn group-hover:scale-110 transition-transform">
                  <SlidersHorizontal className="h-4 w-4" />
                </div>
              </div>
              <div>
                <div className="text-sm sm:text-base font-bold text-warn">
                  ± Ajuste
                </div>
                <div className="text-[10px] sm:text-xs text-warn truncate">
                  Inventario físico
                </div>
              </div>
            </div>
          </Link>
        </div>
      )}

      {/* Critical Stock Alert Banner */}
      {alertas.length > 0 && (
        <div className="rounded-xl border border-danger/30 bg-danger/10 p-3.5 sm:p-4 shadow-xs">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-danger/10 text-danger shrink-0">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div className="space-y-2 flex-1">
              <div>
                <h3 className="text-sm font-semibold text-danger">
                  {alertas.length} Material{alertas.length > 1 ? "es" : ""} por debajo del Stock Mínimo
                </h3>
                <p className="text-xs text-danger">
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
                      className="p-2 rounded-lg bg-card/90 border border-danger/30 hover:border-danger/30 transition flex items-center justify-between"
                    >
                      <div className="min-w-0 pr-2">
                        <div className="text-xs font-semibold text-fg truncate">
                          {m.nombre}
                        </div>
                        <div className="text-[11px] text-danger font-medium">
                          {m.stock.toFixed(2)} / {m.stockMinimo.toFixed(2)} {m.unidad} ({pct.toFixed(0)}%)
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-danger shrink-0" />
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
        <div className="rounded-xl border border-line bg-card p-3.5 shadow-xs">
          <div className="text-xs font-medium text-subdued">Total en Bodega</div>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-xl sm:text-2xl font-bold tracking-tight text-fg tabular-nums">
              {totalKg.toLocaleString("es-BO", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
            </span>
            <span className="text-xs font-medium text-subdued">kg</span>
          </div>
          <div className="mt-1 text-[11px] text-muted">Resinas + Molido en stock</div>
        </div>

        <div className="rounded-xl border border-line bg-card p-3.5 shadow-xs">
          <div className="text-xs font-medium text-subdued">Materias Primas</div>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-xl sm:text-2xl font-bold tracking-tight text-fg tabular-nums">
              {materiales.length}
            </span>
            <span className="text-xs font-medium text-subdued">códigos</span>
          </div>
          <div className="mt-1 text-[11px] text-muted">Vírgenes, molidos y aditivos</div>
        </div>

        <div className="col-span-2 sm:col-span-1 rounded-xl border border-line bg-card p-3.5 shadow-xs">
          <div className="text-xs font-medium text-subdued">Estado General</div>
          <div className="mt-1 flex items-center gap-1.5">
            <span className={`inline-block h-2.5 w-2.5 rounded-full ${alertas.length === 0 ? "bg-accent" : "bg-danger animate-pulse"}`} />
            <span className="text-sm font-bold text-fg">
              {alertas.length === 0 ? "Stock Saludable" : `${alertas.length} en Alerta`}
            </span>
          </div>
          <div className="mt-1 text-[11px] text-muted">
            {alertas.length === 0 ? "Sin quiebres de inventario" : "Reponer materiales críticos"}
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
          <Input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre (ej. Polietileno, Molido Cristal, Masterbatch, Tinta Blanca)..."
            className="pl-10 h-10 bg-card border-line text-sm shadow-xs"
          />
          {busqueda && (
            <button
              onClick={() => setBusqueda("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-subdued"
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
 ? "bg-elevated text-fg shadow-xs"
 : "bg-card text-subdued border border-line hover:bg-elevated"
 }`}
              >
                <span>{cfg.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-semibold ${
 active ? "bg-black/[0.07] text-fg" : "bg-highlight text-subdued"
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
            badgeClass: "bg-highlight text-subdued",
          }

          return (
            <Link
              key={m.id}
              href={`/inventario/${m.id}`}
              className="group block rounded-xl border border-line bg-card hover:border-line hover:shadow-md transition p-4 space-y-3 relative overflow-hidden"
            >
              {/* Top Accent Strip */}
              <div
                className={`absolute top-0 left-0 right-0 h-1 ${
 isCritical
 ? "bg-danger"
 : m.stock > 0
 ? "bg-accent"
 : "bg-highlight"
 }`}
              />

              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1 min-w-0">
                  <span
                    className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-md border ${catInfo.badgeClass}`}
                  >
                    {catInfo.label}
                  </span>
                  <h3 className="text-sm font-semibold text-fg group-hover:text-info transition truncate">
                    {m.nombre}
                  </h3>
                </div>

                <div className="p-1 rounded-md text-muted group-hover:text-subdued group-hover:translate-x-0.5 transition shrink-0">
                  <ChevronRight className="h-4 w-4" />
                </div>
              </div>

              {/* Stock Metric & Progress Bar */}
              <div className="space-y-1.5">
                <div className="flex items-baseline justify-between">
                  <div className="flex items-baseline gap-1">
                    <span
                      className={`text-2xl font-bold tracking-tight tabular-nums ${
 isCritical ? "text-danger" : "text-fg"
 }`}
                    >
                      {m.stock.toLocaleString("es-BO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    <span className="text-xs font-medium text-subdued">{m.unidad}</span>
                  </div>

                  <div className="text-right text-[11px] text-subdued">
                    Mín: <span className="font-semibold text-subdued">{m.stockMinimo.toFixed(2)}</span>
                  </div>
                </div>

                {/* Progress bar according to status-visualization-patterns */}
                <div className="h-1.5 w-full bg-highlight rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
 isCritical
 ? "bg-danger"
 : ratio >= 100
 ? "bg-accent"
 : "bg-warn"
 }`}
                    style={{ width: `${Math.min(ratio, 100)}%` }}
                  />
                </div>
              </div>

              {/* Card Footer: Cost & Ledger Hint */}
              <div className="pt-2 border-t border-line flex items-center justify-between text-[11px] text-subdued">
                <span>
                  Costo:{" "}
                  <strong className="text-subdued font-mono">
                    {formatBs(Number(m.costoPromedio))}/{m.unidad}
                  </strong>
                </span>
                <span className="text-info group-hover:underline font-medium">
                  Ver Kardex →
                </span>
              </div>
            </Link>
          )
        })}

        {filtrados.length === 0 && (
          <div className="col-span-full rounded-xl border border-dashed border-line bg-card p-8 text-center space-y-3">
            <div className="inline-flex p-3 rounded-full bg-highlight text-muted">
              <Package className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-semibold text-fg">
                No se encontraron materiales
              </p>
              <p className="text-xs text-subdued">
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
        <div className="fixed inset-0 z-50 bg-canvas backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl border border-line">
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-info/10 text-info">
                  <Boxes className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-fg">
                    Nuevo Material / Resina
                  </h3>
                  <p className="text-xs text-subdued">
                    Añade un insumo para el control de planta
                  </p>
                </div>
              </div>
              <button
                onClick={() => setModalNuevo(false)}
                className="p-1 rounded-md text-muted hover:text-subdued hover:bg-highlight"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCrearMaterial} className="space-y-3.5">
              <div className="space-y-1.5">
                <Label htmlFor="nombre" className="text-xs font-semibold text-subdued">
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
                <Label htmlFor="categoria" className="text-xs font-semibold text-subdued">
                  Categoría *
                </Label>
                <select
                  id="categoria"
                  name="categoria"
                  className="w-full h-10 rounded-lg border border-line bg-card px-3 text-sm focus:border-info/60 focus:outline-none"
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
                  <Label htmlFor="unidad" className="text-xs font-semibold text-subdued">
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
                  <Label htmlFor="stockMinimo" className="text-xs font-semibold text-subdued">
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
                <Label htmlFor="costoPromedio" className="text-xs font-semibold text-subdued">
                  Costo Unitario Inicial (Bs por unidad)
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
                <div className="rounded-lg bg-danger/10 border border-danger/30 p-2.5 text-xs text-danger flex items-center gap-2">
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
                  className=""
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
