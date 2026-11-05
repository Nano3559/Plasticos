import Link from "next/link"
import { redirect } from "next/navigation"
import { Users } from "lucide-react"
import { getSessionUser } from "@/lib/session"
import { ROL_LABEL } from "@/components/layout/modules"
import { CambiarClaveForm } from "./cambiar-clave-form"

export const dynamic = "force-dynamic"

export default async function CuentaPage() {
  const user = await getSessionUser()
  if (!user) redirect("/login")

  return (
    <div className="max-w-xl space-y-10">
      <header>
        <h1 className="text-[26px] font-bold leading-tight sm:text-[28px]">Mi cuenta</h1>
        <p className="mt-1 text-subdued">
          {user.name} · {user.email} · {ROL_LABEL[user.rol]}
        </p>
      </header>

      {user.debeCambiarClave && (
        <div role="alert" className="rounded-lg border border-brand/30 bg-brand-soft px-4 py-3 text-sm text-brand-ink">
          <p className="font-semibold">Antes de seguir, elige tu propia contraseña.</p>
          <p className="mt-0.5">La que te dieron es temporal. En «Contraseña actual» escribe esa contraseña temporal.</p>
        </div>
      )}

      <section aria-labelledby="titulo-clave">
        <h2 id="titulo-clave" className="mb-4 border-b border-line pb-2 text-[15px] font-bold">
          Cambiar contraseña
        </h2>
        <CambiarClaveForm email={user.email} nombre={user.name} />
      </section>

      {user.rol === "GERENCIA" && !user.debeCambiarClave && (
        <Link href="/usuarios" className="inline-flex h-10 items-center gap-2 text-[14px] text-subdued hover:text-brand-ink">
          <Users className="size-4" /> Administrar usuarios
        </Link>
      )}
    </div>
  )
}
