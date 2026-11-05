import { prisma } from "@/lib/prisma"
import { calcularCartera, type CarteraCliente } from "@/lib/cartera-calculo"

export * from "@/lib/cartera-calculo"

export async function consultarCartera(hoy = new Date()): Promise<CarteraCliente[]> {
  const clientes = await prisma.cliente.findMany({
    orderBy: { nombre: "asc" },
    select: {
      id: true,
      nombre: true,
      telefono: true,
      diasCredito: true,
      ordenes: { select: { numero: true, precioUnitario: true, entregas: { select: { fecha: true, kgEntregados: true } } } },
      pagos: { select: { monto: true } },
      notasCredito: { where: { anuladaEn: null }, select: { monto: true } },
    },
  })
  return clientes.map((c) => calcularCartera(c, hoy))
}
