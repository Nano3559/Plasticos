ALTER TYPE "TipoNotificacion" ADD VALUE 'EXTRUSION';
CREATE TABLE "ParteExtrusion" (
  "id" TEXT NOT NULL,
  "ordenId" TEXT NOT NULL,
  "huella" TEXT NOT NULL,
  "archivo" TEXT NOT NULL,
  "hoja" TEXT NOT NULL,
  "datos" JSONB NOT NULL,
  "autorId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ParteExtrusion_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ParteExtrusion_ordenId_huella_key" ON "ParteExtrusion"("ordenId", "huella");
CREATE INDEX "ParteExtrusion_ordenId_createdAt_idx" ON "ParteExtrusion"("ordenId", "createdAt");
ALTER TABLE "ParteExtrusion" ADD CONSTRAINT "ParteExtrusion_ordenId_fkey" FOREIGN KEY ("ordenId") REFERENCES "OrdenTrabajo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ParteExtrusion" ADD CONSTRAINT "ParteExtrusion_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
