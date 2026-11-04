"use server"

import { getSessionUser } from "@/lib/session"
import { prisma } from "@/lib/prisma"
import { ajusteSchema, entradaSchema, salidaSchema, materialSchema } from "@/lib/schemas/inventario"
import { revalidatePath } from "next/cache"
import { fail } from "@/lib/action-result"
import { TipoMovimiento, CategoriaMaterial, Prisma } from "@prisma/client"

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
    const material = await tx.material.findUnique({ where: { id: materialId }, select: { costoPromedio: true } })
    await tx.movimientoInventario.create({
      data: {
        materialId,
        tipo: TipoMovimiento.SALIDA,
        cantidad,
        costoUnitario: material?.costoPromedio ?? null,
        turno,
        motivo,
        ordenId: ordenId || null,
        userId,
      },
    })
  })
  if (resultado) return resultado

  revalidatePath("/inventario")
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
    if (cantidad < 0) {
      const stockActual = await getStock(tx, materialId)
      if (stockActual + cantidad < 0) {
        return fail(`El ajuste dejaría el stock en negativo. Disponible: ${stockActual.toFixed(2)} kg`)
      }
    }
    await tx.movimientoInventario.create({
      data: {
        materialId,
        tipo: TipoMovimiento.AJUSTE,
        cantidad,
        turno,
        motivo,
        userId,
      },
    })
  })
  if (resultado) return resultado

  revalidatePath("/inventario")
}
