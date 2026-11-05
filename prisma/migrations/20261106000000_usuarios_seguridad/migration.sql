-- Gestión de usuarios: cambio obligatorio de clave, cierre de sesiones y bloqueo por intentos fallidos
ALTER TABLE "User" ADD COLUMN "debeCambiarClave" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN "sesionVersion" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN "intentosFallidos" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN "bloqueadoHasta" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "ultimoAcceso" TIMESTAMP(3);
