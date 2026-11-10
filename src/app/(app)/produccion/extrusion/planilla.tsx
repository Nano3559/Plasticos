import type { ParteExtrusionDatos } from "@/lib/extrusion"
import { agruparExtrusion, metricasExtrusion } from "@/lib/extrusion"
import { formatNumero } from "@/lib/formato"
import type { AreaParte } from "@/lib/secciones-produccion"
import { PlanillaConfeccion } from "../confeccion/planilla"

/** Parte completo en orden de origen; sus acumulados nunca dependen de filtros del tablero. */
export function PlanillaExtrusion({ datos,area="EXTRUSION" }: { datos: ParteExtrusionDatos;area?:AreaParte }) {
  if(area==="CONFECCION")return <PlanillaConfeccion datos={datos}/>
  const impresion=area==="IMPRESION",seccion=impresion?"impresión":"extrusión"
  const total = metricasExtrusion(datos.filas, datos.pedido)
  const acumulados = datos.filas.reduce<{ entrada: number; buenos: number }[]>((valores, fila) => {
    const anterior = valores[valores.length - 1]
    valores.push({ entrada: (anterior?.entrada ?? 0) + fila.entrada, buenos: (anterior?.buenos ?? 0) + fila.buenos })
    return valores
  }, [])
  const celda = "border border-slate-300 px-3 py-2 align-top"
  const numero = `${celda} text-right tabular-nums whitespace-nowrap`
  const ficha = (etiqueta: string, valor?: string) => (
    <div key={etiqueta} className="border-b border-r border-slate-200 px-4 py-3">
      <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{etiqueta}</dt>
      <dd className="mt-1 whitespace-pre-wrap font-medium text-slate-900">{valor || "—"}</dd>
    </div>
  )

  return (
    <article className="overflow-hidden rounded-xl border border-slate-300 bg-white text-slate-900 shadow-sm">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-300 bg-cyan-50 px-5 py-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-cyan-800">Orden de trabajo · sección de {seccion}</p>
          <h3 className="mt-1 text-xl font-bold">{datos.producto}</h3>
        </div>
        <p className="rounded-lg border border-cyan-200 bg-white px-4 py-2 text-xl font-bold">OT {datos.ot}</p>
      </header>
      <dl className="grid grid-cols-2 sm:grid-cols-4">
        {ficha("Cliente", datos.cliente)}
        {ficha("Producto", datos.producto)}
        {ficha("Cantidad pedida", `${formatNumero(datos.pedido)} kg`)}
        {ficha("Máquina", datos.maquina)}
        {Object.entries(datos.ficha).filter(([k]) => k !== "Observaciones").map(([k, v]) => ficha(k, v))}
      </dl>
      <div className="border-b border-slate-300 px-4 py-3">
        <p className="text-xs font-semibold uppercase text-slate-500">Observaciones</p>
        <p className="mt-1 whitespace-pre-wrap">{datos.ficha.Observaciones || "Sin observaciones"}</p>
      </div>
      <div className="flex flex-wrap justify-between gap-2 bg-slate-50 px-4 py-3 text-sm">
        <h4 className="font-bold uppercase tracking-wide">Desarrollo de la producción</h4>
        <p>Parte completo · {datos.hoja} · desplaza la tabla para ver todas las columnas</p>
      </div>
      <div tabIndex={0} role="region" aria-label={`Planilla completa de ${seccion} OT ${datos.ot}`} className="max-h-[70vh] overflow-auto focus-visible:outline-2 focus-visible:outline-cyan-700">
        <table className="w-full min-w-[1250px] border-collapse text-sm">
          <caption className="sr-only">Desarrollo de producción de la OT {datos.ot}, con acumulados recalculados en orden de las filas del archivo.</caption>
          <thead className="sticky top-0 z-10 bg-cyan-50 text-xs uppercase text-cyan-950">
            <tr>
              <th rowSpan={2} scope="col" className={celda}>Fecha</th>
              <th rowSpan={2} scope="col" className={celda}>Operador</th>
              <th rowSpan={2} scope="col" className={celda}>Turno</th>
              <th colSpan={3} scope="colgroup" className={celda}>Material utilizado</th>
              <th colSpan={4} scope="colgroup" className={celda}>Producto a entregar</th>
              <th colSpan={2} scope="colgroup" className={celda}>Interrupciones</th>
            </tr>
            <tr>
              {[impresion?"Producto":"Ítem", "Kilos", impresion?"Total utilizado kg":"Acumulado kg", "N° bobina", "Kilos", "Acumulado kg", "Desperdicio kg", "Motivo", "Tiempo"].map((h, i) => <th key={i} scope="col" className={celda}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            <tr className="bg-cyan-100/70 font-bold">
              <th colSpan={4} scope="row" className={`${celda} text-left`}>TOTALES</th>
              <td className={numero}>{formatNumero(total.entrada)}</td><td className={numero}>{formatNumero(total.entrada)}</td>
              <td className={numero}>{total.bobinas}</td><td className={numero}>{formatNumero(total.buenos)}</td>
              <td className={numero}>{formatNumero(total.buenos)}</td><td className={numero}>{formatNumero(total.desperdicio)}</td>
              <td className={celda}>{total.sinDuracion ? `${total.sinDuracion} filas sin duración` : "Duraciones registradas"}</td>
              <td className={numero}>{formatNumero(total.minutos)} min conocidos</td>
            </tr>
            {!impresion&&agruparExtrusion(datos.filas, "material").filter(g => g.entrada > 0).map(g => (
              <tr key={g.nombre} className="bg-slate-50 text-xs">
                <th colSpan={4} scope="row" className={`${celda} text-left font-semibold`}>TOTAL {g.nombre}</th>
                <td className={numero}>{formatNumero(g.entrada)}</td><td colSpan={7} className={celda} />
              </tr>
            ))}
            {datos.filas.map((f, i) => {
              const { entrada, buenos } = acumulados[i]
              const previo = datos.filas[i - 1]
              const nuevoTurno = !previo || f.fecha !== previo.fecha || f.operador !== previo.operador || f.turno !== previo.turno
              const fecha = f.fecha.split("-").reverse().join("/")
              return (
                <tr key={f.fila} title={`Fila ${f.fila} del Excel`} className={`${i % 2 ? "bg-slate-50/60" : "bg-white"} ${nuevoTurno ? "border-t-2 border-t-cyan-500" : ""} hover:bg-cyan-50`}>
                  <td className={`${celda} whitespace-nowrap`}>{nuevoTurno ? fecha : <span className="sr-only">{fecha}</span>}</td>
                  <td className={celda}>{nuevoTurno ? f.operador : <span className="sr-only">{f.operador}</span>}</td>
                  <td className={`${celda} text-center`}>{nuevoTurno ? f.turno : <span className="sr-only">{f.turno}</span>}</td>
                  <td className={celda}>{f.material || "—"}</td>
                  <td className={numero}>{f.entrada ? formatNumero(f.entrada) : "—"}</td>
                  <td className={`${numero} text-slate-500`}>{formatNumero(entrada)}</td>
                  <td className={`${numero} font-semibold`}>{f.bobina || "—"}</td>
                  <td className={numero}>{f.buenos ? formatNumero(f.buenos) : "—"}</td>
                  <td className={`${numero} text-slate-500`}>{formatNumero(buenos)}</td>
                  <td className={`${numero} ${f.desperdicio ? "bg-amber-50 text-amber-900" : ""}`}>{f.desperdicio ? formatNumero(f.desperdicio) : "—"}</td>
                  <td className={`${celda} min-w-52 whitespace-pre-wrap`}>{f.motivo || "—"}</td>
                  <td className={numero}>{f.minutos === null ? (f.motivo ? "Sin dato" : "—") : `${formatNumero(f.minutos)} min`}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <footer className="flex flex-wrap justify-between gap-3 border-t border-slate-300 bg-slate-50 px-4 py-3 text-sm">
        <p>Avance del pedido: <strong>{formatNumero(total.avance)}%</strong></p>
        <p className={Math.abs(total.diferencia??0) > .02 ? "font-semibold text-amber-800" : "text-slate-600"}>Balance por conciliar: {formatNumero(total.diferencia)} kg</p>
      </footer>
    </article>
  )
}
