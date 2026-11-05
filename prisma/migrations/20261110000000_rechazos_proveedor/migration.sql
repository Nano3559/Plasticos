-- Rechazos en extrusión: proveedor, lote y motivo del material rechazado
ALTER TABLE "RegistroProduccion" ADD COLUMN "rechazoEntradaId" TEXT;
ALTER TABLE "RegistroProduccion" ADD COLUMN "rechazoProveedor" TEXT;
ALTER TABLE "RegistroProduccion" ADD COLUMN "rechazoLote" TEXT;
ALTER TABLE "RegistroProduccion" ADD COLUMN "rechazoMotivo" TEXT;
ALTER TABLE "RegistroProduccion" ADD COLUMN "rechazoNota" TEXT;

CREATE INDEX "RegistroProduccion_rechazoEntradaId_idx" ON "RegistroProduccion"("rechazoEntradaId");

ALTER TABLE "RegistroProduccion" ADD CONSTRAINT "RegistroProduccion_rechazoEntradaId_fkey" FOREIGN KEY ("rechazoEntradaId") REFERENCES "MovimientoInventario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Aviso nuevo para Almacén y Gerencia
ALTER TYPE "TipoNotificacion" ADD VALUE 'RECHAZO';
