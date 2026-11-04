import type { NextConfig } from "next"

const nextConfig: NextConfig = {
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
