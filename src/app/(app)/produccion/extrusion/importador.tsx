"use client"
import { useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { importarExtrusion } from "@/actions/extrusion"
import { importarImpresion } from "@/actions/impresion"
import { importarConfeccion } from "@/actions/confeccion"
import { SECCIONES_PARTE,type AreaParte } from "@/lib/secciones-produccion"
import { metricasExtrusion, type ParteExtrusionDatos } from "@/lib/extrusion"
import { Button } from "@/components/ui/button"
import { CampoNumero } from "@/components/ui/campo-numero"
import { numeroParaEnviar } from "@/lib/formato"
import { TablaParte } from "@/components/produccion/tabla-parte"

export function ImportadorExtrusion({ordenes,area="EXTRUSION"}:{ordenes:{id:string;nombre:string}[];area?:AreaParte}) {
  const seccion=SECCIONES_PARTE[area].nombre.toLowerCase(),ruta=SECCIONES_PARTE[area].slug,automatica=area!=="EXTRUSION",confeccion=area==="CONFECCION"
  const importar=({EXTRUSION:importarExtrusion,IMPRESION:importarImpresion,CONFECCION:importarConfeccion})[area]
  const form=useRef<HTMLFormElement>(null),router=useRouter()
  const [pending,start]=useTransition(),[error,setError]=useState(""),[mensaje,setMensaje]=useState("")
  const [precio,setPrecio]=useState("")
  const [preview,setPreview]=useState<{datos:ParteExtrusionDatos;huella:string;revision:string;reemplaza:boolean;crearOrden:boolean;crearCliente:boolean;destino:string}|null>(null)
  function ejecutar(confirmar:boolean) { if(!form.current?.reportValidity())return;const fd=new FormData(form.current!);if(confirmar&&preview){fd.set("confirmar","si");fd.set("huella",preview.huella);fd.set("revision",preview.revision);fd.set("destino",preview.destino);fd.set("precioUnitario",numeroParaEnviar(precio,4))}start(async()=>{setError("");setMensaje("");try{const r=await importar(fd);if(r.error)setError(r.error);else if(r.datos&&r.huella)setPreview({datos:r.datos,huella:r.huella,revision:r.revision??"",reemplaza:r.reemplaza??false,crearOrden:r.crearOrden??false,crearCliente:r.crearCliente??false,destino:r.destino??""});else if(r.mensaje){setMensaje(r.mensaje);setPreview(null);setPrecio("");if(r.ordenId)router.push(`/produccion/${ruta}?ot=${r.ordenId}`);router.refresh()}}catch{setError("No se pudo completar la solicitud. Intenta nuevamente.")}}) }
  const m=preview?metricasExtrusion(preview.datos.filas,preview.datos.pedido):null
  return <section className="space-y-4 rounded-xl border border-line p-5"><h2 className="font-bold">Importar Excel y crear OT · {seccion}</h2><p className="text-sm text-subdued">Sube tu Excel: leeremos el cliente, número de OT, producto, cantidad y ficha técnica. No necesitas crear la orden antes. {automatica?`Detectamos automáticamente la hoja ${SECCIONES_PARTE[area].hoja}. Si ya importaste otra sección, se usará la misma OT y su precio, conservando los partes por separado.`:"Usa la hoja OT 1 o indica otra hoja del mismo formato."}</p>
    <form ref={form} onSubmit={e=>{e.preventDefault();ejecutar(false)}} onChange={()=>{setPreview(null);setPrecio("");setMensaje("");setError("")}} className="grid gap-4 sm:grid-cols-2">
      <label className="grid gap-2">Archivo Excel (máximo 4 MB)<input disabled={pending} name="archivo" type="file" accept=".xlsx,.xls" required /></label>
      <label className="grid gap-2">Nombre de hoja<input disabled={pending} name="hoja" defaultValue={automatica?"":"OT 1"} placeholder={automatica?`Automático (${SECCIONES_PARTE[area].hoja}…)`:"OT 1"} required={!automatica} className="rounded border p-2"/></label>
      <label className="grid gap-2">Destino de la importación<select disabled={pending} name="ordenId" defaultValue="" className="rounded border p-2"><option value="">Automático: crear OT o actualizar la del Excel</option>{ordenes.map(o=><option key={o.id} value={o.id}>{o.nombre}</option>)}</select></label>
      <div><Button disabled={pending} type="submit">{pending?"Procesando…":"Importar Excel · ver vista previa"}</Button></div>
    </form>
    {error&&<p role="alert" className="text-danger">{error}</p>}{mensaje&&<p role="status">{mensaje}</p>}
    {preview&&m&&<div className="space-y-3"><h3 className="font-semibold">Vista previa · OT {preview.datos.ot} · {preview.datos.cliente}</h3><p>{m.entradaCompleta?`${m.entrada.toFixed(2)} kg utilizados`:"Kilos de entrada incompletos"} · {m.buenos.toFixed(2)} kg {confeccion?"terminados":"de bobinas"} · {m.desperdicio.toFixed(2)} kg de desperdicio · {confeccion?`${m.bultos} bultos`:`${m.bobinas} bobinas`}</p><ul className="list-disc pl-5">{preview.datos.avisos.map(a=><li key={a}>{a}</li>)}</ul>
      <p className="rounded-lg bg-elevated p-3 text-sm">{preview.crearOrden?`Se creará la OT ${preview.datos.ot} con el producto y la cantidad del Excel. ${preview.crearCliente?`También se creará el cliente ${preview.datos.cliente}.`:"Se usará el cliente existente con ese nombre."}`:"Se encontró una OT coincidente. Se importará el parte sin crear una orden duplicada."}</p>
      {preview.crearOrden&&<div className="max-w-sm space-y-2"><label htmlFor={`precio-${ruta}`} className="font-semibold">Precio de venta por kg (Bs)</label><CampoNumero id={`precio-${ruta}`} valor={precio} onCambio={setPrecio} decimales={4} unidad="Bs" required/><p className="text-xs text-subdued">Este dato no está en el formato de {seccion}. Indica el precio acordado; los demás datos se toman del Excel.</p></div>}
      <details><summary className="cursor-pointer font-semibold">Revisar ficha y primeras 50 filas de {preview.datos.filas.length}</summary><p className="my-3">{preview.datos.producto} · Máquina {preview.datos.maquina||"Sin dato"} · Pedido {preview.datos.pedido} kg</p><dl className="grid gap-2 sm:grid-cols-3">{Object.entries(preview.datos.ficha).map(([k,v])=><div key={k}><dt className="text-sm text-subdued">{k}</dt><dd>{v||"Sin indicar"}</dd></div>)}</dl><TablaParte area={area} filas={preview.datos.filas.slice(0,50)}/></details>
      <p className="text-sm">{preview.reemplaza?"Se guardará una nueva versión completa del parte. Los reportes tomarán esta versión y conservarán el historial.":"El parte quedará vinculado a la OT indicada en la vista previa."} No genera movimientos de stock, entregas, pagos ni registros de producción con pesos inventados.</p><Button disabled={pending} onClick={()=>ejecutar(true)}>{preview.crearOrden?"Confirmar y crear OT desde Excel":"Confirmar importación"}</Button></div>}
  </section>
}
