"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { registrarAjuste } from "@/actions/inventario"
import { isActionError } from "@/lib/action-result"
import { formatNumero, leerNumero, redondear } from "@/lib/formato"
import type { MaterialForm } from "@/lib/materiales-form"
import { useTurno } from "@/lib/use-turno"
import { Button } from "@/components/ui/button"
import { CampoNumero } from "@/components/ui/campo-numero"
import { ElegirTurno } from "@/components/ui/elegir-turno"
import { Encabezado } from "@/components/ui/encabezado"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { MensajeError } from "@/components/ui/mensaje"
import { Opciones } from "@/components/ui/opciones"
import { ElegirMaterial } from "@/components/inventario/elegir-material"

const MOTIVOS = ["Conteo físico de fin de mes", "Saco roto o derrame", "Merma por humedad", "Error al registrar", "Diferencia de balanza"]
type Modo = "CONTEO" | "DIRECTO"

export function AjusteForm({ materiales, materialInicial }: { materiales: MaterialForm[]; materialInicial?: string }) {
  const router = useRouter()
  const [pendiente, iniciar] = useTransition()
  const [error, setError] = useState("")
  const [materialId, setMaterialId] = useState(materialInicial ?? "")
  const [modo, setModo] = useState<Modo>("CONTEO")
  const [conteo, setConteo] = useState("")
  const [directo, setDirecto] = useState("")
  const [motivo, setMotivo] = useState("")
  const [turno, setTurno] = useTurno()

  const m = materiales.find((x) => x.id === materialId)
  const sistema = m?.stock ?? 0
  const ajuste =
    modo === "CONTEO"
      ? conteo.trim() === "" || !Number.isFinite(leerNumero(conteo))
        ? 0
        : redondear(leerNumero(conteo) - sistema)
      : redondear(leerNumero(directo) || 0)
  const queda = redondear(sistema + ajuste)
  const unidad = m?.unidad ?? "kg"

  return (
    <div className="max-w-2xl space-y-8">
      <Encabezado
        miga={{ href: "/inventario", texto: "Inventario" }}
        titulo="Ajuste de inventario"
        descripcion="Corrige el stock cuando el conteo físico no coincide. No borra movimientos: agrega uno nuevo con el motivo."
      />
      <form
        onSubmit={(e) => {
          e.preventDefault()
          setError("")
          if (ajuste === 0) return setError("No hay diferencia: el stock ya coincide.")
          const fd = new FormData()
          fd.set("materialId", materialId)
          fd.set("cantidad", String(ajuste))
          fd.set("turno", turno)
          fd.set("motivo", motivo.trim())
          iniciar(async () => {
            const r = await registrarAjuste(fd)
            if (isActionError(r)) setError(r.error)
            else {
              router.push(`/inventario/${materialId}`)
              router.refresh()
            }
          })
        }}
        className="space-y-6"
      >
        <MensajeError>{error}</MensajeError>
        <ElegirMaterial materiales={materiales} valor={materialId} onCambio={setMaterialId} />
        <Opciones<Modo>
          nombre="modo"
          etiqueta="¿Cómo quieres ajustar?"
          valor={modo}
          onCambio={setModo}
          columnas={2}
          opciones={[
            { valor: "CONTEO", texto: "Con el conteo físico", detalle: "Escribes lo que hay; el sistema calcula la diferencia" },
            { valor: "DIRECTO", texto: "Sumar o restar", detalle: "Escribes la diferencia; usa − para restar" },
          ]}
        />
        {modo === "CONTEO" ? (
          <div className="space-y-2">
            <Label htmlFor="conteo">Cuánto hay en el almacén</Label>
            <CampoNumero id="conteo" valor={conteo} onCambio={setConteo} unidad={unidad} grande placeholder="0" />
          </div>
        ) : (
          <div className="space-y-2">
            <Label htmlFor="directo">Diferencia</Label>
            <CampoNumero id="directo" valor={directo} onCambio={setDirecto} unidad={unidad} negativo grande placeholder="-12,5" />
          </div>
        )}
        {m && ajuste !== 0 && (
          <div className={`rounded-lg px-4 py-3 text-sm ${ajuste < 0 ? "bg-danger/10" : "bg-accent/10"}`}>
            <p className="flex flex-wrap justify-between gap-2 tabular-nums">
              <span className="text-subdued">
                Sistema {formatNumero(sistema, 2)} → queda {formatNumero(queda, 2)} {unidad}
              </span>
              <span className={`font-bold ${ajuste < 0 ? "text-danger" : "text-accent"}`}>
                {ajuste > 0 ? "+" : "−"}
                {formatNumero(Math.abs(ajuste), 2)} {unidad}
              </span>
            </p>
            {queda < 0 && <p className="mt-1 font-medium text-danger">El stock no puede quedar negativo.</p>}
          </div>
        )}
        <div className="space-y-2">
          <Label htmlFor="motivo">Motivo</Label>
          <Input id="motivo" value={motivo} onChange={(e) => setMotivo(e.target.value)} required minLength={3} maxLength={160} autoComplete="off" />
          <div className="flex flex-wrap gap-2 pt-1">
            {MOTIVOS.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setMotivo(t)}
                className={`h-9 rounded-full border px-3 text-[13px] transition ${
                  motivo === t ? "border-brand bg-brand-soft text-brand-ink" : "border-line text-subdued hover:bg-elevated"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
        <ElegirTurno valor={turno} onCambio={setTurno} />
        <div className="flex gap-2">
          <Button type="submit" disabled={pendiente || !materialId || ajuste === 0 || queda < 0 || motivo.trim().length < 3}>
            {pendiente ? "Guardando…" : "Registrar ajuste"}
          </Button>
          <Button type="button" variant="ghost" onClick={() => router.back()}>
            Cancelar
          </Button>
        </div>
      </form>
    </div>
  )
}
