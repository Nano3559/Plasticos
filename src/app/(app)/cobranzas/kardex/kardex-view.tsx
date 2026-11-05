"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Cifras } from "@/components/ui/cifras"
import { Encabezado } from "@/components/ui/encabezado"
import { Input } from "@/components/ui/input"
import { MensajeError, Vacio } from "@/components/ui/mensaje"
import { Selector } from "@/components/ui/selector"
import { Upload, FileSpreadsheet, Download, Receipt, Search } from "lucide-react"
import * as XLSX from "xlsx"
import { ImportarKardex } from "./importar-kardex"
import { anularNotaCredito } from "@/actions/cobranzas"
import { isActionError } from "@/lib/action-result"
import { formatBs, formatKg, formatPrecio } from "@/lib/formato"
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

const ETIQUETA_TIPO: Record<KardexItem["tipo"], string> = { ENTREGA: "Entrega", PAGO: "Pago", DEVOLUCION: "Devolución", DESCUENTO: "Descuento" }
const CLASE_TIPO: Record<KardexItem["tipo"], string> = {
  ENTREGA: "text-info",
  PAGO: "text-accent",
  DEVOLUCION: "text-warn",
  DESCUENTO: "text-warn",
}
const sinTildes = (t: string) => t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
const fecha = (d: Date) => new Date(d).toLocaleDateString("es-BO", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" })

export function KardexView({ clientes, selectedClienteId, kardexData, puedeAnular = false }: KardexViewProps) {
  const router = useRouter()
  const [anulando, iniciarAnulacion] = useTransition()
  const [errorAnular, setErrorAnular] = useState("")
  const [modalImportar, setModalImportar] = useState(false)
  const [busqueda, setBusqueda] = useState("")

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

  // Buscador: reduce la lista de clientes; el elegido siempre queda visible
  const q = sinTildes(busqueda.trim())
  const filtrados = q ? clientes.filter((c) => sinTildes(c.nombre).includes(q) || c.id === selectedClienteId) : clientes
  const coincidencias = q ? filtrados.filter((c) => sinTildes(c.nombre).includes(q)) : filtrados
  const elegir = (id: string) => {
    if (id && id !== selectedClienteId) router.push(`/cobranzas/kardex?clienteId=${id}`)
  }

  function exportar() {
    if (!kardexData) return
    const filas = kardexData.movimientos.map((m) => ({
      Fecha: fecha(m.fecha),
      Tipo: ETIQUETA_TIPO[m.tipo] + (m.anulada ? " (anulada)" : ""),
      Documento: m.documento,
      Detalle: m.detalle,
      Medida: m.medida || "",
      "Kg entregados": m.kgEntregados || "",
      "Precio (Bs/kg)": m.precioUnitario || "",
      Bultos: m.bultos || "",
      "Cargo (Bs)": m.cargo || 0,
      "Abono (Bs)": m.abono || 0,
      "Saldo (Bs)": m.saldo,
    }))
    const ws = XLSX.utils.json_to_sheet(filas)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Kardex")
    XLSX.writeFile(wb, `kardex_${kardexData.cliente.nombre}.xlsx`)
  }

  const k = kardexData
  return (
    <div className="space-y-8">
      <Encabezado
        miga={{ href: "/cobranzas", texto: "Cobranzas" }}
        titulo="Kardex de clientes"
        descripcion="Cuenta corriente de cada cliente como en la planilla: entregas, pagos, devoluciones y el saldo después de cada una."
        acciones={
          <>
            {k && (
              <Button variant="outline" size="sm" onClick={exportar}>
                <Download /> Excel
              </Button>
            )}
            <Button size="sm" onClick={() => setModalImportar(true)}>
              <Upload /> Importar planillas
            </Button>
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
          <Input
            type="search"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && coincidencias.length > 0) {
                e.preventDefault()
                elegir(coincidencias[0].id)
              }
            }}
            placeholder="Buscar cliente"
            aria-label="Buscar cliente"
            aria-describedby="kardex-coincidencias"
            className="pl-9"
          />
        </div>
        <Selector value={selectedClienteId} onChange={(e) => elegir(e.target.value)} aria-label="Cliente">
          {clientes.length === 0 && <option value="">Todavía no hay clientes</option>}
          {filtrados.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nombre}
            </option>
          ))}
        </Selector>
        <p id="kardex-coincidencias" className="text-xs text-muted sm:col-span-2" aria-live="polite">
          {q
            ? coincidencias.length === 0
              ? "Ningún cliente coincide."
              : `${coincidencias.length} de ${clientes.length} clientes · Enter abre el primero`
            : `${clientes.length} clientes`}
        </p>
      </div>

      {!k ? (
        <Vacio icono={FileSpreadsheet}>Elige un cliente o importa sus planillas de Excel.</Vacio>
      ) : (
        <>
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h2 className="text-lg font-bold">{k.cliente.nombre}</h2>
            <div className="flex flex-wrap gap-x-4 text-[14px]">
              <Link href={`/cobranzas/cliente/${k.cliente.id}`} className="font-medium text-brand-ink hover:underline">
                Ficha del cliente
              </Link>
              <Link href={`/cobranzas/pago?clienteId=${k.cliente.id}`} className="font-medium text-brand-ink hover:underline">
                Registrar pago
              </Link>
              <Link href={`/cobranzas/nota-credito?clienteId=${k.cliente.id}`} className="font-medium text-brand-ink hover:underline">
                Devolución o descuento
              </Link>
            </div>
          </div>

          <Cifras
            items={[
              { etiqueta: "Saldo", valor: formatBs(k.saldoActual), nota: k.saldoActual > 0.05 ? "por cobrar" : "al día", tono: k.saldoActual > 0.05 ? undefined : "accent" },
              { etiqueta: "Entregado", valor: formatBs(k.totalCargos, 0), nota: formatKg(k.totalKg, 0) },
              { etiqueta: "Pagado", valor: formatBs(k.totalAbonos, 0), tono: "brand" },
              { etiqueta: "Devoluciones y descuentos", valor: formatBs(k.totalCreditos, 0), nota: k.cliente.diasCredito === 0 ? "contado" : `crédito de ${k.cliente.diasCredito} días` },
            ]}
          />

          <MensajeError>{errorAnular}</MensajeError>

          {k.movimientos.length === 0 ? (
            <Vacio icono={Receipt}>Este cliente todavía no tiene movimientos.</Vacio>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-line">
              <table className="w-full min-w-[820px] text-sm">
                <thead className="bg-elevated text-left text-xs text-subdued">
                  <tr>
                    <th className="px-3 py-2.5 font-medium">Fecha</th>
                    <th className="px-3 py-2.5 font-medium">Tipo</th>
                    <th className="px-3 py-2.5 font-medium">Documento</th>
                    <th className="px-3 py-2.5 font-medium">Detalle</th>
                    <th className="px-3 py-2.5 text-right font-medium">Kg</th>
                    <th className="px-3 py-2.5 text-right font-medium">Precio</th>
                    <th className="px-3 py-2.5 text-right font-medium">Cargo</th>
                    <th className="px-3 py-2.5 text-right font-medium">Abono</th>
                    <th className="px-3 py-2.5 text-right font-medium">Saldo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {k.movimientos.map((m, i) => (
                    <tr
                      key={m.id || i}
                      className={`hover:bg-elevated/60 ${m.anulada ? "text-muted line-through decoration-1" : ""}`}
                      title={m.anulada ? `Anulada: ${m.anuladaMotivo ?? ""}` : undefined}
                    >
                      <td className="whitespace-nowrap px-3 py-2.5 tabular-nums text-subdued">{fecha(m.fecha)}</td>
                      <td className="whitespace-nowrap px-3 py-2.5">
                        <span className={`font-semibold ${m.anulada ? "" : CLASE_TIPO[m.tipo]}`}>
                          {ETIQUETA_TIPO[m.tipo]}
                          {m.anulada && " · anulada"}
                        </span>
                        {puedeAnular && m.notaId && !m.anulada && (
                          <button
                            type="button"
                            disabled={anulando}
                            onClick={() => anular(m)}
                            className="ml-2 text-xs font-medium text-subdued hover:text-danger hover:underline"
                          >
                            Anular
                          </button>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5">{m.documento}</td>
                      <td className="max-w-[260px] px-3 py-2.5">
                        <span className="block truncate">{m.detalle}</span>
                        {m.medida && <span className="text-xs text-muted">{m.medida}</span>}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums">{m.kgEntregados ? formatKg(m.kgEntregados, 1) : "—"}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-subdued">{m.precioUnitario ? formatPrecio(m.precioUnitario) : "—"}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums">{m.cargo > 0 ? formatBs(m.cargo) : "—"}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-accent">{m.abono > 0 ? formatBs(m.abono) : "—"}</td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-right font-bold tabular-nums">{formatBs(m.saldo)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {modalImportar && <ImportarKardex onCerrar={() => setModalImportar(false)} />}
    </div>
  )
}
