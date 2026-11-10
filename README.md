# Sistema de Gestión de Planta — Bolsas Plásticas y Reciclado

Sistema web para inventario trazable, producción y costos, y cobranzas. La interfaz sigue el estilo de Todoist con celeste agua como color principal.

## Stack

- Next.js 16 (App Router) + TypeScript
- PostgreSQL (Neon en producción) + Prisma 6 (adaptador `pg`, sin motor Rust)
- Despliegue: Vercel
- Auth.js v5 (correo y contraseña) con roles
- Tailwind CSS 4
- Zod, bcryptjs, Vitest

## Roles

| Rol | Permisos |
|---|---|
| OPERADOR | Registrar producción de su turno |
| ALMACEN | Entradas, salidas, ajustes, stock |
| ADMIN | Clientes, OT, entregas, pagos, gastos, costos |
| GERENCIA | Todo + reportes + dashboard + export Excel |

---

## Publicar en Vercel + Neon (guía paso a paso)

La app vive en **Vercel**, que ejecuta Next.js, y los datos en **Neon**, un PostgreSQL. Las dos cuentas son gratis y no piden tarjeta. La base se crea desde el mismo panel de Vercel, que conecta las variables de entorno solo.

Tiempo estimado: 15 minutos.

### Qué hace el repositorio por ti

- `vercel.json` le indica a Vercel que compile con `npm run build:prod`.
- `scripts/preparar-base.mjs` corre en cada despliegue, antes de compilar. Aplica las migraciones a Neon. Si `SEED_ON_DEPLOY=true`, crea los usuarios y materiales, sin duplicar si se repite. Si `SEED_DEMO=true`, carga los datos de demostración, pero solo cuando la base todavía no tiene clientes.
- `prisma/schema.prisma` usa dos conexiones. `DATABASE_URL`, con pooling, es la que usa la app. `DATABASE_URL_UNPOOLED`, directa, es la que usan las migraciones. Son exactamente las dos variables que crea la integración de Neon en Vercel.

### Paso 1 — Subir el código a GitHub

Los cambios tienen que estar en tu repositorio `Nano3559/Plasticos`, porque Vercel despliega desde ahí. Desde la carpeta del proyecto en tu computadora:

```bash
git pull
git am plasticos-vercel-neon.patch     # aplica todos los cambios (UI + despliegue)
git push
```

Si prefieres no usar el parche: descomprime `Plasticos-vercel-neon.zip` y copia su contenido encima de tu carpeta. Reemplaza todo y **borra** `src/middleware.ts`, `postcss.config.js` y `render.yaml` si siguen ahí. Después:

```bash
git add -A
git commit -m "UI estilo Todoist y despliegue en Vercel + Neon"
git push
```

Antes de seguir, comprueba en github.com que aparecen los archivos `vercel.json` y `scripts/preparar-base.mjs`.

### Paso 2 — Crear la cuenta de Vercel e importar el proyecto

1. Entra a https://vercel.com/signup y elige **Continue with GitHub**. Usa la misma cuenta donde está el repositorio. El plan **Hobby** es gratis.
2. En el panel pulsa **Add New… → Project**.
3. Busca `Plasticos` y pulsa **Import**. Si no aparece, pulsa **Adjust GitHub App Permissions**, dale acceso al repositorio y vuelve.
4. En la pantalla de configuración **no cambies** *Framework Preset*, *Root Directory* ni *Build and Output Settings*. Vercel los toma de `vercel.json`.
5. Abre **Environment Variables** y agrega estas cuatro, una por una (Key y Value):

   | Key | Value |
   |---|---|
   | `AUTH_SECRET` | Un texto largo y aleatorio. Puedes generarlo en https://generate-secret.vercel.app/32 o con `npx auth secret` |
   | `SEED_ON_DEPLOY` | `true` |
   | `SEED_DEMO` | `true` |
   | `NEXT_PUBLIC_MOSTRAR_PERFILES_DEMO` | `true` |

