ALTER TABLE "ParteExtrusion" ADD COLUMN "area" "Area" NOT NULL DEFAULT 'EXTRUSION';
CREATE INDEX "ParteExtrusion_area_ordenId_createdAt_idx" ON "ParteExtrusion"("area", "ordenId", "createdAt");
ALTER TYPE "TipoNotificacion" ADD VALUE 'IMPRESION';
