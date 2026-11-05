-- Devoluciones y descuentos: rebajan la deuda del cliente sin ser pagos
CREATE TYPE "TipoNotaCredito" AS ENUM ('DEVOLUCION', 'DESCUENTO');

CREATE TABLE "NotaCredito" (
    "id" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "ordenId" TEXT,
    "tipo" "TipoNotaCredito" NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "kg" DECIMAL(12,2),
    "monto" DECIMAL(12,2) NOT NULL,
    "motivo" TEXT NOT NULL,
    "notaRemision" TEXT,
    "userId" TEXT,
    "origenKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "anuladaEn" TIMESTAMP(3),
    "anuladaMotivo" TEXT,

    CONSTRAINT "NotaCredito_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "NotaCredito_origenKey_key" ON "NotaCredito"("origenKey");
CREATE INDEX "NotaCredito_clienteId_fecha_idx" ON "NotaCredito"("clienteId", "fecha");

ALTER TABLE "NotaCredito" ADD CONSTRAINT "NotaCredito_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "NotaCredito" ADD CONSTRAINT "NotaCredito_ordenId_fkey" FOREIGN KEY ("ordenId") REFERENCES "OrdenTrabajo"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "NotaCredito" ADD CONSTRAINT "NotaCredito_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
