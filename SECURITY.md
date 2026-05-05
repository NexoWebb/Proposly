# Modelo de seguridad de Proposly

Este documento describe cómo Proposly protege los datos de sus usuarios y los datos
fiscales que sus clientes reciben en propuestas. Está vivo: se actualiza con cada
cambio que afecte a auth, RLS o endpoints sensibles.

## Roles de Supabase

Proposly usa los tres roles estándar de Supabase Auth:

- **`anon`**: clientes sin sesión iniciada (visitantes de `/p/<token>`).
- **`authenticated`**: usuarios con sesión iniciada (freelancers/agencias en su panel).
- **`service_role`**: clave admin usada solo desde código de servidor (API routes y
  webhooks). Salta RLS automáticamente. **Nunca** se expone al navegador.

## RLS por tabla

Todas las tablas de la app tienen RLS activo. Resumen de las policies vigentes:

### `profiles`
- `SELECT` (authenticated): `user_id = auth.uid()`
- `INSERT` (authenticated): `WITH CHECK (user_id = auth.uid())`
- `UPDATE` (authenticated): `user_id = auth.uid()`
- Anon: sin acceso.

### `proposals`
- `SELECT` (authenticated): `user_id = auth.uid()`
- `INSERT` (authenticated): `WITH CHECK (user_id = auth.uid())`
- `UPDATE` (authenticated): `USING + WITH CHECK (user_id = auth.uid())`
- `DELETE` (authenticated): `user_id = auth.uid()`
- Anon: sin acceso a la tabla. Acceso público a una propuesta concreta vía función
  SECURITY DEFINER `get_proposal_by_token` (ver más abajo).

### `templates`
- Mismas 4 policies que `proposals`, basadas en `user_id = auth.uid()`.
- Sin acceso público de ningún tipo.

### `subscriptions`
- `SELECT` (authenticated): `user_id = auth.uid()`.
- Solo se escribe desde webhooks de Stripe con `service_role`.

### `stripe_webhook_events`
- RLS activo **sin policies**. Esto significa que ningún rol `authenticated` o `anon`
  puede leer ni escribir. Solo `service_role` (que salta RLS) accede, desde el
  webhook de Stripe.

## Flow público (`/p/<token>`)

El cliente de un freelancer recibe un link tipo `https://proposly.es/p/<uuid>`,
donde `<uuid>` es un `public_token` único por propuesta (columna
`proposals.public_token`, uuid v4 no secuencial).

El cliente NO accede a la tabla `proposals` directamente. La página llama a la
función SQL `public.get_proposal_by_token(p_token uuid)`, que es `SECURITY DEFINER`
y devuelve solo:

- Campos de la propuesta necesarios para renderizar (sin `id` interno, sin `user_id`,
  sin metadatos como `opened_at`, `created_at`, etc.)
- Datos del emisor desde `profiles` (nombre, logo, datos fiscales) prefijados con
  `issuer_*`, también sin `id` interno.

La función filtra `status != 'draft'`, así que un borrador con token filtrado nunca
es visible públicamente.

`REVOKE ALL ON FUNCTION ... FROM PUBLIC` y `GRANT EXECUTE TO anon, authenticated`
acotan quién puede llamarla.

## Endpoints sensibles

Tres rutas usan `supabaseAdmin` (service_role) y deben mantenerse server-only:

- **`POST /api/sign`**: recibe `{ public_token, signerName, finalTotal, finalBlocks }`,
  resuelve el `id` interno, valida estado (no firmada, no expirada), aplica el
  UPDATE y envía emails. La response NO incluye el `id` interno. Mensajes de error
  genéricos (`"Propuesta no disponible"`) para no revelar si un token existe o no.
- **`POST /api/track`**: recibe `{ public_token }`, incrementa `opened_count` y
  `opened_at`. Idempotente: si el token no existe, responde 204 sin error
  (comportamiento de pixel-tracker). Sin auth — el token es la credencial.
- **`POST /api/send`**: requiere usuario autenticado. Construye el link del email
  con `public_token`, no con `id` interno.

`lib/trackProposal.ts` usa `supabaseAdmin` y está marcado como server-only en su
cabecera. Nunca se importa desde un componente cliente.

