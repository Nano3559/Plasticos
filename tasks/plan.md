# Plan de Implementación

## Overview
Inicializar proyecto Next.js con stack definido, diseño minimalista claro, auth con roles, conectar Prisma/DB local.

## Architecture Decisions
- **Local-first**: Docker Compose para Postgres, todo corre local
- **Diseño minimalista claro**: Tokens semánticos shadcn/ui, sin tema oscuro por defecto
- **Server-first**: Server Actions donde sea posible, validación con Zod
- **Inmutabilidad**: MovimientosInventario nunca editables/borrables

## Task List

### Fase 1: Inicialización Base
- [ ] **Task 1: Crear proyecto Next.js**
  - Description: `npx create-next-app@latest . --ts --tailwind --app --eslint`
  - Acceptance: Proyecto creado, compila
  - Verify: `npm run dev` inicia
  - Files: package.json, tsconfig.json, app/

- [ ] **Task 2: Instalar dependencias**
  - Description: prisma, @prisma/client, next-auth, bcryptjs, zod, vitest, @playwright/test
  - Acceptance: Dependencias instaladas
  - Verify: `npm list` sin errores críticos
  - Files: package.json

- [ ] **Task 3: Configurar shadcn/ui minimalista claro**
  - Description: Init shadcn/ui, configurar tokens claros, sin dark mode por defecto
  - Acceptance: Componentes base instalados, CSS con tokens claros
  - Verify: Component Button renderiza
  - Files: components.json, app/globals.css, tailwind.config.ts, components/ui/

- [ ] **Task 4: Configurar Prisma**
  - Description: Copiar schema.prisma, configurar .env desde .env.example, generar client
  - Acceptance: Prisma client generado
  - Verify: `npx prisma generate` ok
  - Files: prisma/schema.prisma, .env, lib/prisma.ts

- [ ] **Task 5: Levantar DB y migrar**
  - Description: `docker compose up -d`, `npx prisma migrate dev --name init`
  - Acceptance: DB corriendo, tablas creadas
  - Verify: `npx prisma studio` abre
  - Files: migrations/

- [ ] **Task 6: Auth.js (credenciales) + roles**
  - Description: Configurar Auth.js con credentials, bcryptjs, roles, middleware por rol
  - Acceptance: Login funcional, rutas protegidas por rol
  - Verify: Login con usuario seed funciona
  - Files: auth.ts, app/api/auth/[...nextauth]/route.ts, middleware.ts

- [ ] **Task 7: Layout móvil + seed**
  - Description: Layout responsive minimalista, seed con usuario admin/almacén/operador
  - Acceptance: App con navegación, seed ejecutado
  - Verify: Login con roles distintos
  - Files: app/layout.tsx, components/layout/*, prisma/seed.ts

### Checkpoint: Base (Fase 1)
- [x] App corre local
- [x] Auth + roles funcionan (Auth.js v5 + middleware)
- [x] DB migrado con schema
- [x] Diseño minimalista claro aplicado
- [x] Layout móvil minimalista con navegación por rol
- [x] Seed con usuarios por rol
- [x] Login en español

### Fase 2: Inventario
- [x] Schemas Zod para entradas/salidas/ajustes
- [x] Server Actions (inmutables, validación stock, ajuste con motivo)
- [x] Página inventario con stock calculado y alertas
- [x] Entrada / Salida / Ajuste (UI móvil)
- [x] Kardex por material (historial inmutable)
- [x] Checkpoint Fase 2 completo

### Fase 3: Órdenes y Producción
- [x] Schemas Zod (OT, RegistroProduccion, Clientes)
- [x] Server Actions (crear cliente/OT/registro producción)
- [x] Clientes CRUD
- [x] Órdenes de Trabajo (crear/listar/detalle)
- [x] Registro producción por área con validación pesos
- [x] UI móvil minimalista
- [x] Checkpoint Fase 3 completo

### Fase 4: Costos
- [x] Schemas Zod para CostoTurno
- [x] Server Actions (registrarCostoTurno con upsert)
- [x] Página /costos con navegación por rol
- [x] Carga mano de obra y energía por fecha/turno
- [x] Costo por 100 kg por OT (con costos asignados por turno)
- [x] Desperdicio por área (Extrusión/Impresión/Confección)
- [x] Checkpoint Fase 4 completo

### Fase 5: Cobranzas
- [x] Schemas Zod (entrega/pago)
- [x] Server Actions (registrarEntrega, registrarPago)
- [x] Página /cobranzas
- [x] Registro de entregas por OT
- [x] Registro de pagos por cliente (con/sin OT, QR/Efectivo/Transferencia/Otro)
- [x] Cartera por antigüedad (0-15, 16-30, 31-60, 60+)
- [x] Detalle por cliente (entregas/pagos/saldo)
- [x] Checkpoint Fase 5 completo

### Fase 6: Reportes y despliegue
- [x] Dashboard mejorado para GERENCIA con KPIs
- [x] Página /reportes para GERENCIA
- [x] Exportar inventario a Excel
- [x] Exportar producción/OT a Excel
- [x] Exportar cartera a Excel
- [x] Exportar costos por OT a Excel
- [x] README con instrucciones locales
- [ ] Checkpoint Fase 6 al probar con DB

## Risks and Mitigations
| Risk | Impact | Mitigation |
|------|--------|------------|
| Errores con Auth.js v5 | Alto | Seguir docs oficiales, usar patrón credentials simple |
| Prisma client en Next.js | Medio | Usar singleton en lib/prisma.ts |
| Docker no disponible | Medio | Verificar docker compose up |

## Open Questions
- ¿Usar Auth.js v5 o v4? (chequear compatibilidad)
- ¿Estructura de carpetas exacta para Server Actions?
