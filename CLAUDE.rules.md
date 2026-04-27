# Reglas de Trabajo - Proposly

## Leer SIEMPRE primero
- `lib/supabase.ts` — config de datos
- `types/index.ts` — tipos globales
- `app/layout.tsx` — contexto global

## Leer SOLO si la tarea lo requiere
- `app/dashboard/page.tsx` — cambios en dashboard
- `app/editor/page.tsx` — cambios en editor
- `app/editor/[id]/page.tsx` — cambios en editar propuesta
- `app/login/page.tsx` — cambios en auth
- `app/p/[id]/page.tsx` — cambios en vista pública
- `app/settings/page.tsx` — cambios en ajustes
- `app/api/` — cambios en endpoints
- `components/AcceptButton.tsx` — cambios en firma

## NO leer nunca
- `node_modules/` `public/` `.next/` `package.json` `postcss.config.mjs`

## Límites por sesión
- Máximo 10 archivos leídos
- Máximo 100 líneas modificadas
- Usar `grep` antes de leer archivos completos

## Puedes hacer sin preguntar
- Añadir lógica dentro de funciones existentes
- Corregir errores pequeños
- Añadir comentarios

## Pregunta siempre antes de
- Crear archivos nuevos .ts/.tsx
- Modificar estructura de carpetas
- Cambiar dependencias en package.json
- Refactorizar (renombrar funciones, reorganizar)
- Eliminar archivos
- Cambios que afecten más de 3 archivos
- Cualquier cambio en `lib/` o `types/`

## Convenciones del proyecto
- Estilos: inline styles con objetos JS (NO Tailwind classes)
- Colores base: fondo #f8f7f4, negro #0f0f0f, acento verde #a8e063
- Tipografía títulos: Georgia serif / body: sans-serif
- Rutas: cada carpeta en app/ es una ruta, todas tienen page.tsx
- Auth: supabase.auth.getUser() para obtener usuario en cliente
- Sin src/ — todo va directo en la raíz del proyecto
- URL producción: https://proposly-kappa.vercel.app
- NO usar localhost en código, usar process.env.NEXT_PUBLIC_APP_URL

## Tareas pendientes (en orden de prioridad)
1. Logo agencia en vista pública → `app/p/[id]/page.tsx` + tabla profiles
2. Landing page pública → `app/page.tsx`
3. Tabla de precios interactiva → `app/p/[id]/page.tsx`
4. Stripe plan gratis/pro → nueva route + tabla profiles
5. Recordatorios automáticos → Supabase Edge Function
6. Dominio propio + Resend verificado

## Comportamiento esperado
- Respuestas directas, sin preámbulos
- Máximo 4 líneas salvo que se pida detalle
- Verificar archivo antes de modificar
- Un cambio a la vez, confirmar antes de continuar