## El `id` interno nunca llega al cliente público

El `id` interno (`proposals.id`, uuid v4) se usa para joins, FKs y operaciones
admin internas. Pero ningún cliente fuera de las API routes lo recibe:

- La función `get_proposal_by_token` no lo devuelve.
- Las API routes que reciben `public_token` no lo devuelven en sus responses.
- Las URLs públicas (`/p/`) y los emails usan exclusivamente `public_token`.
- Las URLs internas del freelancer (`/dashboard`, `/editor/<id>`) sí usan `id`,
  porque están protegidas por sesión authenticated y RLS.

## Cómo verificar el modelo (tests de penetración reproducibles)

Estos tests están pensados para ejecutarse en el SQL Editor de Supabase Dashboard.
Sustituye los UUIDs por usuarios y propuestas reales del entorno donde los corras.

### Aislamiento entre usuarios authenticated

Simulamos al "atacante" (un user_id distinto del dueño de la propuesta) e
intentamos leer/modificar/borrar/insertar datos ajenos. Todo debe devolver 0 filas
o lanzar `42501 row-level security policy`.

```sql
BEGIN;
SET LOCAL role TO authenticated;
SET LOCAL "request.jwt.claims" TO '{"sub": "<UUID_ATACANTE>", "role": "authenticated"}';

SELECT count(*) FROM proposals;                                       -- 0
SELECT count(*) FROM proposals WHERE user_id = '<UUID_VICTIMA>';      -- 0
UPDATE proposals SET title = 'HACKED' WHERE user_id = '<UUID_VICTIMA>'; -- 0 filas
DELETE FROM proposals WHERE user_id = '<UUID_VICTIMA>';                 -- 0 filas
INSERT INTO proposals (user_id, title, status)
  VALUES ('<UUID_VICTIMA>', 'fake', 'draft');                          -- ERROR 42501

SELECT count(*) FROM profiles WHERE user_id != '<UUID_ATACANTE>';      -- 0
SELECT count(*) FROM stripe_webhook_events;                            -- 0

ROLLBACK;
```

### Acceso anónimo

Sin sesión, ninguna tabla debe ser legible. Solo la función pública.

```sql
BEGIN;
SET LOCAL role TO anon;

SELECT count(*) FROM proposals;                                        -- 0
SELECT count(*) FROM templates;                                        -- 0
SELECT count(*) FROM profiles;                                         -- 0
SELECT count(*) FROM stripe_webhook_events;                            -- 0
SELECT count(*) FROM subscriptions;                                    -- 0

SELECT count(*) FROM public.get_proposal_by_token('<TOKEN_VALIDO>'::uuid); -- 1
SELECT count(*) FROM public.get_proposal_by_token('00000000-0000-0000-0000-000000000000'::uuid); -- 0

ROLLBACK;
```

## Backlog de seguridad

Cosas que sabemos que mejoran el modelo y que están pendientes:

- **FK `proposals.user_id` y `templates.user_id` con `ON DELETE CASCADE`**: hoy
  son `NO ACTION`, lo que bloquea el borrado de un usuario si tiene contenido.
  Para un flow real de baja de cuenta, conviene CASCADE o SET NULL controlado.
- **Gate server-side de `canCreateProposal`**: hoy se valida en cliente antes de
  enviar al editor. Hay un TODO en `lib/canCreateProposal.ts` para mover esa
  validación a un endpoint de servidor que confirme plan y cuota antes del INSERT.
- **CHECK constraint en `proposals.status`**: actualmente es `text` libre. Conviene
  un CHECK que limite a los valores válidos (`draft`, `opened`, `signed`).
- **Unificar tipo `Proposal`**: hoy cada componente lo define localmente. Centralizar
  en `types/` evita divergencias y olvidos al añadir columnas como `public_token`.
- **Migraciones versionadas con Supabase CLI** (tarea 1.5 del roadmap): hoy las
  migraciones están en `supabase/migrations/` pero se aplican a mano en el Dashboard.
  Pasar a la CLI bloquea el drift entre entorno local y remoto.

---

Última actualización: 2026-05-05 (cierre del PR de auditoría RLS, 2.2)
