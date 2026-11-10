import { TableroPartes } from "./tablero"
export const dynamic="force-dynamic"
export default async function ExtrusionPage(props:{searchParams:Promise<Record<string,string|string[]|undefined>>}) {
  return <TableroPartes {...props} area="EXTRUSION"/>
}
