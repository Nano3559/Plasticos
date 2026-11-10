# Handover para continuar la implementación

Fecha de revisión: 10 de noviembre de 2026.

Ampliación de impresión: `/produccion/impresion` usa `Plantilla IMPRESION` y `OT-IMP 7` del segundo libro de referencia. El importador, tablero, planilla y exportación comparten lógica con extrusión. La tabla histórica `ParteExtrusion` almacena ahora el área (`EXTRUSION` por defecto para conservar los datos anteriores, o `IMPRESION`); todas las consultas de versiones deben filtrar por área. La OT/cliente se reutilizan entre secciones y la huella de impresión incluye el área. Archivos centrales: `src/lib/partes-import.ts`, `partes-export.ts`, `impresion.ts` y `src/app/(app)/produccion/extrusion/tablero.tsx`. Migración: `20261110150000_partes_impresion`. Se verificó el archivo real: 339 kg de entrada, 330 kg impresos, 6 bobinas y 9 kg por conciliar. La plantilla de confección presente en ese libro no se implementó en esta ampliación.

Actualización posterior: se implementó el módulo **Producción → Extrusión** solicitado por el usuario a partir de `EJEMPLO SIST EXTRUCCION.xlsx`, hojas `OT 1` y `Plantilla (2)`. Ver la sección de partes de extrusión en README.md. Incluye importación con vista previa, versiones inmutables del parte, métricas/gráficos/filtros, reporte Excel y avisos internos. Modelo nuevo `ParteExtrusion`, migración `20261110120000_partes_extrusion`, tipo de aviso `EXTRUSION`. No se aplicó la migración: el entorno no tiene PostgreSQL local escuchando ni Docker instalado; `.env` tampoco contiene DATABASE_URL_UNPOOLED. Configurar esa variable antes de migrar. Los partes no generan pesajes ni stock automáticamente: el ejemplo tiene 588 kg por conciliar. El resto de este documento describe la revisión anterior a esta ampliación.

## 1. Contexto y alcance

Sistema de gestión de una planta de bolsas plásticas y reciclado, pensado para unos 8 usuarios en celular y PC. Busca reemplazar Excel con inventario trazable, producción, costos y cobranzas. La UI es en español, estilo Todoist, con celeste agua como color principal.

Este documento se basa en README.md, SPEC.md, IMPLEMENTACION.md, tasks/plan.md, package.json y una revisión focalizada del código. La presencia de una funcionalidad en el repositorio no demuestra que esté validada en producción. No se verificaron una instalación desplegada, datos reales ni conectividad PostgreSQL.

**No reinicializar el proyecto:** ya existe una aplicación con los seis bloques funcionales originales y ampliaciones posteriores. No hay una nueva funcionalidad solicitada ni un backlog actualizado que determine el siguiente desarrollo. El próximo trabajo recomendado es validar los flujos existentes y reconciliar la documentación.

## 2. Fuentes y reglas para la siguiente IA

1. Leer AGENTS.md. Antes de escribir código Next.js, consultar la guía relevante en `node_modules/next/dist/docs/`; esta versión tiene cambios respecto de versiones anteriores.
2. Usar package.json, el esquema, las migraciones y el código como evidencia del estado implementado. El README es la guía operativa principal, con discrepancias indicadas más abajo.
3. Tratar IMPLEMENTACION.md, SPEC.md y tasks/plan.md como contexto histórico: contienen decisiones y casillas obsoletas.
4. SPEC.md indica consultar antes de cambiar `schema.prisma` o agregar dependencias. Respetar esa restricción salvo autorización posterior del usuario.
5. No guardar secretos, volcar variables privadas ni ejecutar migraciones, seeds o pruebas destructivas contra una base real por accidente.

## 3. Stack y ejecución

- Node requerido: 22.x.
- Next.js 16.4.3, App Router; React 19.3.0; TypeScript.
- Auth.js 5.0.0-beta.25, credenciales y roles.
- Prisma 6, PostgreSQL y `@prisma/adapter-pg`, cliente sin motor Rust.
- Tailwind CSS 4, Zod, bcryptjs, Recharts y xlsx.
- Vitest para pruebas. Playwright y `test:e2e` no están configurados en el package.json actual.
- Desarrollo y build usan Webpack explícitamente.
- Producción prevista: Vercel + Neon; no se comprobó que esté desplegada.