6. Pulsa **Deploy**.

> **Este primer despliegue va a fallar, y es lo esperado:** todavía no hay base de datos. En el registro verás el mensaje *✖ Faltan DATABASE_URL y/o DATABASE_URL_UNPOOLED*. Sigue con el paso 3.

### Paso 3 — Crear la base Neon desde Vercel

1. Entra al proyecto `plasticos` en Vercel y abre la pestaña **Storage**.
2. Pulsa **Create Database**, elige **Neon (Serverless Postgres)** y pulsa **Continue**.
3. Acepta los términos de Neon. La cuenta de Neon se crea sola, vinculada a Vercel.
4. Configura la base:
   - **Region:** `Washington, D.C., USA (East) – iad1`. Es la misma región donde Vercel ejecuta las funciones, así cada consulta es más rápida.
   - **Plan:** **Free**.
   - **Database name:** `plasticos`.
5. Pulsa **Create**. Cuando pregunte a qué entornos conectar, deja marcados **Development**, **Preview** y **Production**, deja el prefijo vacío (o como `DATABASE`) y pulsa **Connect**.
6. Comprueba en **Settings → Environment Variables** que aparecen `DATABASE_URL` y `DATABASE_URL_UNPOOLED`. Además de esas dos, la integración crea otras como `PGHOST` o `POSTGRES_URL`. Déjalas, no molestan.

> Si al conectar aparece *Failed to set environment variables*, ya existe una `DATABASE_URL` cargada a mano. Bórrala en **Settings → Environment Variables** y vuelve a conectar la base.

### Paso 4 — Desplegar de nuevo

1. Ve a la pestaña **Deployments**, abre el menú **⋯** del despliegue fallido y pulsa **Redeploy**. Confirma con **Redeploy**.
2. Espera 2 a 4 minutos. En el registro (*Building*) deberías ver, en este orden:
   - `2 migrations found` … `All migrations have been successfully applied`
   - `→ SEED_ON_DEPLOY=true: cargando usuarios y materiales iniciales`
   - `→ SEED_DEMO=true y la base no tiene clientes: cargando datos de demostración`
   - la compilación de Next.js y, al final, **Ready**.
3. Pulsa **Visit**. La URL será parecida a `https://plasticos-xxxx.vercel.app`.

### Paso 5 — Probar

En el login aparecen los botones de **Perfiles de prueba**. Toca cualquiera para entrar con ese rol, o escribe el correo y la contraseña:

| Rol | Correo | Contraseña |
|---|---|---|
| ADMIN | admin@planta.local | 123456 |
| ALMACEN | almacen@planta.local | 123456 |
| OPERADOR | operador@planta.local | 123456 |
| GERENCIA | gerencia@planta.local | 123456 |

A partir de ahora, **cada `git push` a `main` despliega solo**. Las migraciones nuevas se aplican en ese mismo despliegue y los datos de demostración no se vuelven a cargar.

### Paso 6 — Antes de que la planta la use de verdad

Mientras los perfiles de prueba estén activos, **cualquiera con el enlace puede entrar como Gerencia**. Cuando termines de probar, haz esto:

1. **Copia las variables a tu computadora.** Instala la CLI de Vercel y vincula la carpeta. El último comando crea `.env.local` con las URL de Neon:
   ```bash
   npm i -g vercel
   vercel link
   vercel env pull .env.local
   ```
   Luego copia `DATABASE_URL` y `DATABASE_URL_UNPOOLED` de `.env.local` a tu `.env`. Otra forma: en Vercel ve a **Storage → tu base → .env.local → Show secret** y cópialas de ahí.
