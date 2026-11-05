"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { crearOrdenTrabajo } from "@/actions/produccion"
import { isActionError } from "@/lib/action-result"
import { formatBs, leerNumero, numeroParaEnviar } from "@/lib/formato"
import { Button } from "@/components/ui/button"
import { CampoNumero } from "@/components/ui/campo-numero"
import { Encabezado } from "@/components/ui/encabezado"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { MensajeError } from "@/components/ui/mensaje"
import { Selector } from "@/components/ui/selector"

export function NuevaOrdenForm({
  clientes,
  clienteInicial,
  mezclas,
}: {
  clientes: { id: string; nombre: string }[]
  clienteInicial?: string
  mezclas: string[]
}) {
  const router = useRouter()
  const [pendiente, iniciar] = useTransition()
  const [error, setError] = useState("")
  const [kg, setKg] = useState("")
  const [precio, setPrecio] = useState("")
  const total = (leerNumero(kg) || 0) * (leerNumero(precio, 4) || 0)

  return (
    <div className="max-w-2xl space-y-8">
      <Encabezado
        miga={[
          { href: "/produccion", texto: "Producción" },
          { href: "/produccion/ordenes", texto: "Órdenes" },
        ]}
        titulo="Nueva orden de trabajo"
        descripcion="Un pedido del cliente para producir."
      />

      <form
        onSubmit={(e) => {
          e.preventDefault()
          setError("")
          const fd = new FormData(e.currentTarget)
          fd.set("kgPedidos", numeroParaEnviar(kg))
          fd.set("precioUnitario", numeroParaEnviar(precio, 4))
          iniciar(async () => {
            const r = await crearOrdenTrabajo(fd)
            if (isActionError(r)) setError(r.error)
            else router.push(`/produccion/ordenes/${r.id}`)
          })
        }}
        className="space-y-6"
      >
        <MensajeError>{error}</MensajeError>

        <div className="space-y-2">
          <div className="flex items-baseline justify-between gap-3">
            <Label htmlFor="clienteId">Cliente</Label>
            <Link href="/produccion/clientes/nuevo?volver=orden" className="text-[13px] font-semibold text-brand-ink hover:underline">
              + Cliente nuevo
            </Link>
          </div>
          <Selector id="clienteId" name="clienteId" required defaultValue={clienteInicial ?? ""}>
            <option value="" disabled>
              {clientes.length === 0 ? "Primero crea un cliente" : "Elige el cliente"}
            </option>
            {clientes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </Selector>
        </div>

        <div className="grid gap-4 sm:grid-cols-[1fr_200px]">
          <div className="space-y-2">
            <Label htmlFor="producto">Producto</Label>
            <Input id="producto" name="producto" placeholder="Bolsa camiseta, rollo de film…" required maxLength={120} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="medida">Medida (opcional)</Label>
            <Input id="medida" name="medida" placeholder="40x60 cm, cal. 1,2" maxLength={60} />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="kgPedidos">Kg pedidos</Label>
            <CampoNumero id="kgPedidos" valor={kg} onCambio={setKg} unidad="kg" placeholder="2.000" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="precioUnitario">Precio por kg</Label>
            <CampoNumero id="precioUnitario" valor={precio} onCambio={setPrecio} unidad="Bs" decimales={4} placeholder="14,50" required />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="mezclaNota">Mezcla (opcional)</Label>
          <Input id="mezclaNota" name="mezclaNota" list="mezclas" placeholder="50% termo + 50% stretch" maxLength={120} autoComplete="off" />
          <datalist id="mezclas">
            {mezclas.map((m) => (
              <option key={m} value={m} />
            ))}
          </datalist>
          <p className="text-xs text-muted">La decide el operador; se muestra al registrar producción.</p>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg bg-elevated px-4 py-3">
          <p className="text-sm text-subdued">Valor del pedido</p>
          <p className="text-xl font-extrabold tabular-nums text-brand-ink">{formatBs(total)}</p>
        </div>

        <div className="flex gap-2">
          <Button type="submit" disabled={pendiente || clientes.length === 0}>
            {pendiente ? "Creando…" : "Crear orden"}
          </Button>
          <Button type="button" variant="ghost" onClick={() => router.back()}>
            Cancelar
          </Button>
        </div>
      </form>
    </div>
  )
}
