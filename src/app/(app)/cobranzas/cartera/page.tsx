import Link from "next/link"
import { Download } from "lucide-react"
import { consultarCartera, resumirCartera, type RangoAntiguedad } from "@/lib/cartera"
import { formatBs } from "@/lib/formato"
import { Button } from "@/components/ui/button"
import { Cifras } from "@/components/ui/cifras"
import { Encabezado } from "@/components/ui/encabezado"
import { VacioTodoOk } from "@/components/ui/fila-tarea"

export const dynamic = "force-dynamic"

const RANGOS: { clave: RangoAntiguedad; texto: string; clase: string }[] = [
  { clave: "0-15", texto: "0–15 días", clase: "" },
  { clave: "16-30", texto: "16–30", clase: "" },
  { clave: "31-60", texto: "31–60", clase: "text-warn" },
  { clave: "60+", texto: "Más de 60", clase: "text-danger" },
]

export default async function CarteraPage() {
  const cartera = await consultarCartera()
  const r = resumirCartera(cartera)
  const con = cartera.filter((c) => c.saldo > 0.5).sort((a, b) => b.saldoPorRango["60+"] - a.saldoPorRango["60+"] || b.saldo - a.saldo)
  const totalRango = (k: RangoAntiguedad) => con.reduce((s, c) => s + c.saldoPorRango[k], 0)

  return (
    <div className="space-y-8">
      <Encabezado
        miga={{ href: "/cobranzas", texto: "Cobranzas" }}
        titulo="Cartera por antigüedad"
        descripcion="Los pagos se aplican primero a las entregas más antiguas; lo que queda se ordena por días desde la entrega."
        acciones={
          <Button asChild variant="outline" size="sm">
            <a href="/api/export/cartera" download>
              <Download /> Excel
            </a>
          </Button>
        }
      />

      <Cifras
        items={[
          { etiqueta: "Por cobrar", valor: formatBs(r.totalPorCobrar, 0), nota: `${r.clientesConDeuda} clientes` },
          { etiqueta: "31–60 días", valor: formatBs(totalRango("31-60"), 0), tono: totalRango("31-60") > 0.5 ? "warn" : undefined },
          { etiqueta: "Más de 60 días", valor: formatBs(totalRango("60+"), 0), tono: totalRango("60+") > 0.5 ? "danger" : undefined },
          { etiqueta: "Al día", valor: String(cartera.length - con.length), nota: "clientes sin saldo" },
        ]}
      />

      {con.length === 0 ? (
        <VacioTodoOk>Ningún cliente tiene saldo pendiente.</VacioTodoOk>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs text-subdued">
                <th className="py-2 pr-3 font-medium">Cliente</th>
                {RANGOS.map((g) => (
                  <th key={g.clave} className="py-2 pr-3 text-right font-medium">
                    {g.texto}
                  </th>
                ))}
                <th className="py-2 text-right font-medium">Saldo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {con.map((c) => (
                <tr key={c.cliente.id} className="hover:bg-elevated">
                  <td className="py-2.5 pr-3">
                    <Link href={`/cobranzas/cliente/${c.cliente.id}`} className="font-semibold hover:text-brand-ink hover:underline">
                      {c.cliente.nombre}
                    </Link>
                    <span className="block text-xs text-muted">crédito de {c.cliente.diasCredito} días</span>
                  </td>
                  {RANGOS.map((g) => (
                    <td key={g.clave} className={`py-2.5 pr-3 text-right tabular-nums ${c.saldoPorRango[g.clave] > 0.5 ? g.clase : "text-muted"}`}>
                      {c.saldoPorRango[g.clave] > 0.5 ? formatBs(c.saldoPorRango[g.clave], 0) : "—"}
                    </td>
                  ))}
                  <td className="py-2.5 text-right font-bold tabular-nums">{formatBs(c.saldo)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-line font-bold">
                <td className="py-2.5 pr-3">Total</td>
                {RANGOS.map((g) => (
                  <td key={g.clave} className={`py-2.5 pr-3 text-right tabular-nums ${g.clase}`}>
                    {formatBs(totalRango(g.clave), 0)}
                  </td>
                ))}
                <td className="py-2.5 text-right tabular-nums">{formatBs(r.totalPorCobrar)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  )
}
