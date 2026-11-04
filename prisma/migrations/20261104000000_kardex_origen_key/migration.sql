-- Claves de origen para que importar el mismo kardex dos veces no duplique datos
ALTER TABLE "OrdenTrabajo" ADD COLUMN "origenKey" TEXT;
ALTER TABLE "OrdenTrabajo" ADD COLUMN "refExterna" TEXT;
ALTER TABLE "Entrega" ADD COLUMN "origenKey" TEXT;
ALTER TABLE "Pago" ADD COLUMN "origenKey" TEXT;

CREATE UNIQUE INDEX "OrdenTrabajo_origenKey_key" ON "OrdenTrabajo"("origenKey");
CREATE UNIQUE INDEX "Entrega_origenKey_key" ON "Entrega"("origenKey");
CREATE UNIQUE INDEX "Pago_origenKey_key" ON "Pago"("origenKey");

-- Índices para las consultas de cartera y kardex
CREATE INDEX "Entrega_ordenId_fecha_idx" ON "Entrega"("ordenId", "fecha");
CREATE INDEX "Pago_clienteId_fecha_idx" ON "Pago"("clienteId", "fecha");
