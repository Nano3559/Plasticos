"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Upload, FileSpreadsheet, Download, Receipt, Truck, Search, PackageX } from "lucide-react"
import * as XLSX from "xlsx"
import { ImportarKardex } from "./importar-kardex"
import { anularNotaCredito } from "@/actions/cobranzas"
import { isActionError } from "@/lib/action-result"
import { formatBs, formatKg } from "@/lib/formato"
import Link from "next/link"

interface KardexItem {
  id: string
  fecha: Date
  tipo: "ENTREGA" | "PAGO" | "DEVOLUCION" | "DESCUENTO"
  documento: string
  detalle: string
  medida?: string
  kgEntregados?: number
  precioUnitario?: number
  bultos?: number
  cargo: number
  abono: number
  saldo: number
  notaId?: string
  anulada?: boolean
  anuladaMotivo?: string
}

interface KardexViewProps {
  puedeAnular?: boolean
  clientes: { id: string; nombre: string; telefono?: string | null; diasCredito: number }[]
  selectedClienteId: string
  kardexData: {
    cliente: { id: string; nombre: string; direccion?: string | null; telefono?: string | null; diasCredito: number }
    movimientos: KardexItem[]
    totalCargos: number
    totalAbonos: number
    totalCreditos: number
    totalKg: number
    saldoActual: number
  } | null
}

const ETIQUETA_TIPO: Record<KardexItem["tipo"], string> = { ENTREGA: "ENTREGA", PAGO: "PAGO", DEVOLUCION: "DEVOLUCIÓN", DESCUENTO: "DESCUENTO" }
const CLASE_TIPO: Record<KardexItem["tipo"], string> = {
  ENTREGA: "bg-info/10 text-info border border-info/20",
  PAGO: "bg-accent/10 text-accent border border-accent/20",
  DEVOLUCION: "bg-warn/10 text-warn border border-warn/20",
  DESCUENTO: "bg-warn/10 text-warn border border-warn/20",
}

