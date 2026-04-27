# Proposly — Mapa del Proyecto

## Stack
Next.js 15.3.2 · TypeScript · Supabase · Resend · Stripe (pendiente)
Vercel: https://proposly-kappa.vercel.app

## Archivos clave
```
app/
  api/track/route.ts       # Tracking apertura + email
  api/send/route.ts        # Enviar propuesta al cliente
  dashboard/page.tsx       # Stats + lista + gráficos
  editor/page.tsx          # Crear propuesta (plantillas propias → editor por bloques)
  editor/[id]/EditorEdit.tsx  # Editar propuesta existente
  login/page.tsx
  reset-password/page.tsx
  settings/page.tsx        # Perfil + logo + sección "Mis plantillas"
  p/[id]/page.tsx          # Vista pública cliente (server, force-dynamic)
  page.tsx                 # Landing (pendiente)
components/
  AcceptButton.tsx         # Firma del cliente
  UserLogo.tsx             # Logo/nombre en topbars
  BlockEditor.tsx          # Editor de bloques reutilizable
lib/
  supabase.ts              # Cliente anon
  supabaseAdmin.ts         # Cliente service_role (solo servidor)
  trackProposal.ts
  useIsMobile.ts
```

## Variables de entorno
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
SUPABASE_SERVICE_ROLE_KEY   ← solo servidor
RESEND_API_KEY
NEXT_PUBLIC_APP_URL=https://proposly-kappa.vercel.app
NOTIFICATION_EMAIL=yudegoadrian@gmail.com
```

## Base de Datos

**proposals**: id, user_id, title, client_name, client_email, blocks(jsonb), status(draft|sent|opened|signed), total_amount, currency, valid_until, opened_at, opened_count, signed_at, signer_name, sent_at, notes, created_at, updated_at

**profiles**: user_id(PK), name, logo_url
RLS: auth puede leer/escribir la suya; anon puede leer cualquier fila.

**templates**: id(PK), user_id → auth.users, name text, blocks(jsonb), created_at
RLS: authenticated puede leer/escribir/borrar solo las suyas.

## Storage
- `logos` — logos agencias (público)
- `images` — imágenes en propuestas (público, **pendiente de crear**)

## Exports de BlockEditor
`Block` (type), `Service` (type), `mkBlock(type)`, `normalizeBlocks(raw[])`, `computeTotal(blocks)`
Tipos de bloque: header · text · image · separator · services

## Flujo editor/page.tsx
1. Carga plantillas del usuario desde tabla templates
2. Sin plantillas → editor directo con un bloque text vacío
3. Con plantillas → picker con sus plantillas + "Empezar desde cero"
4. En el editor, botón "Guardar como plantilla" → modal con nombre → inserta en templates
5. "← Plantillas" en sidebar solo aparece si el usuario tiene plantillas

## Flujo settings/page.tsx
- Sección "Mis plantillas" entre perfil y contraseña
- Lista plantillas con nombre y botón "Eliminar" (borrado inmediato, sin confirmación)

## Flujo vista pública /p/[id]
1. Server component, force-dynamic
2. Lee proposals con anon
3. Lee profiles con supabaseAdmin (bypasa RLS)
4. Llama trackProposal si no está firmada
5. Renderiza bloques inline (no usa BlockEditor)
6. Muestra AcceptButton

## Zonas sensibles
- `lib/supabaseAdmin.ts` — solo importar en server/API routes
- `app/p/[id]/page.tsx` y `api/track/route.ts` — rutas públicas sin auth

## Pendiente
- Landing page (`app/page.tsx`)
- Recordatorios automáticos (Supabase Edge Function)
- Stripe plan gratis/pro
- Múltiples usuarios (Fase 3)