Arranque local, desde PowerShell y con PostgreSQL local identificado:

```powershell
npm install
Copy-Item .env.example .env  # solo si no existe; preservar configuración existente
docker compose up -d
npx prisma migrate dev
npx prisma db seed
# Opcional, una sola vez en una base de demostración:
npm run db:demo
npm run dev
```

`DATABASE_URL` es la conexión de la aplicación y `DATABASE_URL_UNPOOLED` la conexión directa de migraciones. En Docker ambas apuntan a localhost:5432/planta según .env.example. Configurar también AUTH_SECRET. No se inspeccionaron archivos de secretos durante este handover.

Comandos de revisión: `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`. **No usar `build:prod` para una simple revisión local:** ejecuta preparación de base y migraciones antes del build.

## 4. Mapa del código y funcionalidades existentes

| Bloque | Evidencia y puntos de entrada |
|---|---|
| Autenticación y usuarios | `src/auth.ts`, `src/auth.config.ts`, `src/proxy.ts`, `src/lib/session.ts`, `src/actions/usuarios.ts`, rutas `/usuarios` y `/cuenta` |
| Inventario | `src/actions/inventario.ts`, `src/lib/stock.ts`, schemas de inventario, rutas `/inventario`, entrada/salida/ajuste y kardex por material |
| OT y producción | `src/actions/produccion.ts`, schemas de producción, `/produccion/clientes`, `/produccion/ordenes`, `/produccion/registro` |
| Costos | `src/lib/costos.ts`, `src/actions/costos.ts`, `/costos/turno`, `/costos/por-ot`, `/costos/desperdicio` |
| Gastos generales | `src/actions/gastos.ts`, `src/lib/gastos.ts`, `/costos/gastos`, exportación de gastos |
| Cobranzas | `src/actions/cobranzas.ts`, `src/lib/cartera*.ts`, entregas, pagos, cartera y ficha por cliente |
| Kardex Excel | `src/lib/lectura-excel.ts`, `kardex-parser.ts`, `kardex-import.ts`, `src/actions/kardex.ts`, `scripts/revisar-kardex.ts` |
| Notas de crédito | Modelo `NotaCredito`, acciones de cobranzas y `/cobranzas/nota-credito`; devoluciones, descuentos y anulación |
| Resumen y gráficos | `src/lib/resumen-cobranzas*.ts`, `/cobranzas/resumen` |
| Avisos | `src/lib/avisos*.ts`, `notificaciones-db.ts`, `src/actions/notificaciones.ts`, campana y `/notificaciones` |
| Rechazos por proveedor | Campos de RegistroProduccion, `src/lib/rechazos.ts`, `/inventario/rechazos`, exportación de rechazos |
| Reportes | `/dashboard`, `/reportes`, handlers `src/app/api/export/*` |

UI compartida: `src/components/ui/`. Reutilizar `Encabezado`, `Cifras`, `CampoNumero`, `Opciones`, `ElegirTurno`, `Selector`, mensajes y estados vacíos. Etiquetas en `src/lib/etiquetas.ts`. Formularios de referencia: `costos/gastos/nuevo/gasto-form.tsx`; listas: `produccion/ordenes/page.tsx`, dentro de `src/app/(app)/`.

## 5. Modelo e invariantes que se deben preservar

Entidades principales: User, Cliente, Material, MovimientoInventario, OrdenTrabajo, RegistroProduccion, Entrega, Pago, NotaCredito, Gasto, CostoTurno y Notificacion.

