-- Gastos: quién los registró, comprobante (factura o recibo) y fecha de registro
ALTER TABLE "Gasto" ADD COLUMN "comprobante" TEXT;
ALTER TABLE "Gasto" ADD COLUMN "userId" TEXT;
ALTER TABLE "Gasto" ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX "Gasto_fecha_idx" ON "Gasto"("fecha");

ALTER TABLE "Gasto" ADD CONSTRAINT "Gasto_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
