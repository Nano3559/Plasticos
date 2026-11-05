"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { registrarCostoTurno } from "@/actions/costos"
import { isActionError } from "@/lib/action-result"
import { formatBs, leerNumero, numeroParaEnviar } from "@/lib/formato"
import { hoyLocal } from "@/lib/utils"
import { useTurno } from "@/lib/use-turno"
import { Button } from "@/components/ui/button"
import { CampoNumero } from "@/components/ui/campo-numero"
import { ElegirTurno } from "@/components/ui/elegir-turno"
import { Encabezado } from "@/components/ui/encabezado"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { MensajeError } from "@/components/ui/mensaje"

export default function CostoTurnoPage() {
  const router = useRouter()
  const [pendiente, iniciar] = useTransition()
  const [error, setError] = useState("")
  const [fecha, setFecha] = useState(hoyLocal)
  const [turno, setTurno] = useTurno()
  const [manoObra, setManoObra] = useState("")
  const [energia, setEnergia] = useState("")
  const total = (leerNumero(manoObra) || 0) + (leerNumero(energia) || 0)

  return (
    <div className="max-w-2xl space-y-8">
      <Encabezado
        miga={{ href: "/costos", texto: "Costos" }}
        titulo="Costo de turno"
        descripcion="Planilla de operarios y energía de un turno. Se reparte entre las órdenes que produjeron en ese turno, según sus kg buenos. Si ya estaba cargado, se reemplaza."
      />
      <form
        onSubmit={(e) => {
          e.preventDefault()
          setError("")
          const fd = new FormData()
          fd.set("fecha", fecha)
          fd.set("turno", turno)
          fd.set("manoObra", numeroParaEnviar(manoObra))
          fd.set("energia", numeroParaEnviar(energia))
          iniciar(async () => {
            const r = await registrarCostoTurno(fd)
            if (isActionError(r)) setError(r.error)
            else {
              router.push("/costos")
              router.refresh()
            }
          })
        }}
        className="space-y-6"
      >
        <MensajeError>{error}</MensajeError>
        <div className="max-w-xs space-y-2">
          <Label htmlFor="fecha">Fecha</Label>
          <Input id="fecha" type="date" value={fecha} max={hoyLocal()} onChange={(e) => setFecha(e.target.value)} required />
        </div>
        <ElegirTurno valor={turno} onCambio={setTurno} />
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="manoObra">Mano de obra</Label>
            <CampoNumero id="manoObra" valor={manoObra} onCambio={setManoObra} unidad="Bs" grande placeholder="0" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="energia">Energía eléctrica</Label>
            <CampoNumero id="energia" valor={energia} onCambio={setEnergia} unidad="Bs" grande placeholder="0" required />
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg bg-elevated px-4 py-3">
          <p className="text-sm text-subdued">Costo del turno</p>
          <p className="text-xl font-extrabold tabular-nums text-brand-ink">{formatBs(total)}</p>
        </div>
        <div className="flex gap-2">
          <Button type="submit" disabled={pendiente || manoObra.trim() === "" || energia.trim() === ""}>
            {pendiente ? "Guardando…" : "Guardar costo del turno"}
          </Button>
          <Button type="button" variant="ghost" onClick={() => router.back()}>
            Cancelar
          </Button>
        </div>
      </form>
    </div>
  )
}
