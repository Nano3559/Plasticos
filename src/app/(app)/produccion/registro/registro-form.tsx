"use client"

import { useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { CheckCircle2, Layers, PackageX, Printer, Scissors, AlertCircle } from "lucide-react"
import { registrarProduccion } from "@/actions/produccion"
import { isActionError } from "@/lib/action-result"
import { formatKg, formatNumero, leerNumero, numeroParaEnviar, redondear } from "@/lib/formato"
import { MOTIVOS_RECHAZO } from "@/lib/rechazos"
import { useTurno } from "@/lib/use-turno"
import { Button } from "@/components/ui/button"
import { CampoNumero } from "@/components/ui/campo-numero"
import { Encabezado } from "@/components/ui/encabezado"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { MensajeError } from "@/components/ui/mensaje"
import { Opciones } from "@/components/ui/opciones"
import { ElegirTurno } from "@/components/ui/elegir-turno"
import { Selector } from "@/components/ui/selector"

interface OrdenInfo {
  id: string
  numero: number
  refExterna?: string | null
  producto: string
  medida?: string | null
  mezclaNota?: string | null
  kgPedidos: number
  totalFabricado: number
  clienteNombre: string
  materialesUsados: string[]
}

export type LoteOpcion = {
  id: string
  materialId: string
  material: string
  proveedor: string
  lote: string | null
  kg: number
  fecha: string
}

type Area = "EXTRUSION" | "IMPRESION" | "CONFECCION"

const MANUAL = "__manual"
const fechaCorta = (iso: string) =>
  new Date(iso).toLocaleDateString("es-BO", { day: "2-digit", month: "short", timeZone: "America/La_Paz" }).replace(".", "")
const etiquetaLote = (l: LoteOpcion) =>
  `${l.proveedor}${l.lote ? ` · lote ${l.lote}` : ""} · ${l.material} · ${fechaCorta(l.fecha)} (${formatKg(l.kg, 0)})`
const n = (t: string) => leerNumero(t) || 0

export function RegistroForm({ ordenes, lotes, ordenInicial }: { ordenes: OrdenInfo[]; lotes: LoteOpcion[]; ordenInicial?: string }) {
  const router = useRouter()
  const [pendiente, iniciar] = useTransition()
  const [error, setError] = useState("")

  const [ordenId, setOrdenId] = useState(ordenInicial ?? ordenes[0]?.id ?? "")
  const [area, setArea] = useState<Area | "">("")
  const [turno, setTurno] = useTurno()

  const [kgEntrada, setKgEntrada] = useState("")
  const [kgBuenos, setKgBuenos] = useState("")
  const [kgMerma, setKgMerma] = useState("")
  const [kgRechazado, setKgRechazado] = useState("")
  const [horas, setHoras] = useState("")

  // Rechazo en extrusión: de qué lote vino y por qué
  const [loteId, setLoteId] = useState("")
  const [proveedorManual, setProveedorManual] = useState("")
  const [loteManual, setLoteManual] = useState("")
  const [motivo, setMotivo] = useState("")
  const [nota, setNota] = useState("")

  const orden = ordenes.find((o) => o.id === ordenId)
  const { lotesDeOT, otrosLotes } = useMemo(() => {
    const usados = new Set(orden?.materialesUsados ?? [])
    return { lotesDeOT: lotes.filter((l) => usados.has(l.materialId)), otrosLotes: lotes.filter((l) => !usados.has(l.materialId)) }
  }, [lotes, orden])

  const b = useMemo(() => {
    const entrada = n(kgEntrada)
    const buenos = n(kgBuenos)
    const merma = n(kgMerma)
    const rechazado = n(kgRechazado)
    const salida = buenos + merma + rechazado
    const diff = redondear(entrada - salida)
    return {
      entrada, buenos, merma, rechazado, salida, diff,
      cuadra: entrada > 0 && Math.abs(diff) < 0.01,
      pct: (x: number) => (entrada > 0 ? Math.min(100, (x / entrada) * 100) : 0),
    }
  }, [kgEntrada, kgBuenos, kgMerma, kgRechazado])

  const pideRechazo = area === "EXTRUSION" && b.rechazado > 0
  const rechazoCompleto = !pideRechazo || (!!motivo && (loteId === MANUAL ? !!proveedorManual.trim() : loteId !== ""))
  const listo = !!ordenId && !!area && b.cuadra && rechazoCompleto

  function autocompletar() {
    const resto = Math.max(0, b.entrada - b.merma - b.rechazado)
    setKgBuenos(formatNumero(resto, 2))
  }

  function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError("")
    if (!area) return setError("Elige el área.")
    if (!b.cuadra) return setError("La balanza no cuadra: entrada = buenos + merma + rechazo.")
    if (!rechazoCompleto) return setError("Indica de qué lote o proveedor vino el material rechazado y el motivo.")

    const fd = new FormData()
    fd.set("ordenId", ordenId)
    fd.set("area", area)
    fd.set("turno", turno)
    fd.set("kgEntrada", numeroParaEnviar(kgEntrada))
    fd.set("kgBuenos", numeroParaEnviar(kgBuenos))
    fd.set("kgMerma", numeroParaEnviar(kgMerma) || "0")
    fd.set("kgRechazado", numeroParaEnviar(kgRechazado) || "0")
    if (horas.trim()) fd.set("horasMaquina", numeroParaEnviar(horas, 1))
    if (pideRechazo) {
      if (loteId === MANUAL) {
        fd.set("rechazoProveedor", proveedorManual)
        if (loteManual) fd.set("rechazoLote", loteManual)
      } else fd.set("rechazoEntradaId", loteId)
      fd.set("rechazoMotivo", motivo)
      if (nota) fd.set("rechazoNota", nota)
    }
    iniciar(async () => {
      const r = await registrarProduccion(fd)
      if (isActionError(r)) setError(r.error)
      else {
        router.push(`/produccion/ordenes/${ordenId}`)
        router.refresh()
      }
    })
  }

  return (
    <div className="max-w-2xl space-y-8">
      <Encabezado
        miga={{ href: "/produccion", texto: "Producción" }}
        titulo="Registrar producción"
        descripcion="Pesaje de un área en tu turno. La balanza tiene que cuadrar: lo que entra = buenos + merma + rechazo."
      />

      <form onSubmit={enviar} className="space-y-8">
        <MensajeError>{error}</MensajeError>

        {/* 1. Orden */}
        <div className="space-y-2">
          <Label htmlFor="ordenId">Orden de trabajo</Label>
          <Selector id="ordenId" value={ordenId} onChange={(e) => setOrdenId(e.target.value)} required>
            {ordenes.length === 0 && <option value="">No hay órdenes abiertas</option>}
            {ordenes.map((o) => (
              <option key={o.id} value={o.id}>
                OT {o.refExterna ?? `#${o.numero}`} · {o.producto} · {o.clienteNombre}
              </option>
            ))}
          </Selector>
          {orden && (
            <div className="rounded-lg bg-elevated px-4 py-3 text-sm">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span>
                  {orden.producto}
                  {orden.medida && <span className="text-subdued"> · {orden.medida}</span>}
                </span>
                <span className="tabular-nums text-subdued">
                  {formatKg(orden.totalFabricado, 0)} de {formatKg(orden.kgPedidos, 0)}
                </span>
              </div>
              {orden.mezclaNota && <p className="mt-1 font-semibold text-warn">Mezcla: {orden.mezclaNota}</p>}
            </div>
          )}
        </div>

        {/* 2. Área y turno */}
        <Opciones<Area>
          nombre="area"
          etiqueta="Área"
          valor={area}
          onCambio={setArea}
          opciones={[
            { valor: "EXTRUSION", texto: "Extrusión", icono: Layers },
            { valor: "IMPRESION", texto: "Impresión", icono: Printer },
            { valor: "CONFECCION", texto: "Confección", icono: Scissors },
          ]}
        />
        <ElegirTurno valor={turno} onCambio={setTurno} />

        {/* 3. Pesaje */}
        <fieldset className="space-y-4">
          <legend className="mb-2 text-sm font-semibold">Pesaje</legend>
          <div className="space-y-2">
            <Label htmlFor="kgEntrada">Kg que entraron a la máquina</Label>
            <CampoNumero id="kgEntrada" valor={kgEntrada} onCambio={setKgEntrada} unidad="kg" grande placeholder="0" />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <div className="flex items-baseline justify-between">
                <Label htmlFor="kgBuenos" className="text-accent">
                  Buenos
                </Label>
                {b.entrada > 0 && !b.cuadra && (
                  <button type="button" onClick={autocompletar} className="text-xs font-semibold text-brand-ink hover:underline">
                    Completar
                  </button>
                )}
              </div>
              <CampoNumero id="kgBuenos" valor={kgBuenos} onCambio={setKgBuenos} unidad="kg" placeholder="0" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="kgMerma" className="text-warn">
                Merma
              </Label>
              <CampoNumero id="kgMerma" valor={kgMerma} onCambio={setKgMerma} unidad="kg" placeholder="0" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="kgRechazado" className="text-danger">
                Rechazo
              </Label>
              <CampoNumero id="kgRechazado" valor={kgRechazado} onCambio={setKgRechazado} unidad="kg" placeholder="0" />
            </div>
          </div>

          {/* Balanza en vivo */}
          <div
            className={`rounded-lg px-4 py-3 text-sm ${
              b.entrada === 0 ? "bg-elevated text-subdued" : b.cuadra ? "bg-accent/10 text-accent" : "bg-warn/10 text-warn"
            }`}
            aria-live="polite"
          >
            <div className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2 font-semibold">
                {b.cuadra ? <CheckCircle2 className="size-4" /> : <AlertCircle className="size-4" />}
                {b.entrada === 0
                  ? "Escribe los kg que entraron"
                  : b.cuadra
                    ? "La balanza cuadra"
                    : b.diff > 0
                      ? `Faltan ${formatKg(b.diff)} por asignar`
                      : `Te pasaste por ${formatKg(-b.diff)}`}
              </span>
              {b.entrada > 0 && (
                <span className="tabular-nums">
                  {formatKg(b.salida)} / {formatKg(b.entrada)}
                </span>
              )}
            </div>
            {b.entrada > 0 && (
              <>
                <div className="mt-2 flex h-2 overflow-hidden rounded-full bg-black/[0.07]" aria-hidden>
                  <div className="bg-accent" style={{ width: `${b.pct(b.buenos)}%` }} />
                  <div className="bg-warn" style={{ width: `${b.pct(b.merma)}%` }} />
                  <div className="bg-danger" style={{ width: `${b.pct(b.rechazado)}%` }} />
                </div>
                <p className="mt-1.5 text-xs text-subdued">
                  Rinde {formatNumero(b.pct(b.buenos), 0)}% · merma {formatNumero(b.pct(b.merma), 0)}%
                  {b.rechazado > 0 && ` · rechazo ${formatNumero(b.pct(b.rechazado), 0)}%`}
                </p>
              </>
            )}
          </div>
        </fieldset>

        {/* 4. Rechazo en extrusión */}
        {pideRechazo && (
          <fieldset className="space-y-4 rounded-lg border border-danger/30 bg-danger/5 p-4">
            <legend className="flex items-center gap-1.5 px-1 text-sm font-semibold text-danger">
              <PackageX className="size-4" /> ¿De dónde vino el material rechazado?
            </legend>
            <div className="space-y-2">
              <Label htmlFor="loteRechazo">Lote o proveedor</Label>
              <Selector id="loteRechazo" value={loteId} onChange={(e) => setLoteId(e.target.value)} required>
                <option value="" disabled>
                  Elige el lote
                </option>
                {lotesDeOT.length > 0 && (
                  <optgroup label="Material entregado a esta OT">
                    {lotesDeOT.map((l) => (
                      <option key={l.id} value={l.id}>
                        {etiquetaLote(l)}
                      </option>
                    ))}
                  </optgroup>
                )}
                {otrosLotes.length > 0 && (
                  <optgroup label={lotesDeOT.length > 0 ? "Otros lotes recientes" : "Lotes recientes"}>
                    {otrosLotes.map((l) => (
                      <option key={l.id} value={l.id}>
                        {etiquetaLote(l)}
                      </option>
                    ))}
                  </optgroup>
                )}
                <option value={MANUAL}>No está en la lista: escribir a mano</option>
              </Selector>
            </div>
            {loteId === MANUAL && (
              <div className="grid gap-4 sm:grid-cols-[1fr_160px]">
                <div className="space-y-2">
                  <Label htmlFor="proveedorManual">Proveedor</Label>
                  <Input id="proveedorManual" value={proveedorManual} onChange={(e) => setProveedorManual(e.target.value)} maxLength={80} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="loteManual">Lote (opcional)</Label>
                  <Input id="loteManual" value={loteManual} onChange={(e) => setLoteManual(e.target.value)} maxLength={40} />
                </div>
              </div>
            )}
            <fieldset>
              <legend className="mb-2 text-sm font-semibold">Motivo</legend>
              <div className="flex flex-wrap gap-2">
                {MOTIVOS_RECHAZO.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMotivo(m)}
                    aria-pressed={motivo === m}
                    className={`h-10 rounded-full border px-3.5 text-sm font-medium transition ${
                      motivo === m ? "border-danger bg-danger/10 text-danger" : "border-line bg-panel text-subdued hover:bg-elevated"
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </fieldset>
            <Input
              aria-label="Detalle del rechazo (opcional)"
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              placeholder="Detalle (opcional): venía mojado del camión…"
              maxLength={300}
            />
          </fieldset>
        )}

        {/* 5. Horas */}
        <div className="max-w-xs space-y-2">
          <Label htmlFor="horas">Horas de máquina (opcional)</Label>
          <CampoNumero id="horas" valor={horas} onCambio={setHoras} unidad="h" decimales={1} placeholder="7,5" />
        </div>

        <div className="flex gap-2">
          <Button type="submit" size="lg" disabled={pendiente || !listo} className="flex-1 sm:flex-none">
            {pendiente ? "Guardando…" : "Registrar producción"}
          </Button>
          <Button type="button" variant="ghost" size="lg" onClick={() => router.back()}>
            Cancelar
          </Button>
        </div>
      </form>
    </div>
  )
}
