"use client"
import { useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { importarExtrusion } from "@/actions/extrusion"
import { metricasExtrusion, type ParteExtrusionDatos } from "@/lib/extrusion"
import { Button } from "@/components/ui/button"

export function ImportadorExtrusion({ordenes,ot}:{ordenes:{id:string;nombre:string}[];ot:string}) {
  const form=useRef<HTMLFormElement>(null),router=useRouter()
  const [pending,start]=useTransition(),[error,setError]=useState(""),[mensaje,setMensaje]=useState("")
  const [preview,setPreview]=useState<{datos:ParteExtrusionDatos;huella:string;revision:string;reemplaza:boolean}|null>(null)
  function ejecutar(confirmar:boolean) { if(!form.current?.reportValidity())return;const fd=new FormData(form.current!);if(confirmar&&preview){fd.set("confirmar","si");fd.set("huella",preview.huella);fd.set("revision",preview.revision)}start(async()=>{setError("");setMensaje("");try{const r=await importarExtrusion(fd);if(r.error)setError(r.error);else if(r.datos&&r.huella)setPreview({datos:r.datos,huella:r.huella,revision:r.revision??"",reemplaza:r.reemplaza??false});else if(r.mensaje){setMensaje(r.mensaje);setPreview(null);router.refresh()}}catch{setError("No se pudo completar la solicitud. Intenta nuevamente.")}}) }
  const m=preview?metricasExtrusion(preview.datos.filas,preview.datos.pedido):null
  return <section className="space-y-4 rounded-xl border border-line p-5"><h2 className="font-bold">Importar parte de extrusión</h2><p className="text-sm text-subdued">Usa la hoja OT 1 del formato de planta. La hoja Plantilla (2) vacía sirve como referencia; completa el desarrollo desde la fila 18. Crea primero la OT con su cliente, producto, cantidad y precio reales.</p>
    <Link href="/produccion/ordenes/nueva" className="inline-block text-sm font-semibold text-brand-ink">Crear una OT para este parte</Link>
    <form ref={form} onSubmit={e=>{e.preventDefault();ejecutar(false)}} onChange={()=>{setPreview(null);setMensaje("");setError("")}} className="grid gap-4 sm:grid-cols-2">
      <label className="grid gap-2">Orden de trabajo<select required name="ordenId" defaultValue={ot} className="rounded border p-2"><option value="">Selecciona una OT abierta</option>{ordenes.map(o=><option key={o.id} value={o.id}>{o.nombre}</option>)}</select></label>
      <label className="grid gap-2">Nombre de hoja<input name="hoja" defaultValue="OT 1" required className="rounded border p-2"/></label>
      <label className="grid gap-2">Archivo Excel (máximo 4 MB)<input name="archivo" type="file" accept=".xlsx,.xls" required /></label><div><Button disabled={pending} type="submit">{pending?"Procesando…":"Analizar sin guardar"}</Button></div>
    </form>
    {error&&<p role="alert" className="text-danger">{error}</p>}{mensaje&&<p role="status">{mensaje}</p>}
    {preview&&m&&<div className="space-y-3"><h3 className="font-semibold">Vista previa · OT {preview.datos.ot} · {preview.datos.cliente}</h3><p>{m.entrada.toFixed(2)} kg utilizados · {m.buenos.toFixed(2)} kg de bobinas · {m.desperdicio.toFixed(2)} kg de desperdicio · {m.bobinas} bobinas</p><ul className="list-disc pl-5">{preview.datos.avisos.map(a=><li key={a}>{a}</li>)}</ul>
      <details><summary className="cursor-pointer font-semibold">Revisar ficha y primeras 50 filas de {preview.datos.filas.length}</summary><p className="my-3">{preview.datos.producto} · Máquina {preview.datos.maquina} · Pedido {preview.datos.pedido} kg</p><dl className="grid gap-2 sm:grid-cols-3">{Object.entries(preview.datos.ficha).map(([k,v])=><div key={k}><dt className="text-sm text-subdued">{k}</dt><dd>{v||"Sin indicar"}</dd></div>)}</dl><div className="mt-4 overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr>{["Fila","Fecha","Operador","Turno","Material","Kg entrada","Bobina","Kg buenos","Kg desperdicio","Motivo","Minutos"].map(h=><th key={h} className="p-2">{h}</th>)}</tr></thead><tbody>{preview.datos.filas.slice(0,50).map(f=><tr key={f.fila} className="border-t border-line">{[f.fila,f.fecha,f.operador,f.turno,f.material,f.entrada,f.bobina,f.buenos,f.desperdicio,f.motivo,f.minutos??"Sin dato"].map((v,j)=><td key={j} className="p-2">{v}</td>)}</tr>)}</tbody></table></div></details>
      <p className="text-sm">{preview.reemplaza?"Se guardará una nueva versión completa del parte. Los reportes tomarán esta versión y conservarán el historial.":"Se guardará el parte vinculado a la OT seleccionada."} No genera movimientos de stock, entregas, pagos ni registros de producción con pesos inventados.</p><Button disabled={pending} onClick={()=>ejecutar(true)}>Confirmar importación{preview.reemplaza?" de nueva versión":""}</Button></div>}
  </section>
}
