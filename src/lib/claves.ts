/**
 * Reglas de contraseñas y de bloqueo. Sin base de datos, para poder probarlas.
 */

export const CLAVE_MINIMA = 8
export const MAX_INTENTOS = 5
export const MINUTOS_BLOQUEO = 15
/** Contraseña de los usuarios de prueba del seed: se avisa mientras alguien la siga usando. */
export const CLAVE_DE_PRUEBA = "123456"

const COMUNES = new Set([
  "12345678", "123456789", "1234567890", "87654321", "11111111", "00000000", "password", "contraseña", "contrasena",
  "qwertyui", "qwerty123", "abc12345", "planta123", "plasticos", "plastico", "bolivia1", "cochabamba", "admin123",
])

/** Devuelve el problema de la contraseña, o null si sirve. */
export function problemaDeClave(clave: string, contexto: { email?: string; nombre?: string } = {}): string | null {
  if (clave.length < CLAVE_MINIMA) return `La contraseña debe tener al menos ${CLAVE_MINIMA} caracteres.`
  if (clave.length > 72) return "La contraseña puede tener como máximo 72 caracteres."
  const baja = clave.toLowerCase()
  if (COMUNES.has(baja) || /^(\d)\1+$/.test(clave) || /^(0123456789|123456789|1234567890)/.test(clave)) {
    return "Esa contraseña es demasiado común. Usa una frase o mezcla palabras y números."
  }
  const usuario = contexto.email?.split("@")[0]?.toLowerCase()
  if (usuario && usuario.length >= 3 && baja.includes(usuario)) return "La contraseña no puede contener tu usuario."
  const primerNombre = contexto.nombre?.trim().split(/\s+/)[0]?.toLowerCase()
  if (primerNombre && primerNombre.length >= 4 && baja.includes(primerNombre)) return "La contraseña no puede contener tu nombre."
  return null
}

/** Contraseña temporal legible para dictar o mandar por WhatsApp: "Bolsa-4821-Rio". */
const azarSeguro = () => {
  const a = new Uint32Array(1)
  globalThis.crypto.getRandomValues(a)
  return a[0] / 2 ** 32
}

export function claveTemporal(azar: () => number = azarSeguro): string {
  const palabras = ["Bolsa", "Rollo", "Bobina", "Kilo", "Turno", "Molde", "Prensa", "Hilo", "Lote", "Caja", "Pino", "Rio", "Sol", "Valle", "Cerro"]
  const p = () => palabras[Math.floor(azar() * palabras.length)]
  const n = String(1000 + Math.floor(azar() * 9000))
  return `${p()}-${n}-${p()}`
}

export function normalizarEmail(email: string): string {
  return email.trim().toLowerCase()
}

/** Estado después de un intento fallido de ingreso. */
export function trasIntentoFallido(intentos: number, ahora = new Date()): { intentosFallidos: number; bloqueadoHasta: Date | null } {
  const n = intentos + 1
  return n >= MAX_INTENTOS
    ? { intentosFallidos: 0, bloqueadoHasta: new Date(ahora.getTime() + MINUTOS_BLOQUEO * 60_000) }
    : { intentosFallidos: n, bloqueadoHasta: null }
}
