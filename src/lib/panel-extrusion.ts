import { metricasExtrusion, type ParteExtrusionDatos } from "./extrusion"

const categorias = ["Termo", "Suero", "Stretch", "Baja", "Lineal", "Reciclado"]
function categoria(material: string) {
  const nombre = material.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase().replace(/\s+/g, " ")
  const aliases: Record<string, string> = { termo: "Termo", suero: "Suero", strech: "Stretch", stretch: "Stretch", baja: "Baja", lineal: "Lineal", reciclado: "Reciclado" }
  return aliases[nombre] || (nombre ? `Otros · ${material.trim()}` : "Sin identificar")
}

export function resumenMensualExtrusion(partes: { ordenId: string; datos: ParteExtrusionDatos }[]) {
  const meses = [...new Set(partes.flatMap(p => p.datos.filas.filter(f => f.fecha).map(f => f.fecha.slice(0, 7))))].sort().reverse()
  return meses.map(mes => {
    const ordenes = partes.map(p => ({ p, filas: p.datos.filas.filter(f => f.fecha.startsWith(`${mes}-`)) })).filter(o => o.filas.length)
    const filas = ordenes.flatMap(o => o.filas)
    const materiales = new Map(categorias.map(nombre => [nombre, 0]))
    for (const f of filas) {
      const nombre = categoria(f.material)
      materiales.set(nombre, (materiales.get(nombre) || 0) + f.entrada)
    }
    return {
      mes, ...metricasExtrusion(filas),
      pedido: ordenes.reduce((s, o) => s + o.p.datos.pedido, 0),
      materiales: [...materiales].map(([nombre, kg]) => ({ nombre, kg })),
      ordenes: ordenes.map(({ p, filas }) => ({ id: p.ordenId, ot: p.datos.ot, cliente: p.datos.cliente, pedido: p.datos.pedido, ...metricasExtrusion(filas) })),
    }
  })
}
