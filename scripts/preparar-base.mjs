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
