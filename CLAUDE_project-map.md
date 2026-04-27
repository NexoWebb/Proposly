# Mapa del Proyecto - Proposly

## Stack
- Next.js 15.3.2 (App Router, sin src/)
- TypeScript
- Supabase (auth + base de datos + Storage)
- Resend (emails)
- Stripe (pagos) — pendiente de integrar
- Desplegado en Vercel: https://proposly-kappa.vercel.app

## Estructura de archivos

```
proposly/
├── app/
│   ├── api/
│   │   ├── proposals/route.ts     # GET básico (stub)
│   │   ├── track/route.ts         # Tracking apertura + email Resend al usuario
│   │   └── send/route.ts          # Enviar propuesta por email al cliente
│   ├── dashboard/page.tsx         # Lista propuestas + stats + gráficos (client)
│   ├── editor/
│   │   ├── page.tsx               # Crear propuesta: plantilla → editor por bloques (client)
│   │   └── [id]/
│   │       ├── page.tsx           # Shell server que pasa id a EditorEdit
│   │       └── EditorEdit.tsx     # Editar propuesta existente (client)
│   ├── login/page.tsx             # Login + registro + olvidé contraseña
│   ├── reset-password/page.tsx    # Restablecer contraseña
│   ├── settings/page.tsx          # Perfil: nombre, logo de agencia (client)
│   ├── p/[id]/page.tsx            # Vista pública del cliente (server, sin auth, force-dynamic)
│   ├── layout.tsx                 # Layout global
│   └── page.tsx                   # Landing (pendiente)
├── components/
│   ├── AcceptButton.tsx           # Botón de firma del cliente (client)
│   ├── UserLogo.tsx               # Logo/nombre del usuario en topbars (client, autofetch)
│   └── BlockEditor.tsx            # Editor de bloques reutilizable (client)
├── lib/
│   ├── supabase.ts                # Cliente Supabase con clave anon (uso cliente/servidor)
│   ├── supabaseAdmin.ts           # Cliente Supabase con service_role (solo servidor)
│   ├── trackProposal.ts           # Llama a /api/track para registrar apertura
│   └── useIsMobile.ts             # Hook: window.innerWidth < 640
└── public/
```

## Variables de entorno (.env.local y Vercel)
```
NEXT_PUBLIC_SUPABASE_URL=https://cuwegroltpbveehpccje.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
SUPABASE_SERVICE_ROLE_KEY=eyJ...   ← necesario para supabaseAdmin en producción
RESEND_API_KEY=re_...
NEXT_PUBLIC_APP_URL=https://proposly-kappa.vercel.app
NOTIFICATION_EMAIL=yudegoadrian@gmail.com
```

## Base de Datos (Supabase)

### Tabla `proposals`
```
id             uuid PK default gen_random_uuid()
user_id        uuid → auth.users
title          text NOT NULL
client_name    text
client_email   text
blocks         jsonb default '[]'
status         text default 'draft'  -- draft | sent | opened | signed
total_amount   numeric default 0
currency       text default 'EUR'
valid_until    date
opened_at      timestamp
opened_count   integer default 0
signed_at      timestamp
signer_name    text
sent_at        timestamp             -- se rellena al enviar por email
notes          text
created_at     timestamp default now()
updated_at     timestamp default now()
```

### Tabla `profiles`
```
user_id        uuid PK references auth.users(id) on delete cascade
name           text
logo_url       text                  -- URL pública en Storage bucket "logos"
```
RLS activo: authenticated puede leer/escribir su propia fila; anon puede leer cualquier fila (para vista pública).

### Formato de `blocks` (jsonb)
Cada bloque lleva `id` (UUID generado en cliente) para reconciliación React.
```json
[
  { "id": "uuid", "type": "header",    "content": "Título de sección" },
  { "id": "uuid", "type": "text",      "content": "Párrafo libre" },
  { "id": "uuid", "type": "image",     "url": "https://...", "caption": "Leyenda" },
  { "id": "uuid", "type": "separator" },
  { "id": "uuid", "type": "services",  "content": [{ "name": "Servicio", "price": 1000 }] }
]
```
Compatibilidad: bloques antiguos con `type: "intro"` se convierten a `type: "text"` en `normalizeBlocks()`. Bloques sin `id` reciben uno al vuelo.

