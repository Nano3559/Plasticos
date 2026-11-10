import { createHash } from "node:crypto"
import { Prisma } from "@prisma/client"
import { revalidatePath } from "next/cache"
import { getSessionUser } from "@/lib/session"
import { prisma } from "@/lib/prisma"
import { metricasExtrusion, type ParteExtrusionDatos } from "@/lib/extrusion"
import { ordenTrabajoSchema } from "@/lib/schemas/produccion"
import { SECCIONES_PARTE,type AreaParte } from "@/lib/secciones-produccion"

const normalizar = (s: string) => s.trim().replace(/\s+/g, " ").toLocaleUpperCase("es")

type ResultadoExtrusion = {
  error?:string; mensaje?:string; ordenId?:string; datos?:ParteExtrusionDatos;
  huella?:string; revision?:string; reemplaza?:boolean; crearOrden?:boolean;
  crearCliente?:boolean; destino?:string;
}

async function buscarCliente(db: Pick<Prisma.TransactionClient, "cliente">, nombre: string) {
  const clientes = await db.cliente.findMany({where:{nombre:{equals:nombre,mode:"insensitive"}},take:2,select:{id:true,nombre:true}})
  if(clientes.length>1) throw new Error("Hay varios clientes con ese nombre. Selecciona una OT existente para evitar asignar datos al cliente incorrecto.")
  return clientes[0]??null
}

async function buscarOrden(db: Pick<Prisma.TransactionClient,"ordenTrabajo">, clienteId:string, referencia:string) {
  const numero = /^\d+$/.test(referencia) && Number(referencia)<=2147483647 ? Number(referencia) : null
  const ordenes = await db.ordenTrabajo.findMany({
    where:{clienteId,OR:[{refExterna:{equals:referencia,mode:"insensitive"}},...(numero!==null?[{numero,refExterna:null}]:[])]},
    include:{cliente:true},take:2,
  })
  if(ordenes.length>1) throw new Error("Hay varias OT con ese número para el cliente. Selecciona la OT existente de forma manual.")
  return ordenes[0]??null
}

