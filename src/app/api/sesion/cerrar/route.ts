import { signOut } from "@/auth"

const MOTIVOS = new Set(["sesion", "clave"])

/** Cierra la sesión del navegador y vuelve al login con un aviso. */
export async function GET(request: Request) {
  const motivo = new URL(request.url).searchParams.get("motivo")
  await signOut({ redirectTo: `/login${motivo && MOTIVOS.has(motivo) ? `?motivo=${motivo}` : ""}` })
}