2. **Cambia las 4 contraseñas.** Entra como Gerencia y en **Mi cuenta** cambia la tuya. Después, en **Usuarios**, pulsa **Nueva contraseña** en cada uno de los otros tres. La página marca en rojo a quien siga con «123456». Si prefieres hacerlo desde tu computadora, también sirve `npm run usuario:clave -- <correo> "<clave>"`. En ese caso, **vuelve a dejar tu `.env` apuntando a la base local**, para no trabajar sin querer sobre los datos reales.
3. **Oculta los perfiles de prueba.** En Vercel, en **Settings → Environment Variables**, borra `NEXT_PUBLIC_MOSTRAR_PERFILES_DEMO`, `SEED_DEMO` y `SEED_ON_DEPLOY`. Luego ve a **Deployments → ⋯ → Redeploy**.
4. **Opcional:** si cargaste datos de demostración y quieres empezar limpio, pide ayuda antes de borrar nada. Los movimientos de inventario son inmutables por diseño, así que lo correcto es recrear la base, no borrar filas a mano.

### Límites del plan gratis

- **Neon Free:** 0,5 GB de almacenamiento y 100 horas de cómputo al mes. La base se suspende sola tras 5 minutos sin uso y despierta en menos de un segundo. Para una planta es suficiente durante un buen tiempo. El consumo se ve en https://console.neon.tech.
- **Vercel Hobby:** cada petición puede pesar como máximo **4,5 MB**. En **Cobranzas → Kardex**, sube los Excel en tandas que no pasen de ese tamaño. El plan Hobby es para uso no comercial. Cuando la planta lo use para trabajar, Vercel pide el plan Pro.
- **Respaldos:** Neon Free permite restaurar la base a cualquier momento de las últimas 6 horas, desde la sección **Backup & Restore** en console.neon.tech. Para un respaldo propio, desde tu computadora y con Postgres instalado:
  ```bash
  pg_dump "<DATABASE_URL_UNPOOLED>" > respaldo-$(date +%F).sql
  ```

### Problemas comunes

| Síntoma | Causa y solución |
|---|---|
| *✖ Faltan DATABASE_URL y/o DATABASE_URL_UNPOOLED* | La base no está conectada al proyecto o al entorno. Ve a **Storage → la base → Connect Project** y marca Production y Preview. Después, Redeploy |
| `P1001: Can't reach database server` | La base Neon está en pausa por exceso de uso o fue borrada. Revisa en console.neon.tech |
| `P3009` o `migrate found failed migrations` | Una migración quedó a medias. En tu PC, con `.env` apuntando a Neon: `npx prisma migrate resolve --rolled-back <nombre>` y vuelve a desplegar |
| El login vuelve siempre a la misma pantalla | Falta `AUTH_SECRET` en Production. Agrégala y haz Redeploy |
| Los perfiles de prueba no aparecen o no desaparecen | `NEXT_PUBLIC_…` se lee al compilar: después de cambiarla hay que hacer Redeploy |
| Error 413 al importar kardex | Superaste los 4,5 MB por envío. Sube menos archivos a la vez |
| La primera carga del día tarda 1 o 2 segundos | Neon está despertando la base. Es normal en el plan gratis |

## Importar el historial de clientes (kardex en Excel)

En **Cobranzas → Kardex → Importar** sube uno o varios Excel, uno por cliente. Primero se muestra un análisis y no se guarda nada hasta que confirmas. Si vuelves a importar el mismo archivo, o una versión ampliada, solo se agregan las filas nuevas.

**Si tienes muchos archivos, revísalos todos de una vez antes de subirlos.** Pon los Excel en una carpeta y ejecuta, desde la carpeta del proyecto:

```bash
npm run kardex:revisar -- "C:\Users\TuUsuario\Documents\Kardex"
```

Ese comando no toca la base de datos. Muestra cada archivo como **LISTO**, **LISTO (con avisos)** o **REVISAR**, con las filas a corregir y si el saldo cuadra con el del Excel. Además deja un resumen `revision-kardex.csv` en la misma carpeta, que se abre con Excel. Sube en la app los archivos LISTO, en tandas de hasta 40. Los que digan REVISAR corrígelos primero.

Lo que el importador acomoda solo, avisándote:

- **Filas "corridas":** el producto escrito en *Cantidad S/G OT* y la medida en *Producto*.
- **Membrete de la planta arriba del cliente:** el teléfono de la planta no se toma como teléfono del cliente.
- **Bultos escritos a mano:** "5 1/2" o "2½" se guardan como 5,5 o 2,5. Si dice algo que no es un número, la fila se importa igual, sin los bultos. Los montos escritos como "40.-" se leen como 40.
- **Medio de pago:** se deduce del texto. "EFECTIVO" se registra como efectivo. "TRANSFERENCIA", "CTA. CORRIENTE" o "CUENTA DE L.D.G.V." se registran como transferencia. Si no se puede saber, queda como "Otro".

Lo que conviene revisar en el Excel antes de importar:

- **Fechas fuera de orden**, por ejemplo 01/01/2026 en vez de 01/10/2026. No cambian el saldo, pero sí la antigüedad de la deuda.
- **Devoluciones anotadas solo en observaciones**, como "SE DEVOLVIO". No están descontadas en el Excel. Escríbelas como una fila con kg negativos o regístralas en «Devolución / descuento».
- **Al final del análisis, el saldo calculado debe coincidir con el último saldo del Excel.** Si no coincide, revisa las filas con error antes de importar.

## Usuarios y contraseñas

**Gerencia** administra los usuarios en **Administración → Usuarios** (`/usuarios`). Desde ahí puede hacer lo siguiente:

- **Agregar un usuario:** se elige su rol y el sistema crea una contraseña temporal, por ejemplo `Bobina-4821-Valle`. Se muestra una sola vez, lista para copiar o mandar por WhatsApp. En su primer ingreso, la persona está obligada a elegir su propia contraseña.
- **Editar:** cambiar el nombre o el rol, o desactivar el acceso. Los usuarios no se borran, para no perder quién registró cada movimiento. Al cambiar el rol o desactivar a alguien, se cierra su sesión en todos sus dispositivos.
- **Nueva contraseña:** sirve si alguien la olvidó. Crea otra temporal y cierra sus sesiones.
- **Desbloquear:** después de 5 intentos fallidos, la cuenta se bloquea 15 minutos.

La página avisa en rojo quién sigue con la contraseña de prueba «123456».

Cada persona cambia su contraseña en **Mi cuenta**: en la barra lateral, toca su nombre; en el celular, su inicial arriba. La contraseña nueva debe tener al menos 8 caracteres, no puede ser una de las más comunes y no puede contener el usuario ni el nombre. Después del cambio, hay que volver a entrar.

Por seguridad, hay dos reglas fijas:

- Gerencia no puede desactivarse ni quitarse su propio rol.
- Siempre tiene que quedar al menos una persona de Gerencia activa.

Además, las sesiones duran 12 horas.

Si todas las personas de Gerencia olvidan su contraseña, desde la computadora se puede ejecutar `npm run usuario:clave -- gerencia@planta.local "NuevaClave2026"`.

## Devoluciones y descuentos (notas de crédito)

Sirven cuando el cliente devuelve producto o se le hace una rebaja. Rebajan lo que el cliente debe, pero **no cuentan como cobro**, porque no entró plata. Se registran en **Cobranzas → Kardex → Devolución / descuento**. También se llega desde la ficha del cliente o desde su resumen.

- **Devolvió producto:** eliges la OT y los kg devueltos. El monto se calcula solo, con el precio de esa OT. No deja devolver más kg de los entregados en esa OT, descontando lo ya devuelto.
- **Descuento o ajuste:** escribes el monto y el motivo. La OT es opcional.

Cada nota queda en el kardex con el nombre de quien la registró y no se edita ni se borra. Si se cargó mal, **Gerencia la anula** desde el kardex con el botón «Anular» y escribe el motivo. La nota anulada sigue visible, tachada, pero deja de rebajar la deuda.

**Al importar kardex**, el importador reconoce dos formas de anotar una devolución o un descuento:

