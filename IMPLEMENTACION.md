# Sistema de Gestión de Planta — Bolsas Plásticas y Reciclado

Guía de implementación para Claude Code. Ejecutar por fases, en orden, con pruebas en cada una.

## 1. Objetivo
Reemplazar los Excel por un sistema de uso diario (~8 usuarios, celular y PC, internet estable) con:
1. **Inventario trazable**: toda entrada y salida de material queda registrada (vale/notificación).
2. **Producción y costos**: costo y desperdicio por cada 100 kg (materia prima, tintas, mano de obra, energía).
3. **Cobranzas**: cartera por cliente con antigüedad, abonos y alertas (política: 15 días; en la práctica 1–3 meses).

## 2. Stack (TypeScript en todo)
- Next.js (App Router) + TypeScript, PWA responsive, Server Actions / Route Handlers
- PostgreSQL + Prisma (migraciones versionadas)
- Auth.js (credenciales) con roles; Zod para validación; Tailwind + shadcn/ui
- Vitest (lógica de costos/inventario) y Playwright (flujos críticos)
- Local: Docker Compose (Postgres). Producción: Vercel (app) + Render Postgres de pago con backups. No usar planes gratuitos para datos reales.

## 3. Arranque local
```bash
npx create-next-app@latest . --ts --tailwind --app --eslint
npm i prisma @prisma/client zod next-auth bcryptjs
npm i -D vitest @playwright/test
cp .env.example .env && docker compose up -d
npx prisma migrate dev --name init
```

## 4. Roles
| Rol | Permisos |
|---|---|
| OPERADOR | Registrar consumos, producción, mermas de su turno |
| ALMACEN | Entradas, salidas (vales), ajustes, stock |
| ADMIN | Clientes, órdenes, entregas, pagos, gastos |
| GERENCIA | Todo en lectura + reportes de costos y cartera (don Luis) |

## 5. Modelo de datos
Ver `prisma/schema.prisma`. Entidades: User, Cliente, Material, MovimientoInventario, OrdenTrabajo, RegistroProduccion, Entrega, Pago, Gasto, CostoTurno.

## 6. Reglas de negocio
- **Movimientos inmutables**: nunca editar ni borrar; las correcciones son movimientos de tipo AJUSTE con motivo.
- **Stock** = suma de movimientos (ENTRADA − SALIDA ± AJUSTE). Alerta al bajar de `stockMinimo`.
- **Toda SALIDA** exige usuario, turno, motivo y, si aplica, la orden de trabajo. Notifica a ALMACEN/GERENCIA.
- **Costo por 100 kg** de una orden = (materia prima consumida × costo promedio + tintas + mano de obra + energía asignada) ÷ kg buenos × 100.
- **Desperdicio** = kg que entran a un área − kg buenos que salen; se pesa y registra por área (extrusión, impresión, confección).
- **Mezcla real** (ej. 50 termo + 50 stretch) se registra por orden; la decide el operador.
- **Material rechazado** en extrusión se registra al momento, con lote/proveedor, para detectar quién entrega mal.
- **Cartera** = kg entregados × precio − pagos. Antigüedad por entrega (0–15, 16–30, 31–60, 60+ días).
- Pagos por QR se registran con referencia bancaria; conciliación manual en la fase 1.

## 7. Fases
1. **Base**: auth, roles, layout móvil, clientes, materiales, seed.
2. **Inventario**: entradas, vales de salida, ajustes, stock, alertas de mínimo.
3. **Órdenes y producción**: OT, registro por área con pesos, mezcla, mermas, rechazos.
4. **Costos**: mano de obra y energía por turno, costo por 100 kg, reporte de desperdicio.
5. **Cobranzas**: entregas, pagos, cartera por antigüedad, lista de llamadas, recordatorios.
6. **Reportes y despliegue**: dashboard de gerencia, exportación a Excel, deploy, backups.

Cada fase termina con pruebas pasando y una demo con datos reales importados de los Excel.

## 8. Convenciones
- UI en español, kg con 2 decimales, fechas en zona America/La_Paz.
- Formularios grandes y de pocos toques; operar con una mano en el celular.
- Importadores de Excel (clientes, materiales, historial) en `scripts/`.

## 9. Pendientes a ajustar con los Excel
Unidades y catálogo de materiales, ¿precio por orden o por cliente?, entregas parciales por O.T., abonos por orden o generales, número de máquinas, facturación.
