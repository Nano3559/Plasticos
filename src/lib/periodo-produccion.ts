export function rangoProduccion(tipo: "mes" | "semana", valor: string) {
  if (!valor) return { desde: "", hasta: "" }
  const fecha = new Date(`${valor}${tipo === "mes" ? "-01" : ""}T12:00:00Z`)
  if (Number.isNaN(fecha.getTime())) return { desde: "", hasta: "" }
  if (tipo === "semana") fecha.setUTCDate(fecha.getUTCDate() - (fecha.getUTCDay() + 6) % 7)
  const desde = fecha.toISOString().slice(0, 10)
  if (tipo === "mes") fecha.setUTCMonth(fecha.getUTCMonth() + 1, 0)
  else fecha.setUTCDate(fecha.getUTCDate() + 6)
  return { desde, hasta: fecha.toISOString().slice(0, 10) }
}
