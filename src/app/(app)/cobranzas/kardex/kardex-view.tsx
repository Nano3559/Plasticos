"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Upload,
  FileSpreadsheet,
  Download,
  Receipt,
  Truck,
  DollarSign,
  Clock,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  Search,
  Scale,
  Calendar,
  X,
  PlusCircle,
} from "lucide-react"
import * as XLSX from "xlsx"
import { importarKardexArchivos } from "@/actions/kardex"
import Link from "next/link"

interface KardexItem {
  id: string
  fecha: Date
  tipo: "ENTREGA" | "PAGO"
  documento: string
  detalle: string
  medida?: string
  kgEntregados?: number
  precioUnitario?: number
  bultos?: number
  cargo: number
  abono: number
  saldo: number
}

interface KardexViewProps {
  clientes: { id: string; nombre: string; telefono?: string | null; diasCredito: number }[]
  selectedClienteId: string
  kardexData: {
    cliente: { id: string; nombre: string; direccion?: string | null; telefono?: string | null; diasCredito: number }
    movimientos: KardexItem[]
    totalCargos: number
    totalAbonos: number
    totalKg: number
    saldoActual: number
  } | null
}

export function KardexView({ clientes, selectedClienteId, kardexData }: KardexViewProps) {
  const router = useRouter()
  const [modalImportar, setModalImportar] = useState(false)
  const [archivos, setArchivos] = useState<File[]>([])
  const [importando, setImportando] = useState(false)
  const [resultadosImport, setResultadosImport] = useState<any[] | null>(null)
  const [busqueda, setBusqueda] = useState("")

  const clientesFiltrados = clientes.filter((c) =>
    c.nombre.toLowerCase().includes(busqueda.toLowerCase())
  )

  function handleSelectCliente(id: string) {
    router.push(`/cobranzas/kardex?clienteId=${id}`)
  }

  async function handleEjecutarImportacion() {
    if (archivos.length === 0) return
    setImportando(true)
    setResultadosImport(null)

    const formData = new FormData()
    for (const f of archivos) {
      formData.append("archivos", f)
    }

    try {
      const res = await importarKardexArchivos(formData)
      setResultadosImport(res)
      setArchivos([])
      router.refresh()
    } catch (e: any) {
      alert("Error: " + e.message)
    } finally {
      setImportando(false)
    }
  }

  function handleExportarExcel() {
    if (!kardexData) return
    const exportData = kardexData.movimientos.map((m) => ({
      Fecha: new Date(m.fecha).toLocaleDateString("es-BO"),
      Tipo: m.tipo,
      Documento: m.documento,
      Detalle: m.detalle,
      Medida: m.medida || "",
      "Kg Entregados": m.kgEntregados || "",
      "Precio Unit.": m.precioUnitario || "",
      Bultos: m.bultos || "",
      "Cargo (+)": m.cargo || 0,
      "Abono (-)": m.abono || 0,
      Saldo: m.saldo,
    }))

    const ws = XLSX.utils.json_to_sheet(exportData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Kardex")
    XLSX.writeFile(wb, `KARDEX_${kardexData.cliente.nombre}.xlsx`)
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* 1. Header con botones principales */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">Kardex / Historial de Clientes</h1>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary">
              Cuenta Corriente
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Seguimiento de compras, entregas, notas de remisión, pagos y saldos por cliente
          </p>
        </div>

        <div className="flex items-center gap-2">
          {kardexData && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportarExcel}
              className="gap-1.5 h-9 rounded-xl text-xs font-semibold shadow-xs"
            >
              <Download className="h-3.5 w-3.5" /> Exportar Kardex
            </Button>
          )}

          <Button
            size="sm"
            onClick={() => setModalImportar(true)}
            className="gap-1.5 h-9 rounded-xl font-semibold shadow-xs"
          >
            <Upload className="h-4 w-4" /> Importar Excel
          </Button>
        </div>
      </div>

      {/* 2. Selector interactivo de cliente */}
      <Card className="rounded-xl border shadow-xs">
        <CardContent className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex-1 flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground shrink-0" />
            <select
              value={selectedClienteId}
              onChange={(e) => handleSelectCliente(e.target.value)}
              className="w-full h-10 rounded-lg border bg-background px-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
            >
              {clientes.length === 0 && <option value="">No hay clientes registrados aún</option>}
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre} {c.diasCredito ? `(${c.diasCredito}d crédito)` : ""}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Link href="/cobranzas/pago">
              <Button variant="outline" size="sm" className="h-9 rounded-lg text-xs font-medium">
                <Receipt className="h-3.5 w-3.5 mr-1 text-emerald-600" /> Registrar Pago
              </Button>
            </Link>
            <Link href="/cobranzas/entrega">
              <Button variant="outline" size="sm" className="h-9 rounded-lg text-xs font-medium">
                <Truck className="h-3.5 w-3.5 mr-1 text-blue-600" /> Nueva Entrega
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* 3. Resumen y KPIs del Cliente (info-card-patterns) */}
      {kardexData ? (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Saldo Actual */}
            <Card className="rounded-xl border shadow-xs">
              <CardContent className="p-4 space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Saldo Pendiente Actual</p>
                <p
                  className={`text-2xl font-bold tracking-tight ${
                    kardexData.saldoActual > 0.05 ? "text-destructive" : "text-emerald-600"
                  }`}
                >
                  ${kardexData.saldoActual.toLocaleString("es-BO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <p className="text-[11px] font-medium">
                  {kardexData.saldoActual > 0.05 ? "Pendiente de cobro" : "Cuenta al día sin deuda"}
                </p>
              </CardContent>
            </Card>

            {/* Total Facturado */}
            <Card className="rounded-xl border shadow-xs">
              <CardContent className="p-4 space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Total Entregado / Crédito</p>
                <p className="text-2xl font-bold tracking-tight">
                  ${kardexData.totalCargos.toLocaleString("es-BO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {kardexData.totalKg.toFixed(1)} kg de bolsas entregados
                </p>
              </CardContent>
            </Card>

            {/* Total Pagado */}
            <Card className="rounded-xl border shadow-xs">
              <CardContent className="p-4 space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Total Pagos Recibidos</p>
                <p className="text-2xl font-bold tracking-tight text-emerald-600">
                  ${kardexData.totalAbonos.toLocaleString("es-BO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <p className="text-[11px] text-muted-foreground">Abonos aplicados a cuenta</p>
              </CardContent>
            </Card>

            {/* Términos comerciales */}
            <Card className="rounded-xl border shadow-xs">
              <CardContent className="p-4 space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Condición Comercial</p>
                <p className="text-xl font-bold tracking-tight">
                  {kardexData.cliente.diasCredito === 0 ? "Contado" : `${kardexData.cliente.diasCredito} días crédito`}
                </p>
                <p className="text-[11px] text-muted-foreground truncate">
                  {kardexData.cliente.telefono || kardexData.cliente.direccion || "Sin teléfono registrado"}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* 4. Tabla de Cuenta Corriente / Kardex Cronológico */}
          <Card className="rounded-xl border shadow-xs overflow-hidden">
            <CardHeader className="p-4 pb-3 bg-muted/30 border-b flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold">
                  Historial de Movimientos — {kardexData.cliente.nombre}
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  {kardexData.movimientos.length} transacciones registradas
                </p>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {kardexData.movimientos.length === 0 ? (
                <div className="py-12 text-center text-xs text-muted-foreground">
                  <Receipt className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                  Este cliente no tiene movimientos ni entregas registradas.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-muted/50 text-muted-foreground font-semibold border-b">
                      <tr>
                        <th className="p-3">Fecha</th>
                        <th className="p-3">Tipo</th>
                        <th className="p-3">Documento</th>
                        <th className="p-3">Detalle / Producto</th>
                        <th className="p-3 text-right">Cant. (Kg)</th>
                        <th className="p-3 text-right">Precio</th>
                        <th className="p-3 text-right text-blue-600">Cargo (+)</th>
                        <th className="p-3 text-right text-emerald-600">Abono (-)</th>
                        <th className="p-3 text-right font-bold">Saldo</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {kardexData.movimientos.map((m, idx) => (
                        <tr
                          key={m.id || idx}
                          className={`hover:bg-muted/40 transition-colors ${
                            m.tipo === "PAGO" ? "bg-emerald-500/[0.02]" : ""
                          }`}
                        >
                          <td className="p-3 font-mono text-muted-foreground whitespace-nowrap">
                            {new Date(m.fecha).toLocaleDateString("es-BO")}
                          </td>
                          <td className="p-3 whitespace-nowrap">
                            <span
                              className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                m.tipo === "PAGO"
                                  ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20"
                                  : "bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20"
                              }`}
                            >
                              {m.tipo}
                            </span>
                          </td>
                          <td className="p-3 font-medium whitespace-nowrap">
                            {m.documento}
                          </td>
                          <td className="p-3 max-w-[280px]">
                            <p className="font-medium text-foreground truncate">{m.detalle}</p>
                            {m.medida && (
                              <span className="text-[11px] text-muted-foreground">Medida: {m.medida}</span>
                            )}
                          </td>
                          <td className="p-3 text-right font-mono">
                            {m.kgEntregados ? `${m.kgEntregados.toFixed(1)} kg` : "-"}
                          </td>
                          <td className="p-3 text-right font-mono text-muted-foreground">
                            {m.precioUnitario ? `$${m.precioUnitario.toFixed(2)}` : "-"}
                          </td>
                          <td className="p-3 text-right font-mono font-semibold text-blue-700 dark:text-blue-400">
                            {m.cargo > 0 ? `$${m.cargo.toFixed(2)}` : "-"}
                          </td>
                          <td className="p-3 text-right font-mono font-semibold text-emerald-700 dark:text-emerald-400">
                            {m.abono > 0 ? `$${m.abono.toFixed(2)}` : "-"}
                          </td>
                          <td
                            className={`p-3 text-right font-mono font-bold whitespace-nowrap ${
                              m.saldo > 0.05 ? "text-destructive" : "text-foreground"
                            }`}
                          >
                            ${m.saldo.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      ) : (
        <Card className="rounded-xl border p-12 text-center text-xs text-muted-foreground">
          <FileSpreadsheet className="h-10 w-10 text-muted-foreground/40 mx-auto mb-2" />
          Selecciona un cliente o importa sus archivos Excel para visualizar su Kardex.
        </Card>
      )}

      {/* 5. Modal de Importación Masiva o Individual */}
      {modalImportar && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="w-full max-w-lg rounded-2xl border shadow-xl bg-card">
            <CardHeader className="p-4 pb-2 border-b flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Upload className="h-4 w-4 text-primary" />
                  <span>Importar Archivos de Kardex Excel</span>
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  Sube los archivos .xlsx de tus clientes (ej. Gabriela Quispe, Aldo Guardia, etc.)
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setModalImportar(false)}
                className="h-8 w-8 rounded-lg"
              >
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              {/* Dropzone */}
              <div
                className="border-2 border-dashed border-border rounded-xl p-6 text-center hover:bg-muted/30 transition-colors cursor-pointer"
                onClick={() => document.getElementById("file-kardex")?.click()}
              >
                <FileSpreadsheet className="h-10 w-10 text-primary/60 mx-auto mb-2" />
                <p className="text-sm font-semibold text-foreground">
                  Arrastra aquí o haz clic para seleccionar archivos
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Puedes seleccionar múltiples archivos .xlsx al mismo tiempo
                </p>
                <input
                  id="file-kardex"
                  type="file"
                  multiple
                  accept=".xlsx"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files) {
                      setArchivos(Array.from(e.target.files))
                    }
                  }}
                />
              </div>

              {/* Lista de archivos seleccionados */}
              {archivos.length > 0 && (
                <div className="space-y-1.5 max-h-40 overflow-y-auto border rounded-lg p-2.5 bg-muted/20">
                  <p className="text-xs font-semibold text-muted-foreground">
                    {archivos.length} archivo(s) listo(s) para importar:
                  </p>
                  {archivos.map((f, i) => (
                    <div key={i} className="flex justify-between items-center text-xs py-1 border-b border-border/40 last:border-0">
                      <span className="truncate max-w-[280px] font-medium">{f.name}</span>
                      <span className="text-[10px] text-muted-foreground">{(f.size / 1024).toFixed(1)} KB</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Resultados de la importación */}
              {resultadosImport && (
                <div className="space-y-2 max-h-48 overflow-y-auto border rounded-lg p-3 bg-muted/40">
                  <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
                    Resultados de la importación ({resultadosImport.filter((r) => r.exito).length} exitosos):
                  </p>
                  {resultadosImport.map((r, i) => (
                    <div key={i} className="text-xs flex justify-between py-1 border-b border-border/40 last:border-0">
                      <span className="font-semibold">{r.nombre}</span>
                      {r.exito ? (
                        <span className="text-emerald-600 font-mono text-[11px]">
                          +{r.entregas} entregas, +{r.pagos} pagos (Saldo: ${r.saldoFinal})
                        </span>
                      ) : (
                        <span className="text-destructive font-mono text-[11px]">{r.error}</span>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Acciones */}
              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button
                  variant="outline"
                  onClick={() => setModalImportar(false)}
                  disabled={importando}
                  className="rounded-xl text-xs"
                >
                  Cerrar
                </Button>
                <Button
                  onClick={handleEjecutarImportacion}
                  disabled={importando || archivos.length === 0}
                  className="rounded-xl text-xs font-bold shadow-xs"
                >
                  {importando ? "Importando clientes..." : `Importar ${archivos.length} archivo(s)`}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
