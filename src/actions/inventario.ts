"use server"

import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { ajusteSchema, entradaSchema, salidaSchema, materialSchema } from "@/lib/schemas/inventario"
import { revalidatePath } from "next/cache"
import { TipoMovimiento, CategoriaMaterial } from "@prisma/client"

async function getStock(materialId: string) {
  const movimientos = await prisma.movimientoInventario.findMany({
    where: { materialId },
    select: { tipo: true, cantidad: true },
  })

  let stock = 0
  for (const m of movimientos) {
    const cant = Number(m.cantidad)
    if (m.tipo === "ENTRADA") stock += cant
    if (m.tipo === "SALIDA") stock -= cant
    if (m.tipo === "AJUSTE") stock += cant
  }
  return stock
}

export async function crearMaterial(formData: FormData) {
  const session = await auth()
  if (!session?.user) throw new Error("No autorizado")

  const rol = (session.user as any).rol
  if (rol !== "ALMACEN" && rol !== "ADMIN" && rol !== "GERENCIA") {
    throw new Error("Sin permisos para registrar materiales")
  }

  const raw = Object.fromEntries(formData.entries())
  const parsed = materialSchema.safeParse(raw)

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0].message)
  }

  const { nombre, categoria, unidad, stockMinimo, costoPromedio } = parsed.data

  const nuevo = await prisma.material.create({
    data: {
      nombre,
      categoria: categoria as CategoriaMaterial,
      unidad: unidad || "kg",
      stockMinimo,
      costoPromedio,
    },
  })

  revalidatePath("/inventario")
  return nuevo
}

export async function registrarEntrada(formData: FormData) {
  const session = await auth()
  if (!session?.user) throw new Error("No autorizado")

  const rol = (session.user as any).rol
  if (rol !== "ALMACEN" && rol !== "ADMIN" && rol !== "GERENCIA") {
    throw new Error("Sin permisos")
  }

  const raw = Object.fromEntries(formData.entries())
  const parsed = entradaSchema.safeParse(raw)

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0].message)
  }

  const { materialId, cantidad, turno, proveedor, lote, costoUnitario } = parsed.data

  await prisma.movimientoInventario.create({
    data: {
      materialId,
      tipo: TipoMovimiento.ENTRADA,
      cantidad,
      turno,
      proveedor: proveedor || null,
      lote: lote || null,
      costoUnitario: costoUnitario || null,
      userId: (session.user as any).id,
    },
  })

  // Actualizar costo promedio simple si hay costo unitario
  if (costoUnitario) {
    const material = await prisma.material.findUnique({ where: { id: materialId } })
    if (material) {
      await prisma.material.update({
        where: { id: materialId },
        data: { costoPromedio: costoUnitario },
      })
    }
  }

  revalidatePath("/inventario")
}

export async function registrarSalida(formData: FormData) {
  const session = await auth()
  if (!session?.user) throw new Error("No autorizado")

  const rol = (session.user as any).rol
  if (rol !== "ALMACEN" && rol !== "ADMIN" && rol !== "GERENCIA") {
    throw new Error("Sin permisos")
  }

  const raw = Object.fromEntries(formData.entries())
  const parsed = salidaSchema.safeParse(raw)

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0].message)
  }

  const { materialId, cantidad, turno, motivo, ordenId } = parsed.data

  const stockActual = await getStock(materialId)
  if (stockActual < cantidad) {
    throw new Error(`Stock insuficiente. Disponible: ${stockActual.toFixed(2)} kg`)
  }

  await prisma.movimientoInventario.create({
    data: {
      materialId,
      tipo: TipoMovimiento.SALIDA,
      cantidad,
      turno,
      motivo,
      ordenId: ordenId || null,
      userId: (session.user as any).id,
    },
  })

  revalidatePath("/inventario")
}

export async function registrarAjuste(formData: FormData) {
  const session = await auth()
  if (!session?.user) throw new Error("No autorizado")

  const rol = (session.user as any).rol
  if (rol !== "ALMACEN" && rol !== "ADMIN" && rol !== "GERENCIA") {
    throw new Error("Sin permisos")
  }

  const raw = Object.fromEntries(formData.entries())
  const parsed = ajusteSchema.safeParse(raw)

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0].message)
  }

  const { materialId, cantidad, turno, motivo } = parsed.data

  await prisma.movimientoInventario.create({
    data: {
      materialId,
      tipo: TipoMovimiento.AJUSTE,
      cantidad,
      turno,
      motivo,
      userId: (session.user as any).id,
    },
  })

  revalidatePath("/inventario")
}
