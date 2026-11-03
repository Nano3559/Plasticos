# Sistema de Gestión de Planta - Bolsas Plásticas y Reciclado

Sistema web local-first para gestión de inventario trazable, producción/costos y cobranzas.

## Stack
- Next.js 16 (App Router) + TypeScript
- PostgreSQL + Prisma
- Auth.js v5 (credenciales) + roles
- Tailwind CSS + shadcn/ui (diseño minimalista claro)
- Zod, bcryptjs
- Vitest/Playwright (preparado)

## Roles
| Rol | Permisos |
|---|---|
| OPERADOR | Registrar producción de su turno |
| ALMACEN | Entradas, salidas, ajustes, stock |
| ADMIN | Clientes, OT, entregas, pagos, gastos, costos |
| GERENCIA | Todo + reportes + dashboard + export Excel |

## Arranque local

### 1) Clonar/usar carpeta
```bash
cd "fabrica bolsas"
```

### 2) Instalar dependencias
```bash
npm install
```

### 3) Configurar .env
Ya existe `.env` desde `.env.example`. Verifica `DATABASE_URL`.

### 4) Levantar Postgres con Docker
```bash
docker compose up -d
docker compose ps
```

### 5) Migrar y seed
```bash
npx prisma migrate dev
npx prisma db seed
```

### 6) Ejecutar app
```bash
npm run dev
```

Abrir [http://localhost:3000](http://localhost:3000)

## Credenciales de prueba
| Rol | Email | Password |
|---|---|---|
| ADMIN | admin@planta.local | 123456 |
| ALMACEN | almacen@planta.local | 123456 |
| OPERADOR | operador@planta.local | 123456 |
| GERENCIA | gerencia@planta.local | 123456 |

## Reglas clave
- **Movimientos inmutables**: Nunca editar/borrar movimientos de inventario. Correcciones con tipo `AJUSTE` + motivo
- **Stock** = suma de movimientos (ENTRADA − SALIDA ± AJUSTE)
- **Salida** requiere stock suficiente, motivo, turno, usuario
- **Producción**: kgBuenos + kgMerma + kgRechazado = kgEntrada
- **Costo por 100 kg**: (MO + Energía) / kg buenos × 100
- **Cartera**: kg entregados × precio - pagos, antigüedad por fecha de entrega

## Estructura
```
src/
  app/        # App Router (auth, app, api)
  actions/    # Server Actions
  components/ # UI + layout
  lib/        # prisma, schemas, utils
  auth.ts     # Auth.js config
prisma/
  schema.prisma
  seed.ts
```

## Comandos útiles
```bash
npx prisma studio    # Ver BD
npx prisma generate  # Regenerar cliente
docker compose stop  # Parar BD
docker compose down  # Bajar BD (conserva datos)
```

## Notas
- Todo en español
- Diseño minimalista claro, móvil-first
- Local-first, listo para subir a repo Git después
- Exportación Excel para GERENCIA
