import { PrismaClient, Rol, CategoriaMaterial, Turno, TipoMovimiento } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
  const password = await bcrypt.hash("123456", 10)

  const admin = await prisma.user.upsert({
    where: { email: "admin@planta.local" },
    update: {},
    create: {
      nombre: "Administrador",
      email: "admin@planta.local",
      passwordHash: password,
      rol: Rol.ADMIN,
      activo: true,
    },
  })

  await prisma.user.upsert({
    where: { email: "almacen@planta.local" },
    update: {},
    create: {
      nombre: "Almacén",
      email: "almacen@planta.local",
      passwordHash: password,
      rol: Rol.ALMACEN,
      activo: true,
    },
  })

  await prisma.user.upsert({
    where: { email: "operador@planta.local" },
    update: {},
    create: {
      nombre: "Operador",
      email: "operador@planta.local",
      passwordHash: password,
      rol: Rol.OPERADOR,
      activo: true,
    },
  })

  await prisma.user.upsert({
    where: { email: "gerencia@planta.local" },
    update: {},
    create: {
      nombre: "Gerencia",
      email: "gerencia@planta.local",
      passwordHash: password,
      rol: Rol.GERENCIA,
      activo: true,
    },
  })

  // Materiales típicos de fábrica de bolsas plásticas y reciclado
  const materialesCatalogo = [
    {
      nombre: "Polietileno Alta Densidad (PEAD) Virgen 0.02",
      categoria: CategoriaMaterial.VIRGEN,
      unidad: "kg",
      stockMinimo: 300,
      costoPromedio: 15.2,
      stockInicial: 1200,
    },
    {
      nombre: "Polietileno Baja Densidad (PEBD) Virgen Tubular",
      categoria: CategoriaMaterial.VIRGEN,
      unidad: "kg",
      stockMinimo: 250,
      costoPromedio: 14.8,
      stockInicial: 850,
    },
    {
      nombre: "Molido Reciclado Cristal Limpio (Pebetizado)",
      categoria: CategoriaMaterial.RECICLADO,
      unidad: "kg",
      stockMinimo: 200,
      costoPromedio: 8.5,
      stockInicial: 600,
    },
    {
      nombre: "Molido Reciclado Negro (Bolsas Basura / Consorcio)",
      categoria: CategoriaMaterial.RECICLADO,
      unidad: "kg",
      stockMinimo: 150,
      costoPromedio: 6.8,
      stockInicial: 70, // Bajo stock para mostrar alerta
    },
    {
      nombre: "Masterbatch Pigmento Blanco Dióxido",
      categoria: CategoriaMaterial.MASTER_BATCH,
      unidad: "kg",
      stockMinimo: 50,
      costoPromedio: 28.0,
      stockInicial: 125,
    },
    {
      nombre: "Masterbatch Pigmento Azul Ultramar",
      categoria: CategoriaMaterial.MASTER_BATCH,
      unidad: "kg",
      stockMinimo: 30,
      costoPromedio: 32.5,
      stockInicial: 45,
    },
    {
      nombre: "Tinta Flexográfica Blanca al Solvente",
      categoria: CategoriaMaterial.TINTA,
      unidad: "kg",
      stockMinimo: 40,
      costoPromedio: 36.0,
      stockInicial: 15, // Alerta
    },
    {
      nombre: "Solvente Flexográfico Diluyente / Retardante",
      categoria: CategoriaMaterial.SOLVENTE,
      unidad: "kg",
      stockMinimo: 60,
      costoPromedio: 18.0,
      stockInicial: 180,
    },
  ]

  for (const m of materialesCatalogo) {
    const mat = await prisma.material.upsert({
      where: { nombre: m.nombre },
      update: {},
      create: {
        nombre: m.nombre,
        categoria: m.categoria,
        unidad: m.unidad,
        stockMinimo: m.stockMinimo,
        costoPromedio: m.costoPromedio,
      },
    })

    // Chequear si ya tiene movimiento inicial
    const countMov = await prisma.movimientoInventario.count({ where: { materialId: mat.id } })
    if (countMov === 0 && m.stockInicial > 0) {
      await prisma.movimientoInventario.create({
        data: {
          materialId: mat.id,
          tipo: TipoMovimiento.ENTRADA,
          cantidad: m.stockInicial,
          costoUnitario: m.costoPromedio,
          turno: Turno.MANANA,
          motivo: "Inventario Inicial de Apertura",
          proveedor: "Braskem / YPFB",
          lote: "LOTE-INI-01",
          userId: admin.id,
        },
      })
    }
  }

  console.log("Seed completado exitosamente: usuarios y materiales de fábrica creados.")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