- **Kg y total en negativo**, por ejemplo `-13,60` kg y `-544` de total. Se importa como devolución y se enlaza a la OT del mismo número.
- **Una fila cuyo texto dice "DEVOLUCIÓN", "NOTA DE CRÉDITO", "DESCUENTO", "BONIFICACIÓN" o "REBAJA"**, con el monto en *Pago a cuenta*. Se importa como nota de crédito y no como pago. Si el texto empieza con "PAGO …", sigue contando como pago.

Una devolución anotada solo en la columna de observaciones, como "13,60 SE DEVOLVIO", no se descuenta. El importador avisa para que la registres a mano.

Las devoluciones y descuentos se reflejan en el saldo, la cartera, el resumen con gráficos, el inicio y el Excel de cartera.

## Resumen de cobranzas con gráficos

Está en **Cobranzas → Resumen y gráficos** (`/cobranzas/resumen`). En el inicio de Administración y Gerencia también aparece un resumen de los últimos 6 meses. Arriba de la página eliges **Todos los clientes** o uno en particular, y el periodo: 6 meses, 12 meses, 2 años o todo el historial. El enlace queda en la barra de direcciones, así que se puede guardar o compartir.

- **Cifras:** cuánto falta cobrar y cuánto está en mora, cuánto se cobró y cuánto se entregó en el periodo, y cuántos días tardan en promedio en pagar.
- **Avance:** porcentaje de lo entregado que ya está pagado. También estima en cuántos meses se cobraría lo pendiente, al ritmo de los últimos 3 meses.
- **Gráficos:** lo entregado y lo cobrado por mes con la línea del saldo, la antigüedad de la deuda y los medios de pago.
- **Todos los clientes:** quién debe más, y una tabla con cada cliente que abre su propio resumen al hacer clic.
- **Un cliente:** qué productos compra, sus últimos movimientos con el saldo corrido, y accesos para registrar un pago o ver su kardex. Si tiene teléfono, también aparece un recordatorio por WhatsApp.

## Gastos generales

Está en **Costos → Gastos generales** (`/costos/gastos`), para Administración y Gerencia. Sirve para todo lo que la planta paga aparte de materia prima, mano de obra y energía: mantenimiento, repuestos, fletes, alquiler, servicios, impuestos.

- **Registrar:** categoría (hay botones para las más comunes, o se escribe otra), monto, fecha, detalle y N° de factura o recibo. El monto se puede escribir como `1.250,50` o `1250.50`. Queda guardado quién lo registró.
- **Ver por mes:** total del mes, comparación con el mes anterior, barras de los últimos 6 meses y reparto por categoría. Las flechas cambian de mes y el enlace queda en la barra de direcciones (`?mes=2026-11`).
- **Borrar:** el ícono de papelera junto a cada gasto lo elimina, después de confirmar. No se puede deshacer.
- **Excel:** el botón de la página descarga el mes que estás viendo. En **Reportes** se descargan todos.

Los gastos generales **no** entran en el costo por 100 kg: ese cálculo sigue siendo materia prima, tintas, mano de obra y energía.

## Avisos de inventario

Cada vez que alguien registra un **vale de salida** o un **ajuste** de inventario, Almacén y Gerencia reciben un aviso dentro de la app. Quien hizo el movimiento no recibe su propio aviso. Si la salida o el ajuste deja un material **por debajo de su stock mínimo**, llega además un aviso de reposición, una sola vez: no se repite mientras el material siga bajo el mínimo.

- **Campana:** en la barra lateral (escritorio) y en la barra superior (celular), con la cantidad sin leer. Se actualiza cada minuto y al volver a la pestaña.
- **Página de avisos** (`/notificaciones`): material, kg, quién lo hizo, turno, OT y motivo. Al tocar un aviso se marca como leído y abre el kardex de ese material. También se pueden marcar todos como leídos.
- Los avisos leídos se borran solos a los 90 días.
- Para cambiar quién recibe los avisos, edita `ROLES_AVISO_INVENTARIO` en `src/lib/avisos-texto.ts`.

