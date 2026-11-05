"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { crearMaterial } from "@/actions/inventario"
import { isActionError } from "@/lib/action-result"
import { numeroParaEnviar } from "@/lib/formato"
import { CATEGORIA_MATERIAL } from "@/lib/etiquetas"
import { Button } from "@/components/ui/button"
import { CampoNumero } from "@/components/ui/campo-numero"
import { Encabezado } from "@/components/ui/encabezado"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { MensajeError } from "@/components/ui/mensaje"
import { Selector } from "@/components/ui/selector"

export default function NuevoMaterialPage() {
  const router = useRouter()
  const [pendiente, iniciar] = useTransition()
  const [error, setError] = useState("")
  const [unidad, setUnidad] = useState("kg")
  const [minimo, setMinimo] = useState("")
  const [costo, setCosto] = useState("")

  return (
    <div className="max-w-2xl space-y-8">
      <Encabezado miga={{ href: "/inventario", texto: "Inventario" }} titulo="Material nuevo" descripcion="Un insumo que entra al almacén." />
      <form
        onSubmit={(e) => {
          e.preventDefault()
          setError("")
          const fd = new FormData(e.currentTarget)
          fd.set("stockMinimo", numeroParaEnviar(minimo))
          fd.set("costoPromedio", numeroParaEnviar(costo, 4))
          iniciar(async () => {
            const r = await crearMaterial(fd)
            if (isActionError(r)) setError(r.error)
            else router.push(`/inventario/${r.id}`)
          })
        }}
        className="space-y-6"
      >
        <MensajeError>{error}</MensajeError>
        <div className="space-y-2">
          <Label htmlFor="nombre">Nombre</Label>
          <Input id="nombre" name="nombre" placeholder="PEAD virgen 0,02 · Molido cristal · Tinta blanca" required minLength={2} maxLength={120} autoFocus />
        </div>
        <div className="grid gap-4 sm:grid-cols-[1fr_140px]">
          <div className="space-y-2">
            <Label htmlFor="categoria">Categoría</Label>
            <Selector id="categoria" name="categoria" required defaultValue="">
              <option value="" disabled>
                Elige la categoría
              </option>
              {Object.entries(CATEGORIA_MATERIAL).map(([v, t]) => (
                <option key={v} value={v}>
                  {t}
                </option>
              ))}
            </Selector>
          </div>
          <div className="space-y-2">
            <Label htmlFor="unidad">Unidad</Label>
            <Input id="unidad" name="unidad" value={unidad} onChange={(e) => setUnidad(e.target.value)} list="unidades" required maxLength={12} />
            <datalist id="unidades">
              {["kg", "litros", "unidades", "rollos"].map((u) => (
                <option key={u} value={u} />
              ))}
            </datalist>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="stockMinimo">Stock mínimo</Label>
            <CampoNumero id="stockMinimo" valor={minimo} onCambio={setMinimo} unidad={unidad || undefined} placeholder="100" />
            <p className="-mt-3 text-xs text-muted">Por debajo, Almacén y Gerencia reciben un aviso.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="costoPromedio">Costo inicial por {unidad || "unidad"}</Label>
            <CampoNumero id="costoPromedio" valor={costo} onCambio={setCosto} unidad="Bs" decimales={4} placeholder="0" />
            <p className="-mt-3 text-xs text-muted">Se actualiza solo con cada entrada que tenga costo.</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button type="submit" disabled={pendiente}>
            {pendiente ? "Guardando…" : "Crear material"}
          </Button>
          <Button type="button" variant="ghost" onClick={() => router.back()}>
            Cancelar
          </Button>
        </div>
      </form>
    </div>
  )
}
