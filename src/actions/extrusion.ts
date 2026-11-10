"use server"

import { createHash } from "node:crypto"
import { Prisma } from "@prisma/client"
import { revalidatePath } from "next/cache"
import { getSessionUser } from "@/lib/session"
import { prisma } from "@/lib/prisma"
import { analizarExtrusion, metricasExtrusion } from "@/lib/extrusion"

export async function importarExtrusion(form: FormData) {
  const user = await getSessionUser()
  if (!user || !["ADMIN","GERENCIA"].includes(user.rol) || user.debeCambiarClave) return { error:"Sin permisos para importar" }
  const file = form.get("archivo"), ordenId = String(form.get("ordenId")??""), confirmar = form.get("confirmar") === "si"
  if (!(file instanceof File) || !/\.xlsx?$/i.test(file.name) || !file.size || file.size > 4*1024*1024) return {error:"Selecciona un Excel .xls/.xlsx de hasta 4 MB"}
  try {
    const datos = analizarExtrusion(new Uint8Array(await file.arrayBuffer()), String(form.get("hoja")??"").trim() || undefined)
    const orden = await prisma.ordenTrabajo.findUnique({where:{id:ordenId},include:{cliente:true}})
    if (!orden || orden.estado !== "ABIERTA") return {error:"Selecciona una OT abierta"}
    const ref = orden.refExterna ?? String(orden.numero)
    const norm = (s:string)=>s.trim().toLocaleUpperCase("es")
    if (norm(ref)!==norm(datos.ot) || norm(orden.cliente.nombre)!==norm(datos.cliente) || norm(orden.producto)!==norm(datos.producto)) return {error:`El Excel (OT ${datos.ot}, ${datos.cliente}, ${datos.producto}) no coincide con la OT seleccionada (${ref}, ${orden.cliente.nombre}, ${orden.producto}). Corrige la selección o el archivo.`}
    if (Math.abs(Number(orden.kgPedidos)-datos.pedido)>0.02) return {error:"La cantidad pedida del Excel no coincide con la OT"}
    const huella = createHash("sha256").update(JSON.stringify(datos)).digest("hex")
    const anterior = await prisma.parteExtrusion.findFirst({where:{ordenId},orderBy:[{createdAt:"desc"},{id:"desc"}]})
    if (!confirmar) return {datos,huella,revision:anterior?.id??"",reemplaza:!!anterior}
    if (String(form.get("huella"))!==huella) return {error:"El archivo cambió; vuelve a analizarlo"}
    const resultado = await prisma.$transaction(async tx=>{
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${ordenId}))`
      const actual = await tx.parteExtrusion.findFirst({where:{ordenId},orderBy:[{createdAt:"desc"},{id:"desc"}]})
      if (actual?.huella===huella) return "Este parte ya está importado; no se duplicaron datos ni avisos"
      if ((actual?.id??"")!==String(form.get("revision")??"")) throw new Error("Otro usuario importó una versión: vuelve a analizar el archivo")
      if (await tx.parteExtrusion.findUnique({where:{ordenId_huella:{ordenId,huella}}})) throw new Error("Esta versión ya existe en el historial. Importa una versión actualizada")
      const vigente = await tx.ordenTrabajo.findUnique({where:{id:ordenId}})
      if (!vigente || vigente.estado!=="ABIERTA") throw new Error("La OT ya no está abierta")
      await tx.parteExtrusion.create({data:{ordenId,huella,archivo:file.name.slice(0,200),hoja:datos.hoja,datos:datos as unknown as Prisma.InputJsonValue,autorId:user.id}})
      const destinatarios = await tx.user.findMany({where:{activo:true,rol:{in:["ADMIN","GERENCIA","ALMACEN"]},id:{not:user.id}},select:{id:true}})
      const m = metricasExtrusion(datos.filas,datos.pedido)
      await tx.notificacion.createMany({data:destinatarios.map(u=>({userId:u.id,tipo:"EXTRUSION" as const,titulo:`Extrusión OT ${datos.ot}: ${m.buenos.toFixed(2)} kg`,detalle:[`${user.name} importó ${datos.hoja}.`,...datos.avisos].join(" "),href:`/produccion/extrusion?ot=${ordenId}`}))})
      return "Parte importado. Las métricas usan esta versión; el historial anterior se conserva."
    })
    revalidatePath("/produccion/extrusion")
    revalidatePath(`/produccion/ordenes/${ordenId}`)
    revalidatePath("/notificaciones")
    return {mensaje:resultado}
  } catch(e) { console.error("Importación extrusión",e instanceof Error?e.message:"Error"); return {error:e instanceof Error && !/prisma|database|connect|relation|column/i.test(e.message)?e.message:"No se pudo importar. Verifica la conexión y las migraciones de la base."} }
}
