import { prisma } from "@/lib/prisma"
import { stockPorMaterial } from "@/lib/stock"
import { SalidaForm } from "./salida-form"

export const dynamic = "force-dynamic"

export default async function SalidaPage() {
  const materiales = await prisma.material.findMany({
    orderBy: { nombre: "asc" },
  })

  const stock = await stockPorMaterial()
  const materialesConStock = materiales.map((m) => ({
      id: m.id,
      nombre: m.nombre,
      categoria: m.categoria,
      unidad: m.unidad,
      stock: stock.get(m.id) ?? 0,
  }))

  const ordenes = await prisma.ordenTrabajo.findMany({
    where: { estado: "ABIERTA" },
    include: { cliente: true },
    orderBy: { numero: "desc" },
    take: 20,
  })

  const serializedOrdenes = ordenes.map((ot) => ({
    id: ot.id,
    numero: ot.numero,
    producto: ot.producto,
    clienteNombre: ot.cliente.nombre,
  }))

  return <SalidaForm materiales={materialesConStock} ordenes={serializedOrdenes} />
}
