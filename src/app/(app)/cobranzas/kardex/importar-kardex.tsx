"use client"

import { useCallback, useEffect, useId, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { AlertCircle, CheckCircle2, ChevronDown, FileSpreadsheet, Loader2, RotateCcw, Upload, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { analizarKardex, importarKardex } from "@/actions/kardex"
import type { ResultadoArchivo } from "@/lib/kardex-import"
import { isActionError } from "@/lib/action-result"
import { formatBs, formatKg } from "@/lib/formato"

type Fase = "seleccion" | "analizando" | "revision" | "importando" | "hecho"

const EXTENSIONES = /\.(xlsx|xlsm|xls)$/i
const MAX_TOTAL_MB = 60

const ESTADO: Record<ResultadoArchivo["estado"], { texto: string; clase: string }> = {
  listo: { texto: "Listo para importar", clase: "bg-accent/15 text-accent" },
  importado: { texto: "Importado", clase: "bg-accent/15 text-accent" },
  revision: { texto: "Requiere revisión", clase: "bg-warn/15 text-warn" },
  "sin-cambios": { texto: "Sin cambios", clase: "bg-black/[0.05] text-subdued" },
  error: { texto: "No se pudo leer", clase: "bg-danger/15 text-danger" },
}

function clave(f: File) {
  return `${f.name}|${f.size}|${f.lastModified}`
}

function Dato({ etiqueta, valor, destacado }: { etiqueta: string; valor: string; destacado?: "ok" | "mal" }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-subdued">{etiqueta}</dt>
      <dd
        className={`truncate text-sm font-bold tabular-nums ${destacado === "mal" ? "text-danger" : destacado === "ok" ? "text-accent" : "text-fg"}`}
      >
        {valor}
      </dd>
    </div>
  )
}

function TarjetaResultado({ r, importado }: { r: ResultadoArchivo; importado: boolean }) {
  const estado = ESTADO[r.estado]
  const diferencia = r.saldoExcel !== null ? Math.round((r.saldoExcel - r.saldoCalculado) * 100) / 100 : null
  const cuadra = diferencia !== null && Math.abs(diferencia) <= Math.max(1, (r.entregas + r.pagos) * 0.05)

  return (
    <li className="rounded-lg bg-elevated p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-bold">{r.cliente || r.archivo}</p>
          <p className="truncate text-xs text-subdued">
            {r.archivo}
            {r.hojas.length > 1 ? ` · ${r.hojas.length} hojas` : ""}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-1.5">
          {r.clienteNuevo && r.estado !== "error" && (
            <span className="rounded-full bg-info/15 px-2.5 py-0.5 text-xs font-bold text-info">Cliente nuevo</span>
          )}
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${estado.clase}`}>{estado.texto}</span>
        </div>
      </div>

      {r.mensaje && (
        <p className="mt-3 flex items-start gap-2 text-sm text-fg" role={r.estado === "error" ? "alert" : undefined}>
          <AlertCircle className={`mt-0.5 size-4 shrink-0 ${r.estado === "error" ? "text-danger" : "text-warn"}`} />
          {r.mensaje}
        </p>
      )}

      {r.estado !== "error" && (
        <>
          <p className="mt-3 text-sm text-subdued">
            <span className="font-semibold text-fg">{r.entregas}</span> {importado ? "entregas agregadas" : "entregas nuevas"} ·{" "}
            <span className="font-semibold text-fg">{r.pagos}</span> {importado ? "pagos agregados" : "pagos nuevos"}
            {r.duplicadas > 0 && <> · {r.duplicadas} ya estaban importadas</>}
          </p>
          <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Dato etiqueta="Kg entregados" valor={formatKg(r.kg)} />
            <Dato etiqueta="Entregado" valor={formatBs(r.cargo)} />
            <Dato etiqueta="Pagado" valor={formatBs(r.abono)} />
            <Dato etiqueta="Saldo de las filas" valor={formatBs(r.saldoCalculado)} />
          </dl>
          {r.saldoExcel !== null && (
            <p className={`mt-3 flex items-center gap-2 text-sm ${cuadra ? "text-accent" : "text-warn"}`}>
              {cuadra ? <CheckCircle2 className="size-4 shrink-0" /> : <AlertCircle className="size-4 shrink-0" />}
              {cuadra
                ? `Cuadra con el saldo del Excel (${formatBs(r.saldoExcel)}).`
                : `El Excel dice ${formatBs(r.saldoExcel)}; las filas suman ${formatBs(r.saldoCalculado)} (diferencia ${formatBs(diferencia)}).`}
            </p>
          )}
          {r.saldoSistema !== null && (
            <p className="mt-1 text-sm text-subdued">
              Saldo del cliente en el sistema{importado ? " ahora" : " hoy"}:{" "}
              <span className="font-semibold text-fg tabular-nums">{formatBs(r.saldoSistema)}</span>
            </p>
          )}
        </>
      )}

      {r.errores.length > 0 && (
        <details className="group mt-3 rounded-md bg-black/[0.03]" open={r.errores.length <= 5}>
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 px-3 text-sm font-bold text-danger">
            <span>
              {r.errores.length} {r.errores.length === 1 ? "fila con error" : "filas con error"} (no se importan)
            </span>
            <ChevronDown className="size-4 transition-transform group-open:rotate-180" />
          </summary>
          <ul className="max-h-48 space-y-1.5 overflow-y-auto px-3 pb-3 text-sm">
            {r.errores.map((e, i) => (
              <li key={i} className="flex gap-2">
                <span className="shrink-0 font-bold tabular-nums text-fg">Fila {e.fila}</span>
                <span className="text-subdued">
                  {e.hoja && r.hojas.length > 1 ? `(${e.hoja}) ` : ""}
                  {e.mensaje}
                </span>
              </li>
            ))}
          </ul>
        </details>
      )}

      {r.avisos.length > 0 && (
        <details className="group mt-2 rounded-md bg-black/[0.03]">
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 px-3 text-sm font-bold text-warn">
            <span>{r.avisos.length === 1 ? "1 aviso" : `${r.avisos.length} avisos`}</span>
            <ChevronDown className="size-4 transition-transform group-open:rotate-180" />
          </summary>
          <ul className="max-h-40 space-y-1.5 overflow-y-auto px-3 pb-3 text-sm text-subdued">
            {r.avisos.map((a, i) => (
              <li key={i}>{a}</li>
            ))}
          </ul>
        </details>
      )}
    </li>
  )
}

export function ImportarKardex({ onCerrar }: { onCerrar: () => void }) {
  const router = useRouter()
  const tituloId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const [fase, setFase] = useState<Fase>("seleccion")
  const [archivos, setArchivos] = useState<File[]>([])
  const [resultados, setResultados] = useState<ResultadoArchivo[]>([])
  const [permitirParcial, setPermitirParcial] = useState(false)
  const [arrastrando, setArrastrando] = useState(false)
  const [error, setError] = useState("")

  const ocupado = fase === "analizando" || fase === "importando"

  useEffect(() => {
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !ocupado) onCerrar()
    }
    window.addEventListener("keydown", alTeclear)
    return () => window.removeEventListener("keydown", alTeclear)
  }, [ocupado, onCerrar])

  const agregar = useCallback((lista: FileList | File[]) => {
    const nuevos = Array.from(lista)
    const validos = nuevos.filter((f) => EXTENSIONES.test(f.name))
    const rechazados = nuevos.length - validos.length
    setError(rechazados > 0 ? `${rechazados} archivo(s) se ignoraron porque no son Excel (.xlsx).` : "")
    setArchivos((prev) => {
      const vistos = new Set(prev.map(clave))
      return [...prev, ...validos.filter((f) => !vistos.has(clave(f)))]
    })
    setFase("seleccion")
    setResultados([])
  }, [])

  function formData() {
    const fd = new FormData()
    for (const f of archivos) fd.append("archivos", f)
    if (permitirParcial) fd.set("permitirParcial", "1")
    return fd
  }

  async function ejecutar(guardar: boolean) {
    const totalMb = archivos.reduce((s, f) => s + f.size, 0) / 1024 / 1024
    if (totalMb > MAX_TOTAL_MB) {
      setError(`Los archivos suman ${totalMb.toFixed(1)} MB y el máximo por carga es ${MAX_TOTAL_MB} MB. Súbelos en tandas.`)
      return
    }
    setError("")
    setFase(guardar ? "importando" : "analizando")
    try {
      const res = guardar ? await importarKardex(formData()) : await analizarKardex(formData())
      if (isActionError(res)) {
        setError(res.error)
        setFase(guardar ? "revision" : "seleccion")
        return
      }
      setResultados(res.resultados)
      if (guardar) {
        setFase("hecho")
        setArchivos([])
        router.refresh()
      } else {
        setFase("revision")
      }
    } catch {
      setError(
        "No se pudo completar la operación. Revisa tu conexión; si subes muchos archivos, prueba con menos a la vez."
      )
      setFase(guardar ? "revision" : "seleccion")
    }
  }

  function reiniciar() {
    setArchivos([])
    setResultados([])
    setPermitirParcial(false)
    setError("")
    setFase("seleccion")
  }

  const importables = resultados.filter((r) => r.estado === "listo")
  const conRevision = resultados.filter((r) => r.estado === "revision" && r.entregas + r.pagos > 0)
  const hayAlgoParaGuardar = importables.length > 0 || (permitirParcial && conRevision.length > 0)
  const importados = resultados.filter((r) => r.estado === "importado")

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={tituloId}
        className="flex max-h-[92dvh] w-full max-w-3xl flex-col rounded-t-2xl bg-panel shadow-2xl sm:rounded-2xl"
      >
        <header className="flex items-start justify-between gap-3 px-5 pb-3 pt-5">
          <div>
            <h2 id={tituloId} className="text-xl font-extrabold tracking-tight">
              Importar kardex de clientes
            </h2>
            <p className="mt-1 text-sm text-subdued">
              {fase === "seleccion" && "Sube los Excel de tus clientes. Antes de guardar nada verás un resumen para revisar."}
              {fase === "analizando" && "Leyendo los archivos…"}
              {fase === "revision" && "Revisa el resumen. Todavía no se guardó nada."}
              {fase === "importando" && "Guardando…"}
              {fase === "hecho" && `${importados.length} de ${resultados.length} archivo(s) importado(s).`}
            </p>
          </div>
          <button
            type="button"
            onClick={onCerrar}
            disabled={ocupado}
            aria-label="Cerrar"
            className="grid size-11 shrink-0 place-items-center rounded-full text-subdued hover:bg-black/[0.05] hover:text-fg disabled:opacity-40"
          >
            <X className="size-5" />
          </button>
        </header>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 pb-4">
          {error && (
            <div role="alert" className="flex items-start gap-3 rounded-md bg-danger px-4 py-3 text-sm font-semibold text-white">
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {(fase === "seleccion" || fase === "analizando") && (
            <>
              <div
                onDragOver={(e) => {
                  e.preventDefault()
                  setArrastrando(true)
                }}
                onDragLeave={() => setArrastrando(false)}
                onDrop={(e) => {
                  e.preventDefault()
                  setArrastrando(false)
                  if (e.dataTransfer.files.length) agregar(e.dataTransfer.files)
                }}
                className={`rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
                  arrastrando ? "border-accent bg-accent/10" : "border-line-strong bg-card"
                }`}
              >
                <FileSpreadsheet className="mx-auto size-10 text-subdued" aria-hidden />
                <p className="mt-3 font-bold">Arrastra aquí los archivos Excel</p>
                <p className="mt-1 text-sm text-subdued">o elígelos desde tu equipo. Puedes subir varios a la vez.</p>
                <Button type="button" variant="outline" className="mt-4" onClick={() => inputRef.current?.click()} disabled={ocupado}>
                  <Upload /> Elegir archivos
                </Button>
                <input
                  ref={inputRef}
                  type="file"
                  multiple
                  accept=".xlsx,.xlsm,.xls"
                  className="sr-only"
                  aria-label="Archivos de Excel"
                  onChange={(e) => {
                    if (e.target.files) agregar(e.target.files)
                    e.target.value = ""
                  }}
                />
              </div>

              {archivos.length > 0 && (
                <ul className="divide-y divide-line rounded-lg bg-card">
                  {archivos.map((f) => (
                    <li key={clave(f)} className="flex items-center gap-3 px-4 py-2.5">
                      <FileSpreadsheet className="size-5 shrink-0 text-accent" aria-hidden />
                      <span className="min-w-0 flex-1 truncate text-sm font-semibold">{f.name}</span>
                      <span className="shrink-0 text-xs text-subdued tabular-nums">{(f.size / 1024).toFixed(0)} KB</span>
                      <button
                        type="button"
                        aria-label={`Quitar ${f.name}`}
                        disabled={ocupado}
                        onClick={() => setArchivos((prev) => prev.filter((x) => clave(x) !== clave(f)))}
                        className="grid size-9 shrink-0 place-items-center rounded-full text-subdued hover:bg-black/[0.05] hover:text-fg"
                      >
                        <X className="size-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}

          {(fase === "revision" || fase === "importando" || fase === "hecho") && (
            <ul className="space-y-3">
              {resultados.map((r, i) => (
                <TarjetaResultado key={`${r.archivo}-${i}`} r={r} importado={fase === "hecho"} />
              ))}
            </ul>
          )}

          {fase === "revision" && conRevision.length > 0 && (
            <label className="flex cursor-pointer items-start gap-3 rounded-lg bg-warn/10 p-4 text-sm">
              <input
                type="checkbox"
                checked={permitirParcial}
                onChange={(e) => setPermitirParcial(e.target.checked)}
                className="mt-0.5 size-5 shrink-0 accent-[#1ed760]"
              />
              <span>
                <span className="font-bold text-fg">Importar solo las filas válidas</span>
                <span className="mt-0.5 block text-subdued">
                  {conRevision.length} archivo(s) tienen filas con error. Si lo activas, esas filas se omiten y el saldo del
                  cliente puede quedar distinto al del Excel. Lo recomendable es corregir el Excel y volver a analizarlo.
                </span>
              </span>
            </label>
          )}
        </div>

        <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-line px-5 py-4">
          {fase === "seleccion" || fase === "analizando" ? (
            <>
              <Button variant="ghost" onClick={onCerrar} disabled={ocupado}>
                Cancelar
              </Button>
              <Button onClick={() => ejecutar(false)} disabled={archivos.length === 0 || ocupado}>
                {fase === "analizando" ? (
                  <>
                    <Loader2 className="animate-spin" /> Leyendo…
                  </>
                ) : (
                  `Revisar ${archivos.length || ""} archivo${archivos.length === 1 ? "" : "s"}`.replace("  ", " ")
                )}
              </Button>
            </>
          ) : fase === "hecho" ? (
            <>
              <Button variant="ghost" onClick={reiniciar}>
                Importar más
              </Button>
              <Button onClick={onCerrar}>Listo</Button>
            </>
          ) : (
            <>
              <Button variant="ghost" onClick={reiniciar} disabled={ocupado}>
                <RotateCcw /> Elegir otros archivos
              </Button>
              <Button onClick={() => ejecutar(true)} disabled={!hayAlgoParaGuardar || ocupado}>
                {fase === "importando" ? (
                  <>
                    <Loader2 className="animate-spin" /> Guardando…
                  </>
                ) : (
                  `Importar ${importables.length + (permitirParcial ? conRevision.length : 0)} archivo${
                    importables.length + (permitirParcial ? conRevision.length : 0) === 1 ? "" : "s"
                  }`
                )}
              </Button>
            </>
          )}
        </footer>
      </div>
    </div>
  )
}
