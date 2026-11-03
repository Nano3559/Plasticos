import { prisma } from "@/lib/prisma"
import { RegistroForm } from "./registro-form"

export default async function RegistroPage() {
  const ordenes = await prisma.ordenTrabajo.findMany({
    where: { estado: { in: ["ABIERTA", "EN_PROCESO"] } },
    orderBy: { fechaIngreso: "desc" },
    include: {
      cliente: { select: { id: true, nombre: true } },
      registros: { select: { kgBuenos: true, kgMerma: true } },
    },
  })

  // Formatear datos para el cliente
  const ordenesFormateadas = ordenes.map((ot) => {
    const totalFabricado = ot.registros.reduce((acc, r) => acc + Number(r.kgBuenos), 0)
    return {
      id: ot.id,
      numero: ot.numero,
      producto: ot.producto,
      medida: ot.medida,
      mezclaNota: ot.mezclaNota,
      kgPedidos: Number(ot.kgPedidos),
      totalFabricado,
      clienteNombre: ot.cliente.nombre,
    }
  })

  return <RegistroForm ordenes={ordenesFormateadas} />
}