## Rechazos de material por proveedor

Cuando el operador registra producción en **Extrusión** con kg rechazados, el formulario pide de dónde vino ese material y por qué se rechazó:

- **Lote:** se elige de la lista de entradas de almacén de los últimos 6 meses. Primero aparecen los lotes del material que se entregó a esa OT con vale de salida. El proveedor se toma de la entrada, no se escribe. Si el lote no está en la lista, se puede escribir el proveedor y el lote a mano.
- **Motivo:** húmedo, sucio o contaminado, mezclado, color incorrecto, no funde bien, peso no coincide u otro, con un detalle opcional.
- En Impresión y Confección no se pide: ahí el rechazo es del producto, no de la materia prima.

Cada rechazo avisa a Almacén y Gerencia por la campana. En **Inventario → Rechazos por proveedor** (`/inventario/rechazos`) se ve, para los últimos 3, 6 o 12 meses, cuántos kg entregó cada proveedor, cuántos se rechazaron, el porcentaje (en rojo si pasa del 5%), el motivo más común y los lotes. Tocando un proveedor se ven solo sus rechazos. El botón Excel descarga el detalle. Los rechazos registrados antes de esta función aparecen como "Sin proveedor".

## Cómo escribir números

Todos los campos de kg, Bs y precios aceptan el número como se escribe en Bolivia: `1.250,50` (punto para miles, coma para decimales). También funcionan `1250,50`, `1250.50` y `Bs 120`. Debajo del campo aparece cómo se entendió, por ejemplo «Se guardará: 1.250,50 kg».

- En kg y Bs (2 decimales), `1.250` es mil doscientos cincuenta.
- En precios y costos por kg (hasta 4 decimales), `14.375` es catorce coma trescientos setenta y cinco.
- La misma regla se aplica en el servidor (`src/lib/schemas/numero.ts`), así que no depende de la pantalla.

## Interfaz

Todas las pantallas usan las mismas piezas de `src/components/ui/`: `Encabezado` (migas, título y acciones), `Cifras` (fila de números clave), `CampoNumero`, `Opciones` (botones grandes para turno, área o medio de pago), `ElegirTurno`, `Selector`, `MensajeError`, `MensajeInfo` y `Vacio`. Los nombres de turnos, áreas, categorías y medios de pago salen de `src/lib/etiquetas.ts`. Para una pantalla nueva, conviene copiar una existente parecida: `src/app/(app)/costos/gastos/nuevo/gasto-form.tsx` para un formulario, o `src/app/(app)/produccion/ordenes/page.tsx` para una lista.

## Desarrollo local

### Partes de extrusión desde Excel

En **Producción → Extrusión** (`/produccion/extrusion`) se importa el formato **ORDEN DE TRABAJO SECCION DE EXTRUCCION**. El archivo de referencia tiene una hoja vacía `Plantilla (2)` y una hoja de ejemplo `OT 1`. El desarrollo comienza en la fila 18; se conservan ficha técnica, consumos, bobinas e interrupciones. El nombre de hoja es configurable.

1. Aplicar la migración `20261110120000_partes_extrusion` con `npm run db:migrate` sobre la base del entorno correcto y regenerar el cliente con `npx prisma generate`. En Vercel la aplica `build:prod`.
2. Crear primero una OT abierta con cliente, producto, número de referencia y kg pedidos que coincidan con el Excel. El precio se registra en la OT; no se inventa a partir del parte de extrusión.
3. Como ADMIN o GERENCIA, seleccionar OT y archivo `.xlsx`/`.xls` (hasta 4 MB), **Analizar sin guardar**, revisar ficha, filas y avisos y confirmar.
4. Consultar métricas, gráficos y filtros por fechas, OT, máquina, turno y operador. El reporte Excel incluye resumen, detalle, agrupaciones y criterios del cálculo. OPERADOR y ALMACEN pueden consultar; ADMIN y GERENCIA importan y exportan.

