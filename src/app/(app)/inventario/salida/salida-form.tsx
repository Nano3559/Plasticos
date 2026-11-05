"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { registrarSalida } from "@/actions/inventario"
import { isActionError } from "@/lib/action-result"
import { formatNumero, leerNumero, numeroParaEnviar } from "@/lib/formato"
import type { MaterialForm } from "@/lib/materiales-form"
import { useTurno } from "@/lib/use-turno"
import { Button } from "@/components/ui/button"
import { CampoNumero } from "@/components/ui/campo-numero"
import { ElegirTurno } from "@/components/ui/elegir-turno"
import { Encabezado } from "@/components/ui/encabezado"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { MensajeError } from "@/components/ui/mensaje"
import { Selector } from "@/components/ui/selector"
import { ElegirMaterial } from "@/components/inventario/elegir-material"

const MOTIVOS_BASE = ["Carga extrusora", "Tinta o solvente a impresora", "Insumos de confección", "Mezcla", "Pruebas de calibración"]

export function SalidaForm({
  materiales,
  motivosUsados,
  ordenes,
  materialInicial,
  ordenInicial,
}: {
  materiales: MaterialForm[]
  motivosUsados: string[]
  ordenes: { id: string; etiqueta: string }[]
  materialInicial?: string
  ordenInicial?: string
}) {
  const router = useRouter()
  const [pendiente, iniciar] = useTransition()
  const [error, setError] = useState("")
  const [materialId, setMaterialId] = useState(materialInicial ?? "")
  const [cantidad, setCantidad] = useState("")
  const [motivo, setMotivo] = useState("")
  const [ordenId, setOrdenId] = useState(ordenInicial ?? "")
  const [turno, setTurno] = useTurno()

  const m = materiales.find((x) => x.id === materialId)
  const cant = leerNumero(cantidad) || 0
  const excede = !!m && cant > m.stock + 0.005
  const sugeridos = [...new Set([...motivosUsados, ...MOTIVOS_BASE])].slice(0, 8)

  return (
    <div className="max-w-2xl space-y-8">
      <Encabezado
        miga={{ href: "/inventario", texto: "Inventario" }}
        titulo="Vale de salida"
        descripcion="Material que sale del almacén a planta. Almacén y Gerencia reciben un aviso."
      />
      <form
        onSubmit={(e) => {
          e.preventDefault()
          setError("")
          const fd = new FormData()
          fd.set("materialId", materialId)
          fd.set("cantidad", numeroParaEnviar(cantidad))
          fd.set("turno", turno)
          fd.set("motivo", motivo.trim())
          if (ordenId) fd.set("ordenId", ordenId)
          iniciar(async () => {
            const r = await registrarSalida(fd)
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
        <div className="space-y-2">
          <Label htmlFor="cantidad">Cantidad que sale</Label>
          <CampoNumero id="cantidad" valor={cantidad} onCambio={setCantidad} unidad={m?.unidad ?? "kg"} grande placeholder="0" aria-invalid={excede || undefined} />
          {excede && m && (
            <p className="-mt-3 text-sm font-medium text-danger">
              Solo hay {formatNumero(m.stock, 2)} {m.unidad} en almacén.
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="ordenId">Orden de trabajo (si es para una)</Label>
          <Selector id="ordenId" value={ordenId} onChange={(e) => setOrdenId(e.target.value)}>
            <option value="">Sin orden</option>
            {ordenes.map((o) => (
              <option key={o.id} value={o.id}>
                {o.etiqueta}
              </option>
            ))}
          </Selector>
          <p className="text-xs text-muted">Ligarla permite calcular el costo de materia prima de la OT y saber qué lote usó.</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="motivo">Motivo o destino</Label>
          <Input id="motivo" value={motivo} onChange={(e) => setMotivo(e.target.value)} required maxLength={120} autoComplete="off" />
          <div className="flex flex-wrap gap-2 pt-1">
            {sugeridos.map((t) => (
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
          <Button type="submit" disabled={pendiente || !materialId || !(cant > 0) || excede || !motivo.trim()}>
            {pendiente ? "Guardando…" : "Registrar salida"}
          </Button>
          <Button type="button" variant="ghost" onClick={() => router.back()}>
            Cancelar
          </Button>
        </div>
      </form>
    </div>
  )
}
