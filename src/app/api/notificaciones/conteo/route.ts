import { NextResponse } from "next/server"
import { getSessionUser } from "@/lib/session"
import { contarSinLeer } from "@/lib/notificaciones-db"

export const dynamic = "force-dynamic"

/** Cantidad de avisos sin leer del usuario: la campana la consulta cada minuto. */
export async function GET() {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ sinLeer: 0 }, { status: 401 })
  return NextResponse.json({ sinLeer: await contarSinLeer(user.id) }, { headers: { "Cache-Control": "no-store" } })
}
