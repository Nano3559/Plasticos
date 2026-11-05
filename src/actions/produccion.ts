"use server"

import { getSessionUser } from "@/lib/session"
import { prisma } from "@/lib/prisma"
import { clienteSchema, ordenTrabajoSchema, registroProduccionSchema } from "@/lib/schemas/produccion"
import { revalidatePath } from "next/cache"
import { fail } from "@/lib/action-result"
import { avisarRechazo } from "@/lib/avisos"

export async function crearCliente(formData: FormData) {
  const user = await getSessionUser()
  if (!user) return fail("No autorizado")

  const rol = user.rol
  if (rol !== "ADMIN" && rol !== "GERENCIA") return fail("Sin permisos")

  const raw = Object.fromEntries(formData.entries())
  const parsed = clienteSchema.safeParse(raw)

  if (!parsed.success) {
    return fail(parsed.error.issues[0].message)
  }

  const cliente = await prisma.cliente.create({ data: parsed.data, select: { id: true } })

  revalidatePath("/produccion/clientes")
  return { ok: true as const, id: cliente.id }
}

export async function crearOrdenTrabajo(formData: FormData) {
  const user = await getSessionUser()
  if (!user) return fail("No autorizado")

  const rol = user.rol
  if (rol !== "ADMIN" && rol !== "GERENCIA") return fail("Sin permisos")

  const raw = Object.fromEntries(formData.entries())
  const parsed = ordenTrabajoSchema.safeParse(raw)

  if (!parsed.success) {
    return fail(parsed.error.issues[0].message)
  }

  const orden = await prisma.ordenTrabajo.create({ data: parsed.data, select: { id: true } })

  revalidatePath("/produccion")
  revalidatePath("/produccion/ordenes")
  return { ok: true as const, id: orden.id }
}

export async function registrarProduccion(formData: FormData) {
  const user = await getSessionUser()
  if (!user) return fail("No autorizado")

  const rol = user.rol
  if (rol !== "OPERADOR" && rol !== "ADMIN" && rol !== "GERENCIA") {
    return fail("Sin permisos")
  }

  const raw = Object.fromEntries(formData.entries())
  const parsed = registroProduccionSchema.safeParse(raw)

  if (!parsed.success) {
    return fail(parsed.error.issues[0].message)
  }

  const { rechazoEntradaId, rechazoProveedor, rechazoLote, rechazoMotivo, rechazoNota, ...data } = parsed.data

  const orden = await prisma.ordenTrabajo.findUnique({
    where: { id: data.ordenId },
    select: { estado: true, numero: true, refExterna: true },
  })
  if (!orden) return fail("La orden de trabajo no existe")
  if (orden.estado !== "ABIERTA") return fail("La orden está cerrada. Reábrela para registrar producción.")

  // Datos del rechazo: solo en extrusión y con kg rechazados; si se eligió un lote, proveedor y lote salen de la entrada
  let rechazo: {
    rechazoEntradaId: string | null
    rechazoProveedor: string
    rechazoLote: string | null
    rechazoMotivo: string
    rechazoNota: string | null
    material: string | null
  } | null = null
  if (data.area === "EXTRUSION" && data.kgRechazado > 0) {
    if (rechazoEntradaId) {
      const entrada = await prisma.movimientoInventario.findFirst({
        where: { id: rechazoEntradaId, tipo: "ENTRADA" },
        select: { proveedor: true, lote: true, material: { select: { nombre: true } } },
      })
      if (!entrada) return fail("El lote elegido ya no existe. Elige otro o escríbelo a mano.")
      rechazo = {
        rechazoEntradaId,
        rechazoProveedor: entrada.proveedor?.trim() || rechazoProveedor || "Sin proveedor",
        rechazoLote: entrada.lote?.trim() || null,
        rechazoMotivo: rechazoMotivo!,
        rechazoNota: rechazoNota ?? null,
        material: entrada.material.nombre,
      }
    } else {
      rechazo = {
        rechazoEntradaId: null,
        rechazoProveedor: rechazoProveedor!,
        rechazoLote: rechazoLote ?? null,
        rechazoMotivo: rechazoMotivo!,
        rechazoNota: rechazoNota ?? null,
        material: null,
      }
    }
  }

  await prisma.$transaction(async (tx) => {
    const { material, ...camposRechazo } = rechazo ?? { material: null }
    await tx.registroProduccion.create({
      data: { ...data, ...camposRechazo, userId: user.id },
    })
    if (rechazo) {
      await avisarRechazo(tx, {
        autorId: user.id,
        datos: {
          kg: data.kgRechazado,
          proveedor: rechazo.rechazoProveedor,
          lote: rechazo.rechazoLote,
          material,
          motivo: rechazo.rechazoMotivo,
          turno: data.turno,
          orden: `OT ${orden.refExterna ?? `#${orden.numero}`}`,
        },
      })
    }
  })

  revalidatePath("/produccion")
  revalidatePath(`/produccion/ordenes/${data.ordenId}`)
  revalidatePath("/inventario/rechazos")
  return { ok: true as const }
}

export async function cambiarEstadoOrden(ordenId: string, estado: string) {
  const user = await getSessionUser()
  if (!user) return fail("No autorizado")

  const rol = user.rol
  if (rol !== "ADMIN" && rol !== "GERENCIA") return fail("Sin permisos")
  if (estado !== "ABIERTA" && estado !== "TERMINADA" && estado !== "ENTREGADA") return fail("Estado no válido")

  await prisma.ordenTrabajo.update({
    where: { id: ordenId },
    data: { estado },
  })

  revalidatePath("/produccion")
  revalidatePath("/produccion/ordenes")
  revalidatePath(`/produccion/ordenes/${ordenId}`)
}
