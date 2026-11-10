import { TableroPartes } from "../extrusion/tablero"
export const dynamic="force-dynamic"
export default async function ImpresionPage(props:{searchParams:Promise<Record<string,string|string[]|undefined>>}) {
  return <TableroPartes {...props} area="IMPRESION"/>
}