- Movimientos de inventario inmutables. Corregir mediante AJUSTE con motivo; nunca editar ni borrar el historial.
- Stock = ENTRADA − SALIDA + AJUSTE con signo. Las acciones de inventario usan transacciones y un advisory lock PostgreSQL por material para serializar movimientos; preservar esa protección.
- SALIDA requiere stock suficiente, usuario, turno y motivo. El costo de salida se utiliza para valorar los materiales de una OT.
- Producción: kgBuenos + kgMerma + kgRechazado = kgEntrada.
- Kg finales de una OT: los de la última área registrada, en orden extrusión → impresión → confección. No sumar producto de las tres áreas como si fueran unidades independientes.
- `asignarCostosPorOrden()` incluye materia prima, tintas, mano de obra y energía. Distribuye MO y energía por fecha/turno proporcionalmente a los kg buenos; usa reparto igual si no hubo kg buenos. Los gastos generales quedan fuera.
- Cartera debe descontar pagos y notas de crédito vigentes. Una devolución o descuento no es un ingreso de dinero; una nota anulada conserva el historial y deja de descontar deuda.
- Importación de kardex: analizar antes de guardar, conservar idempotencia mediante `origenKey` y validar el saldo contra Excel. Soporta devoluciones, formatos numéricos locales y advertencias sobre datos ambiguos.
- Kg y Bs: 2 decimales; precios/costos unitarios: hasta 4. Reutilizar `src/lib/schemas/numero.ts` y `CampoNumero` para interpretar separadores bolivianos.
- Usar America/La_Paz para fechas de negocio; existe `fechaLaPaz()` en session.ts. Evitar sustituir fechas locales por recortes de UTC sin revisar el significado.
- Roles: OPERADOR, ALMACEN, ADMIN y GERENCIA. Verificar permisos en cada acción y Route Handler; `proxy.ts` excluye `/api` de su matcher.
- `getSessionUser()` contrasta usuario activo y `sesionVersion` contra la base. Preservar invalidación de sesión por cambio de clave, rol o desactivación.
- Según README: sesiones de 12 horas, bloqueo tras 5 intentos por 15 minutos, cambio obligatorio de clave temporal y al menos una Gerencia activa. Incluir estos casos en la validación funcional.

## 6. Discrepancias documentales y límites conocidos

| Hallazgo | Acción recomendada |
|---|---|
| IMPLEMENTACION.md menciona Render; README y configuración apuntan a Neon | Mantener Vercel + Neon como arquitectura actual y actualizar el documento histórico |
| Plan antiguo menciona middleware.ts | Usar `src/proxy.ts`; consultar guía local de Next antes de modificarlo |
| SPEC describe Playwright y test:e2e | No presentar E2E como existentes; acordar su incorporación si se necesitan |
| tasks/plan.md conserva tareas base sin marcar y un checkpoint de fase 6 pendiente de DB | No usar las casillas como inventario fiable; reconciliarlas con pruebas reales |
| README muestra un log de «2 migrations found» | Hay 9 migraciones versionadas, hasta `20261110000000_rechazos_proveedor`; actualizar el ejemplo |
| README simplifica costo por 100 kg a MO + energía | El código incluye MP y tintas; corregir la fórmula documental preservando gastos generales fuera |
| README simplifica cartera a entregas − pagos | Incorporar notas de crédito vigentes a la explicación |
| README propone aplicar un parche/ZIP histórico | No repetir esos pasos sobre el repositorio actual ni recrear el proyecto |
| Documentos antiguos limitan Gerencia a lectura; README y acciones permiten escrituras | Revisar permisos reales en auth.config y acciones; documentar una matriz consistente |
| Se menciona PWA en el plan inicial | No se verificó instalación PWA ni soporte offline; no asumir que existen |

Los precios, límites de planes y pasos de paneles externos del README no fueron verificados. Consultar documentación oficial vigente si el siguiente trabajo es desplegar.

## 7. Verificación realizada