## Supabase Storage
- Bucket `logos`  — logos de agencias. Público. RLS: upload/update solo autenticado a su carpeta `{user_id}/`.
- Bucket `images` — imágenes en bloques de propuestas. Público. **Pendiente de crear** (misma config que logos).

## Componente BlockEditor
`components/BlockEditor.tsx` exporta:
- `BlockEditor` (default) — canvas de bloques controlado. Props: `blocks`, `onChange`, `userId`.
- `Block` (type) — unión discriminada de los 5 tipos.
- `Service` (type) — `{ name: string; price: number }`.
- `mkBlock(type)` — crea un bloque vacío con UUID.
- `normalizeBlocks(raw[])` — convierte bloques crudos de Supabase al tipo `Block[]`.
- `computeTotal(blocks)` — suma precios de todos los bloques services.

## Componente UserLogo
`components/UserLogo.tsx` — client component sin props. Al montar llama a `supabase.auth.getUser()` y luego a `profiles`. Muestra `<img>` si hay `logo_url`, sino el nombre, sino "Proposly". Se usa en topbars de dashboard, settings, editor y editor/[id].

## Flujo de la vista pública `/p/[id]`
1. Server component, `force-dynamic` (sin caché).
2. Lee `proposals` con cliente anon.
3. Lee `profiles` con **supabaseAdmin** (service_role, bypasa RLS).
4. Llama a `trackProposal` si la propuesta no está firmada.
5. Renderiza todos los tipos de bloque inline (no usa BlockEditor).
6. Muestra `AcceptButton` para firma.

## Diseño — tokens de estilo
| Token | Valor |
|-------|-------|
| Fondo páginas internas | `#f8f7f4` |
| Fondo dashboard | `#EEF2FF` (pendiente de unificar) |
| Topbar | `#1C2B5E` |
| Negro principal | `#0f0f0f` |
| Borde | `#e8e3dc` |
| Input bg | `#f5f4f0` |
| Texto secundario | `#888` / `#aaa` |
| Botón primario | `#0f0f0f` / `#fff` |
| Botón enviar | `#059669` / `#fff` |
| Tipografía títulos | Georgia, serif |
| Tipografía body | sans-serif |
| Sin Tailwind | Solo inline styles |

## Estado de features

| Feature | Estado |
|---------|--------|
| Login / Registro / Cerrar sesión | ✅ |
| Restablecer contraseña | ✅ |
| Dashboard con stats y gráficos | ✅ |
| Editor por bloques (header, text, image, separator, services) | ✅ |
| Editar propuesta existente con bloques | ✅ |
| Eliminar propuesta | ✅ |
| Plantillas por sector | ✅ |
| Vista pública /p/[id] renderiza todos los tipos de bloque | ✅ |
| Tracking apertura + email Resend | ✅ |
| Firma básica del cliente | ✅ |
| Enviar propuesta por email desde la app | ✅ |
| Settings con logo y nombre de agencia | ✅ |
| Logo agencia en vista pública y páginas internas | ✅ |
| Responsive móvil en editor y dashboard | ✅ |
| Bucket `images` para upload en bloques | ⏳ Pendiente crear en Supabase |
| Landing page pública | ⏳ Pendiente |
| Recordatorios automáticos | ⏳ Pendiente |
| Stripe plan gratis/pro | ⏳ Pendiente |
| Múltiples usuarios por cuenta | ⏳ Fase 3 |
| Analytics avanzados | ⏳ Fase 3 |

## Zonas sensibles

| Archivo | Razón |
|---------|-------|
| `lib/supabaseAdmin.ts` | Usa service_role key — solo importar en Server Components/API routes |
| `app/api/track/route.ts` | Ruta pública sin auth, no exponer datos sensibles |
| `app/p/[id]/page.tsx` | Ruta pública sin auth |
| `.env.local` | `SUPABASE_SERVICE_ROLE_KEY` no debe exponerse al cliente |

## Exclusión automática
```
node_modules/ .git/ .next/ dist/ build/
```
