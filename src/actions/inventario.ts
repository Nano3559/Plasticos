"use server"

import { getSessionUser } from "@/lib/session"
import { prisma } from "@/lib/prisma"
import { ajusteSchema, entradaSchema, salidaSchema, materialSchema } from "@/lib/schemas/inventario"
import { revalidatePath } from "next/cache"
import { fail } from "@/lib/action-result"
import { TipoMovimiento, CategoriaMaterial, Prisma } from "@prisma/client"
import { avisarMovimiento } from "@/lib/avisos"

type Tx = Prisma.TransactionClient

/** Stock = ENTRADA − SALIDA ± AJUSTE, calculado en la base de datos. */
async function getStock(db: Tx | typeof prisma, materialId: string) {
  const grupos = await db.movimientoInventario.groupBy({
    by: ["tipo"],
    where: { materialId },
    _sum: { cantidad: true },
  })
  let stock = 0
  for (const g of grupos) {
    const cant = Number(g._sum.cantidad ?? 0)
    if (g.tipo === "SALIDA") stock -= cant
    else stock += cant // ENTRADA suma; AJUSTE ya trae su signo
  }
  return stock
}

/** Serializa los movimientos de un mismo material para que dos salidas simultáneas no dejen stock negativo. */
async function bloquearMaterial(tx: Tx, materialId: string) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${materialId}))`
}

export async function crearMaterial(formData: FormData) {
  const user = await getSessionUser()
  if (!user) return fail("No autorizado")

  const rol = user.rol
  if (rol !== "ALMACEN" && rol !== "ADMIN" && rol !== "GERENCIA") {
    return fail("Sin permisos para registrar materiales")
  }

  const raw = Object.fromEntries(formData.entries())
  const parsed = materialSchema.safeParse(raw)

  if (!parsed.success) {
    return fail(parsed.error.issues[0].message)
  }

  const { nombre, categoria, unidad, stockMinimo, costoPromedio } = parsed.data

  const existe = await prisma.material.findFirst({ where: { nombre: { equals: nombre.trim(), mode: "insensitive" } }, select: { id: true } })
  if (existe) return fail("Ya existe un material con ese nombre")

  const nuevo = await prisma.material.create({
    data: {
      nombre: nombre.trim(),
      categoria: categoria as CategoriaMaterial,
      unidad: unidad?.trim() || "kg",
      stockMinimo,
      costoPromedio,
    },
    select: { id: true },
  })

  revalidatePath("/inventario")
  return { ok: true as const, id: nuevo.id }
}

export async function registrarEntrada(formData: FormData) {
  const user = await getSessionUser()
  if (!user) return fail("No autorizado")

  const rol = user.rol
  if (rol !== "ALMACEN" && rol !== "ADMIN" && rol !== "GERENCIA") {
    return fail("Sin permisos")
  }

  const raw = Object.fromEntries(formData.entries())
  const parsed = entradaSchema.safeParse(raw)

  if (!parsed.success) {
    return fail(parsed.error.issues[0].message)
  }

  const { materialId, cantidad, turno, proveedor, lote, costoUnitario } = parsed.data

  const userId = user.id

  await prisma.$transaction(async (tx) => {
    await bloquearMaterial(tx, materialId)

    // Costo promedio ponderado: (stock × costo actual + kg nuevos × costo nuevo) ÷ stock total
    if (costoUnitario) {
      const material = await tx.material.findUnique({ where: { id: materialId } })
      if (material) {
        const stockPrevio = Math.max(0, await getStock(tx, materialId))
        const costoPrevio = Number(material.costoPromedio)
        const totalKg = stockPrevio + cantidad
        const nuevoPromedio =
          stockPrevio > 0 && costoPrevio > 0
            ? (stockPrevio * costoPrevio + cantidad * costoUnitario) / totalKg
            : costoUnitario
        await tx.material.update({
          where: { id: materialId },
          data: { costoPromedio: nuevoPromedio },
        })
      }
    }

    await tx.movimientoInventario.create({
      data: {
        materialId,
        tipo: TipoMovimiento.ENTRADA,
        cantidad,
        turno,
        proveedor: proveedor || null,
        lote: lote || null,
        costoUnitario: costoUnitario || null,
        userId,
      },
    })
  })

  revalidatePath("/inventario")
  revalidatePath(`/inventario/${materialId}`)
  return { ok: true as const }
}

export async function registrarSalida(formData: FormData) {
  const user = await getSessionUser()
  if (!user) return fail("No autorizado")

  const rol = user.rol
  if (rol !== "ALMACEN" && rol !== "ADMIN" && rol !== "GERENCIA") {
    return fail("Sin permisos")
  }

  const raw = Object.fromEntries(formData.entries())
  const parsed = salidaSchema.safeParse(raw)

  if (!parsed.success) {
    return fail(parsed.error.issues[0].message)
  }

  const { materialId, cantidad, turno, motivo, ordenId } = parsed.data

  const userId = user.id

  const resultado = await prisma.$transaction(async (tx) => {
    await bloquearMaterial(tx, materialId)
    const stockActual = await getStock(tx, materialId)
    if (stockActual < cantidad) {
      return fail(`Stock insuficiente. Disponible: ${stockActual.toFixed(2)} kg`)
    }
    // El vale guarda el costo promedio vigente: el costo de la OT no cambia si después sube el precio
    const material = await tx.material.findUnique({
      where: { id: materialId },
      select: { nombre: true, unidad: true, stockMinimo: true, costoPromedio: true },
    })
    if (!material) return fail("Material no encontrado")
    const orden = ordenId
      ? await tx.ordenTrabajo.findUnique({ where: { id: ordenId }, select: { numero: true, refExterna: true } })
      : null
    const movimiento = await tx.movimientoInventario.create({
      data: {
        materialId,
        tipo: TipoMovimiento.SALIDA,
        cantidad,
        costoUnitario: material.costoPromedio,
        turno,
        motivo,
        ordenId: ordenId || null,
        userId,
      },
      select: { id: true },
    })
    await avisarMovimiento(tx, {
      movimientoId: movimiento.id,
      materialId,
      autorId: userId,
      datos: {
        tipo: "SALIDA",
        material: material.nombre,
        unidad: material.unidad,
        cantidad,
        turno,
        motivo,
        orden: orden ? `OT ${orden.refExterna ?? `#${orden.numero}`}` : null,
      },
      stock: { antes: stockActual, despues: stockActual - cantidad, minimo: Number(material.stockMinimo) },
    })
  })
  if (resultado) return resultado

  revalidatePath("/inventario")
  revalidatePath(`/inventario/${materialId}`)
  return { ok: true as const }
}

export async function registrarAjuste(formData: FormData) {
  const user = await getSessionUser()
  if (!user) return fail("No autorizado")

  const rol = user.rol
  if (rol !== "ALMACEN" && rol !== "ADMIN" && rol !== "GERENCIA") {
    return fail("Sin permisos")
  }

  const raw = Object.fromEntries(formData.entries())
  const parsed = ajusteSchema.safeParse(raw)

  if (!parsed.success) {
    return fail(parsed.error.issues[0].message)
  }

  const { materialId, cantidad, turno, motivo } = parsed.data

  const userId = user.id

  const resultado = await prisma.$transaction(async (tx) => {
    await bloquearMaterial(tx, materialId)
    const stockActual = await getStock(tx, materialId)
    if (cantidad < 0 && stockActual + cantidad < 0) {
      return fail(`El ajuste dejaría el stock en negativo. Disponible: ${stockActual.toFixed(2)} kg`)
    }
    const material = await tx.material.findUnique({
      where: { id: materialId },
      select: { nombre: true, unidad: true, stockMinimo: true },
    })
    if (!material) return fail("Material no encontrado")
    const movimiento = await tx.movimientoInventario.create({
      data: {
        materialId,
        tipo: TipoMovimiento.AJUSTE,
        cantidad,
        turno,
        motivo,
        userId,
      },
      select: { id: true },
    })
    await avisarMovimiento(tx, {
      movimientoId: movimiento.id,
      materialId,
      autorId: userId,
      datos: { tipo: "AJUSTE", material: material.nombre, unidad: material.unidad, cantidad, turno, motivo },
      stock: { antes: stockActual, despues: stockActual + cantidad, minimo: Number(material.stockMinimo) },
    })
  })
  if (resultado) return resultado

  revalidatePath("/inventario")
  revalidatePath(`/inventario/${materialId}`)
  return { ok: true as const }
}
