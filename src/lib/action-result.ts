/**
 * Next.js oculta el mensaje de los errores lanzados en Server Actions cuando
 * corre en producción ("An error occurred in the Server Components render").
 * Por eso las acciones devuelven el error como dato y el formulario lo muestra.
 */
export type ActionError = { error: string }

export function fail(message: string): ActionError {
  return { error: message }
}

export function isActionError(value: unknown): value is ActionError {
  return typeof value === "object" && value !== null && "error" in value
}

/** Lanza el error devuelto por una acción para que el catch del formulario lo muestre. */
export function unwrap<T>(value: T): Exclude<T, ActionError> {
  if (isActionError(value)) throw new Error(value.error)
  return value as Exclude<T, ActionError>
}

/** Texto legible de cualquier error capturado en un catch. */
export function mensajeError(e: unknown, porDefecto = "Ocurrió un error inesperado"): string {
  return e instanceof Error && e.message ? e.message : porDefecto
}
