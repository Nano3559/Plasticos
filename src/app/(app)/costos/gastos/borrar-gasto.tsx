"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { Trash2 } from "lucide-react"
import { eliminarGasto } from "@/actions/gastos"
import { isActionError } from "@/lib/action-result"
import { Button } from "@/components/ui/button"

export function BorrarGasto({ id, descripcion }: { id: string; descripcion: string }) {
  const router = useRouter()
  const [pendiente, iniciar] = useTransition()

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={`Borrar ${descripcion}`}
      title="Borrar gasto"
      disabled={pendiente}
      className="size-9 text-muted hover:text-danger"
      onClick={() => {
        if (!window.confirm(`¿Borrar el gasto de ${descripcion}? No se puede deshacer.`)) return
        iniciar(async () => {
          const r = await eliminarGasto(id)
          if (isActionError(r)) window.alert(r.error)
          router.refresh()
        })
      }}
    >
      <Trash2 />
    </Button>
  )
}
