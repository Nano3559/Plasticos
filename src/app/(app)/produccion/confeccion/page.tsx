import { TableroPartes } from "../extrusion/tablero"
export const dynamic="force-dynamic"
export default async function ConfeccionPage(props:{searchParams:Promise<Record<string,string|string[]|undefined>>}) {
  return <TableroPartes {...props} area="CONFECCION"/>
}
