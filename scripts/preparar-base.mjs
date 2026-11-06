// Prepara la base de Neon en cada despliegue de Vercel, antes de compilar Next.js:
//   1. aplica las migraciones pendientes (prisma migrate deploy, por la conexión directa)
//   2. si SEED_ON_DEPLOY="true", carga usuarios y materiales iniciales (upsert: no duplica)
//   3. si SEED_DEMO="true" y la base todavía no tiene clientes, carga los datos de demostración
import { execSync } from "node:child_process"
import pg from "pg"

const run = (cmd) => execSync(cmd, { stdio: "inherit" })

if (!process.env.DATABASE_URL || !process.env.DATABASE_URL_UNPOOLED) {
  console.error(`
✖ Faltan DATABASE_URL y/o DATABASE_URL_UNPOOLED.
  En Vercel: abre el proyecto → Storage → conecta la base Neon a este proyecto
  (marca Production y Preview) y luego Deployments → ⋯ → Redeploy.
`)
  process.exit(1)
}

run("npx prisma migrate deploy")

if (process.env.SEED_ON_DEPLOY === "true") {
  console.log("→ SEED_ON_DEPLOY=true: cargando usuarios y materiales iniciales")
  run("npx prisma db seed")

  if (process.env.SEED_DEMO === "true") {
    const cliente = new pg.Client({ connectionString: process.env.DATABASE_URL_UNPOOLED })
    await cliente.connect()
    const { rows } = await cliente.query('SELECT COUNT(*)::int AS n FROM "Cliente"')
    await cliente.end()
    if (rows[0].n === 0) {
      console.log("→ SEED_DEMO=true y la base no tiene clientes: cargando datos de demostración")
      run("npm run db:demo")
    } else {
      console.log(`→ SEED_DEMO=true, pero ya hay ${rows[0].n} clientes: no se cargan datos de demostración otra vez`)
    }
  }
} else {
  console.log("→ SEED_ON_DEPLOY no está en \"true\": no se cargan datos iniciales")
}

// Restablece la cuenta de Gerencia con la MISMA conexión que usa la app.
// Uso: en Vercel agrega RESET_CLAVE_GERENCIA=<contraseña temporal> y haz Redeploy.
// Después de entrar, BORRA la variable y vuelve a desplegar.
if (process.env.RESET_CLAVE_GERENCIA) {
  const bcrypt = (await import("bcryptjs")).default
  const url = new URL(process.env.DATABASE_URL)
  console.log(`→ RESET_CLAVE_GERENCIA: restableciendo gerencia@planta.local en ${url.host}${url.pathname}`)
  const hash = await bcrypt.hash(process.env.RESET_CLAVE_GERENCIA, 10)
  const cliente = new pg.Client({ connectionString: process.env.DATABASE_URL })
  await cliente.connect()
  try {
    await cliente.query(
      `INSERT INTO "User" (id, nombre, email, "passwordHash", rol, activo, "debeCambiarClave")
       VALUES (gen_random_uuid()::text, 'Gerencia', 'gerencia@planta.local', $1, 'GERENCIA', true, true)
       ON CONFLICT (email) DO UPDATE SET
         "passwordHash" = EXCLUDED."passwordHash", rol = 'GERENCIA', activo = true,
         "intentosFallidos" = 0, "bloqueadoHasta" = NULL, "debeCambiarClave" = true,
         "sesionVersion" = "User"."sesionVersion" + 1`,
      [hash],
    )
    const { rows } = await cliente.query('SELECT email, rol FROM "User" ORDER BY email')
    console.log("→ Usuarios en esta base:", rows.map((r) => `${r.email} (${r.rol})`).join(", "))
  } finally {
    await cliente.end()
  }
}
