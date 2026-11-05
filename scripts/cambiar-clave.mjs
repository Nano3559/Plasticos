// Cambia la contraseña de un usuario directamente en la base de datos.
// Uso (con DATABASE_URL apuntando a la base que quieras cambiar):
//   node scripts/cambiar-clave.mjs gerencia@planta.local "NuevaClaveSegura123"
import bcrypt from "bcryptjs"
import pg from "pg"

const [email, clave] = process.argv.slice(2)
if (!email || !clave) {
  console.error('Uso: node scripts/cambiar-clave.mjs <correo> "<nueva contraseña>"')
  process.exit(1)
}
if (clave.length < 6) {
  console.error("La contraseña debe tener al menos 6 caracteres.")
  process.exit(1)
}
if (!process.env.DATABASE_URL) {
  console.error("Falta DATABASE_URL (ponla en .env o en la terminal).")
  process.exit(1)
}

const cliente = new pg.Client({ connectionString: process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL })
await cliente.connect()
try {
  const hash = await bcrypt.hash(clave, 10)
  const res = await cliente.query('UPDATE "User" SET "passwordHash" = $1, "sesionVersion" = "sesionVersion" + 1, "intentosFallidos" = 0, "bloqueadoHasta" = NULL WHERE email = $2', [hash, email])
  if (res.rowCount === 0) {
    console.error(`No existe un usuario con el correo ${email}.`)
    process.exitCode = 1
  } else {
    console.log(`Contraseña de ${email} actualizada.`)
  }
} finally {
  await cliente.end()
}
