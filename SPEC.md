# Spec: Sistema de Gestión de Planta — Bolsas Plásticas y Reciclado

## Objetivo
Reemplazar los Excel por un sistema de uso diario (~8 usuarios, celular y PC) con:
1. **Inventario trazable**: toda entrada y salida queda registrada (vale/notificación). Movimientos inmutables.
2. **Producción y costos**: costo por 100 kg (materia prima, tintas, mano de obra, energía), desperdicio por área.
3. **Cobranzas**: cartera por cliente con antigüedad, abonos y alertas.

Todo local primero (Docker Postgres), luego subir a repo. Diseño minimalista, colores claros desde el inicio.

## Tech Stack
- Next.js (App Router) + TypeScript
- PostgreSQL + Prisma
- Auth.js (credenciales) con roles
- Zod para validación
- Tailwind CSS + shadcn/ui
- Vitest + Playwright
- Docker Compose (local)

## Comandos
```bash
# Desarrollo
npm run dev

# Build
npm run build

# Tests
npm run test
npm run test:e2e

# Prisma
npx prisma migrate dev
npx prisma studio
npx prisma generate
```

## Estructura de proyecto
```
src/
  app/           # App Router
  components/    # Componentes reutilizables (shadcn/ui)
  lib/           # Utils, prisma, auth, validaciones
  actions/       # Server Actions
  hooks/         # Custom hooks
prisma/
  schema.prisma  # Ya existe
  seed.ts
scripts/         # Importadores Excel
tests/           # Vitest
e2e/             # Playwright
```

## Diseño - Minimalista, Colores Claros
**Filosofía**: Limpio, funcional, priorizar legibilidad en móvil. Sin gradientes llamativos, sin purple/indigo por defecto.

**Tokens (CSS variables HSL)**:
```css
:root {
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  --card: 0 0% 100%;
  --card-foreground: 222.2 84% 4.9%;
  --primary: 222.2 47.4% 11.2%;
  --primary-foreground: 210 40% 98%;
  --secondary: 210 40% 96.1%;
  --secondary-foreground: 222.2 47.4% 11.2%;
  --muted: 210 40% 96.1%;
  --muted-foreground: 215.4 16.3% 46.9%;
  --accent: 210 40% 96.1%;
  --accent-foreground: 222.2 47.4% 11.2%;
  --destructive: 0 84.2% 60.2%;
  --destructive-foreground: 210 40% 98%;
  --border: 214.3 31.8% 91.4%;
  --input: 214.3 31.8% 91.4%;
  --ring: 222.2 84% 4.9%;
  --radius: 0.5rem;
}
```

Usar tokens semánticos vía Tailwind. Componentes shadcn/ui con estilo minimalista.

## Roles y Permisos
| Rol | Permisos |
|---|---|
| OPERADOR | Consumos, producción, mermas de su turno |
| ALMACEN | Entradas, salidas (vales), ajustes, stock |
| ADMIN | Clientes, órdenes, entregas, pagos, gastos |
| GERENCIA | Todo en lectura + reportes de costos y cartera |

## Reglas de Negocio Clave
- **Movimientos inmutables**: nunca editar/borrar. Correcciones con tipo AJUSTE + motivo.
- **Stock** = suma de movimientos (ENTRADA − SALIDA ± AJUSTE). Alerta si < stockMinimo.
- **Toda SALIDA** exige usuario, turno, motivo y si aplica orden de trabajo.
- **Costo por 100 kg** = (MP consumida*costoPromedio + tintas + MO + energía) / kg buenos * 100
- **Desperdicio** por área (extrusión, impresión, confección)
- **Cartera** = kg entregados*precio - pagos. Antigüedad por entrega.

## Fases de Implementación
1. **Base**: init Next.js + shadcn/ui + Prisma + Auth.js + roles, layout móvil, clientes/materiales, seed
2. **Inventario**: entradas, vales salida, ajustes, stock, alertas
3. **Órdenes y producción**: OT, registro por área, pesos, mezcla, mermas, rechazos
4. **Costos**: MO/energía por turno, costo por 100kg, reporte desperdicio
5. **Cobranzas**: entregas, pagos, cartera por antigüedad
6. **Reportes y despliegue**: dashboard gerencia, export Excel, deploy

## Success Criteria
- [ ] App inicia local con `npm run dev`
- [ ] Auth funciona con roles
- [ ] Layout responsive (móvil/desktop), minimalista claro
- [ ] Prisma conecta a Postgres local (Docker)
- [ ] Movimientos inventario inmutables
- [ ] Cálculo de stock correcto
- [ ] UI en español, kg con 2 decimales

## Boundaries
- **Always**: Validar con Zod, usar Server Actions cuando aplique, movimientos inmutables, tests para lógica crítica
- **Ask first**: Cambios a schema.prisma, agregar dependencias
- **Never**: Editar/borrar movimientos inventario directamente, commit secrets, usar colores oscuros por defecto