export function KardexView({ clientes, selectedClienteId, kardexData, puedeAnular = false }: KardexViewProps) {
  const router = useRouter()
  const [anulando, iniciarAnulacion] = useTransition()
  const [errorAnular, setErrorAnular] = useState("")

  function anular(m: KardexItem) {
    if (!m.notaId) return
    const motivo = window.prompt(`¿Por qué se anula «${m.detalle}» de ${formatBs(m.abono)}?\nLa nota queda en el historial pero deja de rebajar la deuda.`)
    if (motivo === null) return
    setErrorAnular("")
    iniciarAnulacion(async () => {
      const r = await anularNotaCredito(m.notaId!, motivo)
      if (isActionError(r)) setErrorAnular(r.error)
      else router.refresh()
    })
  }
  const [modalImportar, setModalImportar] = useState(false)
  const [busqueda, setBusqueda] = useState("")

  const clientesFiltrados = clientes.filter((c) =>
    c.nombre.toLowerCase().includes(busqueda.toLowerCase())
  )

  function handleSelectCliente(id: string) {
    router.push(`/cobranzas/kardex?clienteId=${id}`)
  }

  function handleExportarExcel() {
    if (!kardexData) return
    const exportData = kardexData.movimientos.map((m) => ({
      Fecha: new Date(m.fecha).toLocaleDateString("es-BO"),
      Tipo: ETIQUETA_TIPO[m.tipo] + (m.anulada ? " (ANULADA)" : ""),
      Documento: m.documento,
      Detalle: m.detalle,
      Medida: m.medida || "",
      "Kg Entregados": m.kgEntregados || "",
      "Precio Unit. (Bs/kg)": m.precioUnitario || "",
      Bultos: m.bultos || "",
      "Cargo (+) Bs": m.cargo || 0,
      "Abono (-) Bs": m.abono || 0,
      "Saldo Bs": m.saldo,
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
                <Receipt className="h-3.5 w-3.5 mr-1 text-accent" /> Registrar Pago
              </Button>
            </Link>
            <Link href="/cobranzas/entrega">
              <Button variant="outline" size="sm" className="h-9 rounded-lg text-xs font-medium">
                <Truck className="h-3.5 w-3.5 mr-1 text-info" /> Nueva Entrega
              </Button>
            </Link>
            <Link href={`/cobranzas/nota-credito${selectedClienteId ? `?clienteId=${selectedClienteId}` : ""}`}>
              <Button variant="outline" size="sm" className="h-9 rounded-lg text-xs font-medium">
                <PackageX className="h-3.5 w-3.5 mr-1 text-warn" /> Devolución / descuento
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
 kardexData.saldoActual > 0.05 ? "text-destructive" : "text-accent"
 }`}
                >
                  {formatBs(kardexData.saldoActual)}
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
                  {formatBs(kardexData.totalCargos)}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {formatKg(kardexData.totalKg, 1)} de bolsas entregados
                </p>
              </CardContent>
            </Card>

            {/* Total Pagado */}
            <Card className="rounded-xl border shadow-xs">
              <CardContent className="p-4 space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Total Pagos Recibidos</p>
                <p className="text-2xl font-bold tracking-tight text-accent">
                  {formatBs(kardexData.totalAbonos)}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {kardexData.totalCreditos > 0.005
                    ? `Además, ${formatBs(kardexData.totalCreditos)} en devoluciones y descuentos`
                    : "Abonos aplicados a cuenta"}
                </p>
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
            <CardHeader className="p-4 pb-3 bg-black/[0.03] border-b flex flex-row items-center justify-between">
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
              {errorAnular && (
                <p role="alert" className="border-b border-danger/30 bg-danger/10 px-4 py-2 text-xs font-medium text-danger">
                  {errorAnular}
                </p>
              )}
              {kardexData.movimientos.length === 0 ? (
                <div className="py-12 text-center text-xs text-muted-foreground">
                  <Receipt className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                  Este cliente no tiene movimientos ni entregas registradas.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-black/[0.03] text-muted-foreground font-semibold border-b">
                      <tr>
                        <th className="p-3">Fecha</th>
                        <th className="p-3">Tipo</th>
                        <th className="p-3">Documento</th>
                        <th className="p-3">Detalle / Producto</th>
                        <th className="p-3 text-right">Cant. (Kg)</th>
                        <th className="p-3 text-right">Precio</th>
                        <th className="p-3 text-right text-info">Cargo (+)</th>
                        <th className="p-3 text-right text-accent">Abono (-)</th>
                        <th className="p-3 text-right font-bold">Saldo</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {kardexData.movimientos.map((m, idx) => (
                        <tr
                          key={m.id || idx}
                          className={`hover:bg-black/[0.03] transition-colors ${
                            m.tipo === "PAGO" ? "bg-accent/[0.02]" : m.tipo === "DEVOLUCION" || m.tipo === "DESCUENTO" ? "bg-warn/[0.03]" : ""
                          } ${m.anulada ? "text-muted-foreground line-through decoration-1" : ""}`}
                          title={m.anulada ? `Anulada: ${m.anuladaMotivo ?? ""}` : undefined}
                        >
                          <td className="p-3 font-mono text-muted-foreground whitespace-nowrap">
                            {new Date(m.fecha).toLocaleDateString("es-BO")}
                          </td>
                          <td className="p-3 whitespace-nowrap">
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${CLASE_TIPO[m.tipo]}`}>
                              {ETIQUETA_TIPO[m.tipo]}
                              {m.anulada ? " · ANULADA" : ""}
                            </span>
                            {puedeAnular && m.notaId && !m.anulada && (
                              <button
                                type="button"
                                disabled={anulando}
                                onClick={() => anular(m)}
                                className="ml-2 text-[11px] font-medium text-subdued no-underline hover:text-danger hover:underline"
                              >
                                Anular
                              </button>
                            )}
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
                            {m.kgEntregados ? formatKg(m.kgEntregados, 1) : "-"}
                          </td>
                          <td className="p-3 text-right font-mono text-muted-foreground">
                            {m.precioUnitario ? formatBs(m.precioUnitario) : "-"}
                          </td>
                          <td className="p-3 text-right font-mono font-semibold text-info dark:text-info">
                            {m.cargo > 0 ? formatBs(m.cargo) : "-"}
                          </td>
                          <td className="p-3 text-right font-mono font-semibold text-accent dark:text-accent">
                            {m.abono > 0 ? formatBs(m.abono) : "-"}
                          </td>
                          <td
                            className={`p-3 text-right font-mono font-bold whitespace-nowrap ${
 m.saldo > 0.05 ? "text-destructive" : "text-foreground"
 }`}
                          >
                            {formatBs(m.saldo)}
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

      {modalImportar && <ImportarKardex onCerrar={() => setModalImportar(false)} />}
    </div>
  )
}