- Árbol Git limpio al iniciar la revisión.
- `npm test`: **123 pruebas aprobadas, 8 omitidas**, en 9 archivos aprobados y 1 omitido.
- `npm run typecheck`: aprobado, sin errores.
- `npm run lint`: termina correctamente, sin errores y con un warning `import/no-anonymous-default-export` en `postcss.config.mjs:1`.
- Las 8 omitidas son de integración de kardex y requieren `TEST_DATABASE_URL`.
- Atención concreta para esas pruebas: `kardex-import.db.test.ts` ejecuta `TRUNCATE ... CASCADE` sobre tablas de negocio. Usar exclusivamente una base de pruebas desechable, migrada, nunca la base operativa ni una base local con datos importantes.
- La primera ejecución de Vitest fue bloqueada por acceso del sandbox al resolver la configuración con esbuild; la repetición fuera del sandbox terminó correctamente.
- No se ejecutaron migraciones, seeds, build, importaciones reales ni recorridos de UI. No hay confirmación de despliegue o del checkpoint de fase 6 con DB.

## 8. Continuación recomendada, en orden

1. Registrar `git status`, revisar estos archivos y confirmar que se usa Node 22. Identificar una base local/de pruebas sin exponer credenciales.
2. Completar lint, typecheck y build normal. Registrar resultados y corregir fallos comprobados antes de ampliar alcance.
3. Levantar una base de pruebas aislada, aplicar migraciones y ejecutar integración de kardex con TEST_DATABASE_URL apuntando a esa base.
4. Validar manualmente por rol: login/cambio de clave; entrada → salida → ajuste y stock; OT → producción por áreas; costo de turno y costo final; entrega → pago → devolución/descuento → anulación; importación repetida sin duplicados; avisos y exportaciones. Probar celular y escritorio.
5. Para costos, añadir casos de lógica crítica sobre kg finales, reparto entre dos OT, materiales/tintas y fechas cerca de medianoche si se modifica esa lógica. Actualmente no hay archivo `costos.test.ts` en el listado revisado.
6. Reconciliar README, SPEC, IMPLEMENTACION y tasks/plan con evidencia; cerrar el checkpoint de fase 6 solo tras validar con DB.
7. Antes de implementar una nueva función, definir con el usuario el resultado esperado y sus criterios de aceptación. Las preguntas históricas sobre catálogo, máquinas o facturación requieren revisión; varias sobre OT/pagos ya tienen soporte en el modelo actual.

Una tarea se considera lista cuando el flujo funciona con base local, respeta permisos e invariantes, pasa las comprobaciones pertinentes y deja documentación de cambios y limitaciones. No marcar como desplegado algo comprobado solo en local.

## 9. Despliegue y operación

`vercel.json` usa `npm run build:prod`. `scripts/preparar-base.mjs` requiere ambas URL, ejecuta `prisma migrate deploy` y carga seed solo si `SEED_ON_DEPLOY=true`. El demo requiere además `SEED_DEMO=true` y ausencia de clientes.

Existe una opción adicional: `RESET_CLAVE_GERENCIA` junto con `CONFIRMAR_RESET_CLAVE_GERENCIA=true` restablece/crea `gerencia@planta.local` durante la preparación, exige cambio de clave e invalida sesiones. La confirmación explícita se añadió al preparar el despliegue porque había una variable de recuperación antigua en Vercel. Sin ella, un deploy normal conserva la contraseña actual. Tratar ambas variables como recuperación puntual y quitarlas al terminar.

Antes del uso real, seguir el endurecimiento descrito en README: cambiar claves de demostración, quitar perfiles demo y flags de seed. Los enlaces públicos no deben ofrecer acceso a las cuentas de prueba. No recrear ni vaciar bases con información real como parte de la continuación rutinaria.

## 10. Prompt listo para otra IA

> Continúa el proyecto existente leyendo AGENTS.md y HANDOVER.md. Revisa README.md y el código relevante; consulta la documentación local de Next.js antes de escribir código. No reinicialices la aplicación ni asumas que las casillas del plan histórico reflejan el estado real. Empieza por verificar el estado Git, lint/typecheck/build y los flujos con una base local aislada. Conserva movimientos inmutables, permisos en servidor, fechas de La Paz, formatos numéricos e idempotencia del kardex. Ejecuta las pruebas DB únicamente contra una base desechable porque truncan tablas. Informa hallazgos y resultados comprobados; si no existe una nueva tarea definida, solicita el objetivo funcional después de completar la revisión independiente. Respeta las restricciones de SPEC.md sobre esquema y dependencias salvo autorización posterior.
