import { prisma } from "@/lib/prisma"
import { armarResumen, type Resumen } from "@/lib/resumen-cobranzas"

export { PERIODOS, leerPeriodo } from "@/lib/resumen-cobranzas"

/** Resumen de cobranzas de un cliente (clienteId) o de todos (null). */
export async function consultarResumen(clienteId: string | null, meses: number): Promise<Resumen> {
  const clientes = await prisma.cliente.findMany({
    where: clienteId ? { id: clienteId } : undefined,
    orderBy: { nombre: "asc" },
    select: {
      id: true,
      nombre: true,
      telefono: true,
      diasCredito: true,
      ordenes: {
        select: {
          numero: true,
          producto: true,
          precioUnitario: true,
          entregas: { select: { fecha: true, kgEntregados: true, notaRemision: true } },
        },
      },
      pagos: { select: { fecha: true, monto: true, medio: true, referencia: true } },
      notasCredito: { where: { anuladaEn: null }, select: { fecha: true, monto: true, tipo: true, motivo: true, kg: true } },
    },
  })
  return armarResumen(clientes, { meses, alcance: clienteId ? "cliente" : "todos" })
}
