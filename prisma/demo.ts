/**
 * Datos de demostración para ver la app con contenido: clientes, órdenes, producción,
 * entregas, pagos, vales de salida y costos de turno. Ejecutar DESPUÉS del seed:
 *   npx prisma db seed && npm run db:demo
 * Es solo para desarrollo: agrega datos cada vez que se corre.
 */
import { PrismaClient, Area, Turno, TipoMovimiento } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) })

const hace = (dias: number, hora = 12) => {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() - dias)
  d.setUTCHours(hora, 0, 0, 0)
  return d
}

async function main() {
  const [admin, operador, almacen] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { email: "admin@planta.local" } }),
    prisma.user.findUniqueOrThrow({ where: { email: "operador@planta.local" } }),
    prisma.user.findUniqueOrThrow({ where: { email: "almacen@planta.local" } }),
  ])
  const mat = async (prefijo: string) => prisma.material.findFirstOrThrow({ where: { nombre: { startsWith: prefijo } } })
  const [pead, pebd, reciclado, tinta, azul, solvente] = await Promise.all([
    mat("Polietileno Alta"), mat("Polietileno Baja"), mat("Molido Reciclado Cristal"), mat("Tinta"), mat("Masterbatch Pigmento Azul"), mat("Solvente"),
  ])

  // Entradas de material
  const entradas: [typeof pead, number, number][] = [[pead, 900, 15.2], [pebd, 700, 14.8], [reciclado, 800, 8.5], [tinta, 120, 36], [azul, 60, 32.5], [solvente, 150, 18]]
  for (const [m, cantidad, costo] of entradas) {
    await prisma.movimientoInventario.create({
      data: { materialId: m.id, tipo: TipoMovimiento.ENTRADA, cantidad, costoUnitario: costo, turno: Turno.MANANA, proveedor: "Proveedor Demo", lote: "L-2026-11", userId: almacen.id, createdAt: hace(20) },
    })
  }

  const clientes = await Promise.all(
    [
      { nombre: "Gabriela Quispe", telefono: "70712345", diasCredito: 15 },
      { nombre: "Aldo Guardia", telefono: "71234567", diasCredito: 30 },
      { nombre: "Comercial Los Andes", telefono: "72345678", diasCredito: 15 },
      { nombre: "Supermercado Fidalga", telefono: "73456789", diasCredito: 30 },
    ].map((c) => prisma.cliente.create({ data: c }))
  )
  const [gabriela, aldo, andes, fidalga] = clientes

  const orden = (clienteId: string, producto: string, medida: string, kg: number, precio: number, estado: string, dias: number) =>
    prisma.ordenTrabajo.create({ data: { clienteId, producto, medida, kgPedidos: kg, precioUnitario: precio, estado, fechaIngreso: hace(dias), mezclaNota: "70% reciclado + 30% virgen" } })

  const otA = await orden(gabriela.id, "Bolsa camiseta", "40x60", 800, 12, "ABIERTA", 6)
  const otB = await orden(aldo.id, "Bolsa rollo", "30x40", 500, 14, "ABIERTA", 9)
  const otC = await orden(andes.id, "Bolsa tipo riñón", "50x70", 1000, 11.5, "ENTREGADA", 70)
  const otD = await orden(fidalga.id, "Bolsa camiseta reforzada", "45x60", 300, 13, "ENTREGADA", 25)
  const otE = await orden(gabriela.id, "Bolsa camiseta", "35x50", 300, 12, "ENTREGADA", 45)

  const registro = (ordenId: string, area: Area, turno: Turno, entrada: number, buenos: number, merma: number, rechazado: number, dias: number, userId = operador.id) =>
    prisma.registroProduccion.create({ data: { ordenId, area, turno, kgEntrada: entrada, kgBuenos: buenos, kgMerma: merma, kgRechazado: rechazado, horasMaquina: 6, userId, createdAt: hace(dias, turno === Turno.MANANA ? 10 : 16) } })

  // OT A: 700 de 800 kg terminados
  await registro(otA.id, Area.EXTRUSION, Turno.MANANA, 800, 760, 30, 10, 5)
  await registro(otA.id, Area.IMPRESION, Turno.TARDE, 760, 730, 25, 5, 3)
  await registro(otA.id, Area.CONFECCION, Turno.MANANA, 730, 700, 25, 5, 1)
  // OT B: completa (lista para cerrar)
  await registro(otB.id, Area.EXTRUSION, Turno.MANANA, 540, 515, 20, 5, 7)
  await registro(otB.id, Area.CONFECCION, Turno.TARDE, 515, 500, 10, 5, 4)
  // Órdenes ya entregadas (producción histórica)
  await registro(otC.id, Area.CONFECCION, Turno.MANANA, 1080, 1000, 60, 20, 68)
  await registro(otD.id, Area.CONFECCION, Turno.TARDE, 320, 300, 15, 5, 24)
  await registro(otE.id, Area.CONFECCION, Turno.MANANA, 320, 300, 15, 5, 46)

  // Vales de salida ligados a las órdenes (alimentan el costo de materia prima y tintas)
  const salida = (m: typeof pead, cantidad: number, ordenId: string, motivo: string, dias: number) =>
    prisma.movimientoInventario.create({ data: { materialId: m.id, tipo: TipoMovimiento.SALIDA, cantidad, costoUnitario: m.costoPromedio, turno: Turno.MANANA, motivo, ordenId, userId: almacen.id, createdAt: hace(dias) } })
  await salida(reciclado, 560, otA.id, "Carga Extrusora 1", 5)
  await salida(pead, 240, otA.id, "Carga Extrusora 1", 5)
  await salida(tinta, 18, otA.id, "Tinta a impresora", 3)
  await salida(pebd, 500, otB.id, "Carga Extrusora 2", 7)
  // Dejan dos insumos bajo el mínimo para ver las alertas
  await salida(tinta, 80, otB.id, "Tinta a impresora", 2)
  await salida(azul, 45, otB.id, "Pigmento", 2)

  // Entregas y pagos (con deudas vencidas y vigentes)
  await prisma.entrega.create({ data: { ordenId: otC.id, kgEntregados: 1000, bultos: 40, notaRemision: "1021", fecha: hace(65) } })
  await prisma.pago.create({ data: { clienteId: andes.id, monto: 6000, medio: "TRANSFERENCIA", referencia: "Dep. BNB", fecha: hace(50) } })
  await prisma.entrega.create({ data: { ordenId: otD.id, kgEntregados: 300, bultos: 12, notaRemision: "1034", fecha: hace(20) } })
  await prisma.entrega.create({ data: { ordenId: otE.id, kgEntregados: 300, bultos: 12, notaRemision: "1030", fecha: hace(40) } })
  await prisma.pago.create({ data: { clienteId: gabriela.id, monto: 1000, medio: "EFECTIVO", referencia: "Pago en efectivo", fecha: hace(30) } })
  await prisma.pago.create({ data: { clienteId: fidalga.id, monto: 1500, medio: "QR", referencia: "QR BCP", fecha: hace(8) } })

  // Mano de obra y energía por turno
  for (let d = 1; d <= 10; d++) {
    for (const turno of [Turno.MANANA, Turno.TARDE]) {
      await prisma.costoTurno.upsert({
        where: { fecha_turno: { fecha: new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate() - d)), turno } },
        update: {},
        create: { fecha: new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate() - d)), turno, manoObra: 420 + d * 5, energia: 170 + d * 2 },
      })
    }
  }
  void admin
  console.log("Datos de demostración creados.")
}

main().catch((e) => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
