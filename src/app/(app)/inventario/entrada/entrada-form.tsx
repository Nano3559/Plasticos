"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { registrarEntrada } from "@/actions/inventario"
import { isActionError } from "@/lib/action-result"
import { formatBs, formatNumero, leerNumero, numeroParaEnviar } from "@/lib/formato"
import type { MaterialForm } from "@/lib/materiales-form"
import { useTurno } from "@/lib/use-turno"
import { Button } from "@/components/ui/button"
import { CampoNumero } from "@/components/ui/campo-numero"
import { ElegirTurno } from "@/components/ui/elegir-turno"
import { Encabezado } from "@/components/ui/encabezado"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { MensajeError } from "@/components/ui/mensaje"
import { ElegirMaterial } from "@/components/inventario/elegir-material"

export function EntradaForm({ materiales, proveedores, materialInicial }: { materiales: MaterialForm[]; proveedores: string[]; materialInicial?: string }) {
  const router = useRouter()
  const [pendiente, iniciar] = useTransition()
  const [error, setError] = useState("")
  const sugerirCosto = (id: string) => {
    const m = materiales.find((x) => x.id === id)
    return m && m.costoPromedio > 0 ? formatNumero(m.costoPromedio, 2) : ""
  }
  const [materialId, setMaterialId] = useState(materialInicial ?? "")
  const [cantidad, setCantidad] = useState("")
  const [costo, setCosto] = useState(() => (materialInicial ? sugerirCosto(materialInicial) : ""))
  const [proveedor, setProveedor] = useState("")
  const [lote, setLote] = useState("")
  const [turno, setTurno] = useTurno()

  const m = materiales.find((x) => x.id === materialId)
  const total = (leerNumero(cantidad) || 0) * (leerNumero(costo, 4) || 0)

  return (
    <div className="max-w-2xl space-y-8">
      <Encabezado
        miga={{ href: "/inventario", texto: "Inventario" }}
        titulo="Entrada de material"
        descripcion="Material que llega al almacén. El proveedor y el lote sirven para saber de dónde vino si después se rechaza."
      />
      <form
        onSubmit={(e) => {
          e.preventDefault()
          setError("")
          const fd = new FormData()
          fd.set("materialId", materialId)
          fd.set("cantidad", numeroParaEnviar(cantidad))
          fd.set("turno", turno)
          if (proveedor.trim()) fd.set("proveedor", proveedor.trim())
          if (lote.trim()) fd.set("lote", lote.trim())
          if (costo.trim()) fd.set("costoUnitario", numeroParaEnviar(costo, 4))
          iniciar(async () => {
            const r = await registrarEntrada(fd)
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
        <ElegirMaterial
          materiales={materiales}
          valor={materialId}
          onCambio={(id) => {
            setMaterialId(id)
            setCosto(sugerirCosto(id))
          }}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="cantidad">Cantidad que llegó</Label>
            <CampoNumero id="cantidad" valor={cantidad} onCambio={setCantidad} unidad={m?.unidad ?? "kg"} grande placeholder="0" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="costo">Costo por {m?.unidad ?? "kg"} (opcional)</Label>
            <CampoNumero id="costo" valor={costo} onCambio={setCosto} unidad="Bs" decimales={4} grande placeholder="0" />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-[1fr_180px]">
          <div className="space-y-2">
            <Label htmlFor="proveedor">Proveedor</Label>
            <Input id="proveedor" value={proveedor} onChange={(e) => setProveedor(e.target.value)} list="proveedores" maxLength={80} autoComplete="off" />
            <datalist id="proveedores">
              {proveedores.map((p) => (
                <option key={p} value={p} />
              ))}
            </datalist>
            {proveedores.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {proveedores.slice(0, 5).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setProveedor(p)}
                    className={`h-9 rounded-full border px-3 text-[13px] transition ${
                      proveedor === p ? "border-brand bg-brand-soft text-brand-ink" : "border-line text-subdued hover:bg-elevated"
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="lote">Lote o N° de guía</Label>
            <Input id="lote" value={lote} onChange={(e) => setLote(e.target.value)} maxLength={40} autoComplete="off" />
          </div>
        </div>
        <ElegirTurno valor={turno} onCambio={setTurno} />
        {total > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg bg-elevated px-4 py-3">
            <p className="text-sm text-subdued">Valor de la entrada · el costo promedio del material se recalcula</p>
            <p className="text-xl font-extrabold tabular-nums text-brand-ink">{formatBs(total)}</p>
          </div>
        )}
        <div className="flex gap-2">
          <Button type="submit" disabled={pendiente || !materialId || !(leerNumero(cantidad) > 0)}>
            {pendiente ? "Guardando…" : "Registrar entrada"}
          </Button>
          <Button type="button" variant="ghost" onClick={() => router.back()}>
            Cancelar
          </Button>
        </div>
      </form>
    </div>
  )
}
