import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  // Prisma 6 con `engineType = "client"` (sin motor Rust) carga su compilador de
  // consultas desde node_modules/.prisma/client/query_compiler_bg.wasm. En Vercel,
  // el trazado de archivos de Next no lo incluye y en producción falla con
  // `ENOENT: ... query_compiler_bg.wasm`. Hay que declararlo explícitamente.
  outputFileTracingIncludes: {
    "/**/*": ["./node_modules/.prisma/client/**/*"],
  },
  experimental: {
    serverActions: {
      // Por defecto Next limita las Server Actions a 1 MB. Al importar varios kardex
      // (.xlsx) a la vez ese tope se superaba y la carga fallaba. 40 archivos × 8 MB = 320 MB
      // sería excesivo: el límite por petición se fija en 64 MB.
      bodySizeLimit: "64mb",
    },
  },
}

export default nextConfig