Cada importación conserva una versión del parte. Un archivo idéntico no duplica métricas ni avisos; una versión actualizada sustituye el parte completo en los reportes y conserva las versiones anteriores en la base. Las actualizaciones concurrentes requieren repetir el análisis. No mezclar varios partes parciales como si fueran versiones completas de una misma OT.

Las métricas incluyen material utilizado, kg producidos, bobinas, peso medio, desperdicio, rendimiento aparente, avance sobre pedido y balance por conciliar. Los reportes suman el detalle, no los totales almacenados por Excel. Los gráficos y la tabla respetan los filtros; la ficha y el avance por OT muestran el parte completo.

Después de importar, **Planilla de extrusión** muestra el parte con la estructura del Excel: ficha técnica, encabezados agrupados, totales por material y filas con acumulados de consumo y bobinas. Tiene encabezados fijos y desplazamiento para pantallas pequeñas. Esta planilla conserva el orden original y muestra la OT completa; los filtros del periodo corresponden al análisis y al reporte de abajo.

**Balance por conciliar = material utilizado − kg de bobinas − desperdicio**. No se interpreta automáticamente como merma, rechazo o stock disponible. En el ejemplo: 1.632 − 1.008 − 36 = **588 kg pendientes de conciliar**. El parte no crea movimientos de inventario, entregas, pagos ni pesajes operativos; sus reportes quedan separados para evitar duplicar los registros existentes. No se calcula OEE ni kg/h sin horas operativas. Los tiempos se cargan como `hh:mm` o duración Excel; números enteros sin unidad se rechazan.

Al importar, ADMIN, GERENCIA y ALMACEN activos reciben un aviso en la campana, salvo quien hizo la importación. Incluye advertencias por balance, desperdicio superior al 5% (umbral de seguimiento), pedido alcanzado e interrupciones sin duración. Son avisos internos al importar, no correos ni notificaciones push. El aviso de pedido alcanzado no cierra la OT automáticamente.

Necesitas Node 22 y Docker.

```bash
npm install                 # también genera el cliente de Prisma
cp .env.example .env        # en Windows: copy .env.example .env  (las dos URL apuntan a Docker)
docker compose up -d        # levanta PostgreSQL en el puerto 5432
npx prisma migrate dev      # crea las tablas
npx prisma db seed          # usuarios y materiales iniciales
npm run db:demo             # (opcional) datos de demostración, una sola vez
npm run dev                 # http://localhost:3000
```

### Comandos útiles

```bash
npx prisma studio                               # ver y editar la base
npm run db:migrate                              # aplicar migraciones (producción)
npm run usuario:clave -- <correo> "<clave>"     # cambiar una contraseña
npm run lint && npm run typecheck && npm test   # revisar el código
docker compose stop                             # parar la base local
```

## Reglas clave

- **Movimientos inmutables:** nunca se editan ni se borran movimientos de inventario. Las correcciones se hacen con un `AJUSTE` y su motivo.
- **Stock** = suma de movimientos (ENTRADA − SALIDA ± AJUSTE).
- **Salida:** requiere stock suficiente, motivo, turno y usuario.
- **Producción:** kgBuenos + kgMerma + kgRechazado = kgEntrada.
- **Costo por 100 kg:** (MO + Energía) / kg buenos × 100.
- **Cartera:** kg entregados × precio − pagos. La antigüedad se cuenta desde la fecha de entrega.

## Estructura

```
src/
  app/          # App Router (auth, app, api)
  actions/      # Server Actions
  components/   # UI y layout (barra lateral estilo Todoist)
  lib/          # prisma, schemas, utilidades
  auth.ts       # Auth.js
  proxy.ts      # control de acceso por rol (reemplaza a middleware.ts en Next 16)
prisma/
  schema.prisma, migrations/, seed.ts, demo.ts
scripts/
  preparar-base.mjs         # migraciones + seed en cada despliegue de Vercel
  cambiar-clave.mjs         # cambiar contraseñas
vercel.json                 # configuración de despliegue
```
