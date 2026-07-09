# Woodbase 🪵

Inventario personal de madera para el taller. Registra tablones y piezas con su foto, dimensiones, estado de secado y ubicación — e identifica la especie a partir de una foto con la IA de Claude.

**Stack:** Next.js (App Router, TypeScript) · Neon (Postgres) · Drizzle ORM · Vercel Blob · API de Claude (visión) · Tailwind CSS + componentes estilo shadcn/ui.

## Funcionalidades (v1)

- 📋 Listado del inventario con buscador y filtros por especie, estado de humedad y etiquetas
- ➕ Crear / editar / borrar piezas con todos sus datos (dimensiones en mm, cantidad, ubicación, etiquetas, notas)
- 📷 Subida de foto (o captura con la cámara del móvil) a Vercel Blob
- ✨ Identificación de especie por IA: envía la foto a Claude y pre-rellena el campo especie con confianza y alternativas (siempre orientativo — tú confirmas)
- 🔍 Vista de detalle con foto grande
- 🔒 Acceso protegido con una única contraseña (`APP_PASSWORD`)

## Puesta en marcha

### 1. Clona e instala

```bash
npm install
cp .env.example .env
```

### 2. Crea la base de datos en Neon

1. Entra en [neon.tech](https://neon.tech) y crea un proyecto (el plan gratuito sobra).
2. En el dashboard del proyecto, copia la **connection string** (botón "Connect", formato `postgresql://usuario:contraseña@...neon.tech/neondb?sslmode=require`).
3. Pégala en `.env` como `DATABASE_URL`.

### 3. Ejecuta las migraciones de Drizzle

```bash
npm run db:migrate
```

Esto crea la tabla `wood_items` (y el enum `moisture_state`) a partir de las migraciones en `drizzle/`. Si cambias el schema (`src/lib/db/schema.ts`), genera una nueva migración con `npm run db:generate` y vuelve a ejecutar `npm run db:migrate`.

### 4. (Opcional) Carga los datos de ejemplo

```bash
npm run db:seed
```

Inserta 4 piezas de ejemplo (roble, nogal, pino y haya) para ver la app funcionando desde el primer momento. No hace nada si la tabla ya tiene datos.

### 5. Configura Vercel Blob

1. En [vercel.com](https://vercel.com), crea el proyecto (o entra en el existente) → pestaña **Storage** → **Create Database** → **Blob**.
2. Copia el token `BLOB_READ_WRITE_TOKEN` (en "Settings" del store, o en `.env.local` que Vercel genera) y ponlo en tu `.env`.

En producción, al conectar el store Blob al proyecto de Vercel, la variable se inyecta automáticamente.

### 6. Consigue la API key de Claude

1. Crea una key en [console.anthropic.com](https://console.anthropic.com) → API Keys.
2. Ponla en `.env` como `ANTHROPIC_API_KEY`. La identificación usa un modelo con visión (`claude-opus-4-8`); la llamada se hace siempre desde el servidor.

### 7. Elige tu contraseña

Define `APP_PASSWORD` en `.env` con la contraseña que usarás para entrar. Toda la app queda detrás de un middleware que exige una cookie de sesión válida.

### 8. Arranca en local

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000), introduce tu contraseña y listo.

## Despliegue en Vercel

1. Importa el repositorio en Vercel.
2. Configura las 4 variables de entorno (`DATABASE_URL`, `BLOB_READ_WRITE_TOKEN`, `ANTHROPIC_API_KEY`, `APP_PASSWORD`) en Settings → Environment Variables (el token de Blob se añade solo al conectar el store).
3. Despliega. Las migraciones no se ejecutan automáticamente: lánzalas una vez desde tu máquina con `npm run db:migrate` apuntando a la `DATABASE_URL` de producción.

## Estructura del proyecto

```
src/
  app/
    page.tsx                 # Listado + buscador + filtros
    login/page.tsx           # Login con APP_PASSWORD
    items/
      actions.ts             # Server actions: crear / editar / borrar
      new/page.tsx           # Alta de pieza
      [id]/page.tsx          # Detalle
      [id]/edit/page.tsx     # Edición
    api/
      upload/route.ts        # Subida de fotos a Vercel Blob (server-side)
      identify/route.ts      # Identificación de especie con Claude (visión)
  components/                # UI estilo shadcn + formulario de pieza
  lib/
    db/schema.ts             # Schema Drizzle (wood_items)
    db/index.ts              # Cliente Neon + Drizzle
    auth.ts                  # Sesión firmada derivada de APP_PASSWORD
  middleware.ts              # Protege toda la app con la cookie de sesión
drizzle/                     # Migraciones SQL generadas
scripts/seed.ts              # Datos de ejemplo
```

## Fuera de alcance en v1 (previsto para v2)

- Múltiples usuarios / registro
- Inventario de herramientas y consumibles
- Módulo de proyectos

El schema está pensado para crecer: `projects` y `tools` se añadirán como tablas nuevas en `src/lib/db/schema.ts` sin tocar `wood_items`.
