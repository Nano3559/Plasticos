-- Avisos dentro de la app: salidas y ajustes de inventario, y stock bajo el mínimo
CREATE TYPE "TipoNotificacion" AS ENUM ('SALIDA', 'AJUSTE', 'STOCK_BAJO');

CREATE TABLE "Notificacion" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tipo" "TipoNotificacion" NOT NULL,
    "titulo" TEXT NOT NULL,
    "detalle" TEXT,
    "href" TEXT,
    "movimientoId" TEXT,
    "leidaEn" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notificacion_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Notificacion_userId_leidaEn_createdAt_idx" ON "Notificacion"("userId", "leidaEn", "createdAt");

ALTER TABLE "Notificacion" ADD CONSTRAINT "Notificacion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