export async function importarParteProduccion(form:FormData,area:AreaParte,analizar:(bytes:Uint8Array,hoja?:string)=>ParteExtrusionDatos):Promise<ResultadoExtrusion> {
  const etiqueta=SECCIONES_PARTE[area].nombre
  const ruta=`/produccion/${SECCIONES_PARTE[area].slug}`
  const user = await getSessionUser()
  if (!user || !["ADMIN","GERENCIA"].includes(user.rol) || user.debeCambiarClave) return { error:"Sin permisos para importar" }
  const file = form.get("archivo"), ordenId = String(form.get("ordenId")??""), confirmar = form.get("confirmar") === "si"
  if (!(file instanceof File) || !/\.xlsx?$/i.test(file.name) || !file.size || file.size > 4*1024*1024) return {error:"Selecciona un Excel .xls/.xlsx de hasta 4 MB"}
  try {
    const datos = analizar(new Uint8Array(await file.arrayBuffer()), String(form.get("hoja")??"").trim() || undefined)
    if(datos.cliente.length>200||datos.producto.length>120||datos.ot.length>60) return {error:"Cliente, producto o número de OT superan la longitud permitida"}
    const cliente = ordenId ? null : await buscarCliente(prisma,datos.cliente)
    const orden = ordenId
      ? await prisma.ordenTrabajo.findUnique({where:{id:ordenId},include:{cliente:true}})
      : cliente ? await buscarOrden(prisma,cliente.id,datos.ot) : null
    if (ordenId&&!orden) return {error:"Selecciona una OT existente"}
    if(orden) {
      const ref = orden.refExterna ?? String(orden.numero)
      if(normalizar(ref)!==normalizar(datos.ot)||normalizar(orden.cliente.nombre)!==normalizar(datos.cliente)||normalizar(orden.producto)!==normalizar(datos.producto)) return {error:`El Excel (OT ${datos.ot}, ${datos.cliente}, ${datos.producto}) no coincide con la OT seleccionada (${ref}, ${orden.cliente.nombre}, ${orden.producto}). Corrige la selección o el archivo.`}
      if(Math.abs(Number(orden.kgPedidos)-datos.pedido)>0.02) return {error:"La cantidad pedida del Excel no coincide con la OT"}
    }
    const huella = createHash("sha256").update(JSON.stringify(datos)+(area!=="EXTRUSION"?`|${area}`:"")).digest("hex")
    const anterior = orden ? await prisma.parteExtrusion.findFirst({where:{ordenId:orden.id,area},orderBy:[{createdAt:"desc"},{id:"desc"}]}) : null
    if(orden&&orden.estado!=="ABIERTA"&&anterior?.huella!==huella) return {error:"La OT existente está cerrada. Reábrela antes de actualizar el parte."}
    if (!confirmar) return {datos,huella,revision:anterior?.id??"",reemplaza:!!anterior,crearOrden:!orden,crearCliente:!orden&&!cliente,destino:orden?.id??"nueva"}
    if (String(form.get("huella"))!==huella) return {error:"El archivo cambió; vuelve a analizarlo"}
    const nueva = ordenTrabajoSchema.safeParse({clienteId:cliente?.id??"pendiente",refExterna:datos.ot,producto:datos.producto,kgPedidos:datos.pedido,precioUnitario:form.get("precioUnitario"),medida:datos.ficha?.Tamaño,mezclaNota:datos.ficha?.["Tipo de material"]})
    if(!orden&&!nueva.success) return {error:nueva.error.issues[0].message}
    const resultado = await prisma.$transaction(async tx=>{
      // Un mismo cliente serializa el alta automática de cliente/OT y las reimportaciones.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`extrusion-cliente:${normalizar(datos.cliente)}`}))`
      let destino=orden
      if(!ordenId) {
        const clienteActual=await buscarCliente(tx,datos.cliente)
        destino=clienteActual?await buscarOrden(tx,clienteActual.id,datos.ot):null
        if(!destino) {
          if(String(form.get("destino"))!=="nueva"||!nueva.success) throw new Error("El destino cambió. Vuelve a analizar el Excel")
          const clienteFinal=clienteActual??await tx.cliente.create({data:{nombre:datos.cliente}})
          const origenKey=`extrusion:${createHash("sha256").update(`${normalizar(datos.cliente)}|${normalizar(datos.ot)}`).digest("hex")}`
          const primeraFecha=datos.filas.map(f=>f.fecha).filter(Boolean).sort()[0]
          destino=await tx.ordenTrabajo.create({data:{...nueva.data,clienteId:clienteFinal.id,origenKey,...(primeraFecha?{fechaIngreso:new Date(`${primeraFecha}T12:00:00Z`)}:{})},include:{cliente:true}})
        }
      }
      if(!destino)throw new Error("No se encontró la OT")
      if(normalizar(destino.producto)!==normalizar(datos.producto)||Math.abs(Number(destino.kgPedidos)-datos.pedido)>.02)throw new Error("La OT cambió desde el análisis. Vuelve a analizar el Excel")
      const id=destino.id
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${id}))`
      const actual = await tx.parteExtrusion.findFirst({where:{ordenId:id,area},orderBy:[{createdAt:"desc"},{id:"desc"}]})
      if (actual?.huella===huella) return {mensaje:"Este parte ya está importado; no se duplicaron datos ni avisos",ordenId:id}
      if(!orden&&destino.id!==ordenId&&actual)throw new Error("La OT fue importada por otro usuario. Vuelve a analizar el Excel")
      if ((actual?.id??"")!==String(form.get("revision")??"")) throw new Error("Otro usuario importó una versión: vuelve a analizar el archivo")
      if (await tx.parteExtrusion.findUnique({where:{ordenId_huella:{ordenId:id,huella}}})) throw new Error("Esta versión ya existe en el historial. Importa una versión actualizada")
      const vigente = await tx.ordenTrabajo.findUnique({where:{id}})
      if (!vigente || vigente.estado!=="ABIERTA") throw new Error("La OT ya no está abierta")
      await tx.parteExtrusion.create({data:{ordenId:id,area,huella,archivo:file.name.slice(0,200),hoja:datos.hoja,datos:datos as unknown as Prisma.InputJsonValue,autorId:user.id}})
      const destinatarios = await tx.user.findMany({where:{activo:true,rol:{in:["ADMIN","GERENCIA","ALMACEN"]},id:{not:user.id}},select:{id:true}})
      const m = metricasExtrusion(datos.filas,datos.pedido)
      await tx.notificacion.createMany({data:destinatarios.map(u=>({userId:u.id,tipo:area,titulo:`${etiqueta} OT ${datos.ot}: ${m.buenos.toFixed(2)} kg`,detalle:[`${user.name} importó ${datos.hoja}.`,...datos.avisos].join(" "),href:`${ruta}?ot=${id}`}))})
      return {mensaje:!orden?"OT creada desde el Excel y parte importado.":"Parte importado. Las métricas usan esta versión; el historial anterior se conserva.",ordenId:id}
    })
    revalidatePath("/produccion/extrusion")
    revalidatePath("/produccion/impresion")
    revalidatePath("/produccion/confeccion")
    revalidatePath(`/produccion/ordenes/${resultado.ordenId}`)
    revalidatePath("/produccion/ordenes")
    revalidatePath("/produccion/clientes")
    revalidatePath("/produccion")
    revalidatePath("/notificaciones")
    return resultado
  } catch(e) { console.error(`Importación ${etiqueta}`,e instanceof Error?e.message:"Error"); return {error:e instanceof Error && !/prisma|database|connect|relation|column/i.test(e.message)?e.message:"No se pudo importar. Verifica la conexión y las migraciones de la base."} }
}
