# Memoria técnica — Hotfix crítico de seguridad en Proposly

**Proyecto:** Proposly  
**Fecha:** 4 de mayo de 2026  
**Tipo de intervención:** Hotfix de seguridad, enlaces públicos, firma, tracking y consistencia de tokens  
**Objetivo:** Corregir riesgos críticos detectados tras la auditoría técnica de la aplicación.

---

## 1. Contexto general

Proposly es una aplicación SaaS para crear, enviar, visualizar, trackear y aceptar propuestas comerciales mediante plantillas. La aplicación permite que un usuario autenticado cree una propuesta desde el editor, la envíe por email a un cliente y que este pueda visualizarla y aceptarla desde una URL pública.

Durante la auditoría se detectó que varias partes críticas de la aplicación dependían del `id` interno de la propuesta para construir enlaces públicos o ejecutar acciones externas. Esto era problemático porque el `id` interno no debe actuar como mecanismo de acceso público. Aunque los identificadores puedan ser UUID y no fácilmente enumerables, siguen siendo referencias internas de base de datos y no deberían exponerse como token de acceso a clientes.

Además, se detectaron otros riesgos relacionados con la firma de propuestas, el tracking de aperturas, los emails transaccionales y la gestión del webhook de Stripe.

---

## 2. Problemas críticos detectados

### 2.1. Uso del `id` interno como enlace público

La vista pública de propuestas y varios enlaces externos usaban rutas del tipo:

```txt
/p/${proposal.id}
```

Esto suponía que el identificador interno de la fila en base de datos actuaba también como identificador público de acceso. El problema no es solo estético o de arquitectura: si ese ID se filtra, se reenvía o queda expuesto en logs, emails o historiales, cualquier persona con el enlace podría acceder a la propuesta.

**Riesgo corregido:** exposición innecesaria de identificadores internos y enlaces públicos dependientes del `id` de base de datos.

---

### 2.2. Firma de propuestas aceptando datos enviados desde cliente

El endpoint de firma recibía datos como:

```ts
id
signerName
finalTotal
finalBlocks
```

Esto era especialmente delicado porque `finalTotal` y `finalBlocks` procedían del navegador. En la práctica, un cliente o tercero que conociera el endpoint podía manipular el importe final o los bloques firmados antes de aceptar la propuesta.

**Riesgo corregido:** posibilidad de alterar desde cliente el contenido económico o estructural de la propuesta firmada.

---

### 2.3. Tracking manipulable por ID

El tracking de aperturas trabajaba con el identificador interno de la propuesta. Esto permitía que una llamada externa pudiera generar aperturas artificiales si conocía el ID.

**Riesgo corregido:** manipulación de métricas de apertura y dependencia de identificadores internos en acciones públicas.

---

### 2.4. Escritura de tracking con cliente anon

La lógica de `trackProposal` actualizaba la tabla `proposals` usando el cliente anon de Supabase. Esto hacía depender la escritura de tracking de las políticas RLS configuradas para el cliente público.

**Riesgo corregido:** dependencia innecesaria de permisos públicos para una operación server-side controlada.

---

### 2.5. Emails con enlaces públicos incorrectos o inseguros

Algunos emails, incluidos los recordatorios automáticos de la Edge Function, seguían construyendo enlaces con:

```txt
/p/${proposal.id}
```

Tras la migración a `public_token`, esos enlaces quedaban rotos o seguían exponiendo el ID interno.

**Riesgo corregido:** enlaces externos rotos y exposición del ID interno en emails enviados a clientes.

---

### 2.6. Falta parcial de escape HTML en emails

Algunos campos interpolados en emails, como `client_name`, `title`, `signerName` o nombres de servicios, podían llegar a insertarse en HTML sin escapado suficiente.

**Riesgo corregido:** riesgo de inyección HTML en emails transaccionales.

---

### 2.7. Webhook de Stripe devolviendo `ok: true` en errores

El webhook de Stripe sí utilizaba `stripe.webhooks.constructEvent`, lo cual es correcto. Sin embargo, si se producía un error de validación o firma, el endpoint devolvía igualmente una respuesta exitosa.

**Riesgo corregido:** respuestas incorrectas ante webhooks inválidos o mal firmados.

---

### 2.8. Logs innecesarios de Stripe checkout

El endpoint de checkout imprimía parcialmente variables relacionadas con Stripe en consola.

**Riesgo corregido:** exposición innecesaria de información sensible o semisensible en logs.

---

## 3. Solución adoptada

La solución principal ha consistido en separar el identificador interno de la propuesta del identificador público usado por clientes.

Para ello se introduce el campo:

```txt
public_token
```

Este token pasa a ser el identificador utilizado en las rutas públicas, emails, tracking y firma. El `id` interno queda reservado para uso interno de base de datos, dashboard, edición autenticada y operaciones protegidas.

La nueva lógica conceptual queda así:

```txt
id interno       → uso interno, autenticado, base de datos
public_token     → uso público, enlaces externos, vista cliente, tracking, firma
```

---

## 4. Archivos modificados y motivo de cada cambio

### 4.1. `app/editor/page.tsx`

**Cambio realizado:**  
Se añadió generación de `public_token` al crear nuevas propuestas dentro de la función `persist()`.

**Motivo:**  
Toda propuesta nueva debe disponer desde su creación de un token público independiente del ID interno.

**Cambio conceptual:**

```ts
public_token: crypto.randomUUID()
```

**Riesgo corregido:**  
Evita que nuevas propuestas dependan de `id` para ser compartidas públicamente.

---

### 4.2. `app/dashboard/page.tsx`

**Cambios realizados:**

1. Al duplicar propuestas en `handleDuplicate()`, se genera un nuevo `public_token`.
2. `CopyLinkButton` deja de copiar enlaces con `proposal.id` y pasa a usar `proposal.public_token`.
3. La navegación pública de propuestas firmadas cambia de `/p/${proposal.id}` a `/p/${proposal.public_token}`.
4. El tipo local de propuesta incluye `public_token`.

**Motivo:**  
Una propuesta duplicada no puede reutilizar el mismo token público que la original. Además, cualquier enlace público copiado desde el dashboard debe usar el token público, no el ID interno.

**Riesgo corregido:**  
Evita enlaces públicos rotos o basados en ID interno.

---

### 4.3. `app/p/[id]/page.tsx`

**Cambio realizado:**  
La ruta física se mantiene como `app/p/[id]/page.tsx`, pero el parámetro se interpreta ahora como `publicToken`.

La búsqueda de propuesta pasa de:

```ts
.eq('id', id)
```

a:

```ts
.eq('public_token', publicToken)
```

Además, la vista pública pasa el `publicToken` a las acciones públicas necesarias, como tracking y firma.

**Motivo:**  
La vista pública debe resolverse mediante token público, no mediante ID interno.

**Riesgo corregido:**  
Reduce la exposición de identificadores internos y prepara la app para enlaces públicos más seguros.

---

### 4.4. `app/api/send/route.ts`

**Cambios realizados:**

1. La query de propuesta incluye `public_token`.
2. El enlace enviado por email pasa a ser:

```ts
/p/${proposal.public_token}
```

3. Si una propuesta antigua no tiene `public_token`, se genera antes de enviar.
4. Se amplía el escape HTML a campos como `title` y `client_name`.

**Motivo:**  
Los emails externos al cliente deben contener enlaces públicos válidos y no exponer el ID interno. Además, los campos insertados en HTML deben escaparse correctamente.

**Riesgo corregido:**  
Evita enlaces inseguros o rotos en emails y reduce riesgo de inyección HTML.

---

### 4.5. `app/api/sign/route.ts`

**Cambios realizados:**

1. El endpoint deja de recibir `id`, `finalTotal` y `finalBlocks`.
2. El body esperado pasa a ser únicamente:

```ts
publicToken
signerName
```

3. La propuesta se busca por `public_token`.
4. Se añaden validaciones:
   - existencia de `publicToken`;
   - existencia y longitud válida de `signerName`;
   - propuesta existente;
   - propuesta no firmada previamente;
   - propuesta no caducada;
   - propuesta no en estado `draft`.
5. El total se recalcula en servidor desde los bloques guardados.
6. El endpoint ya no permite sobrescribir `blocks` desde cliente.
7. Los emails de confirmación usan `/p/${publicToken}`.
8. Se escapan campos interpolados en HTML.

**Motivo:**  
La firma debe ser una operación controlada desde servidor. El cliente no debe poder modificar importe, bloques ni contenido firmado.

**Riesgo corregido:**  
Cierra el problema más grave detectado: manipulación de propuesta firmada desde el navegador.

---

### 4.6. `components/AcceptButton.tsx`

**Cambios realizados:**

1. El componente recibe `publicToken` en lugar de `proposalId`.
2. El `fetch('/api/sign')` envía únicamente:

```ts
{
  publicToken,
  signerName: name.trim()
}
```

3. Se eliminan del envío `finalTotal` y `finalBlocks`.

**Motivo:**  
El frontend no debe mandar al servidor datos económicos o estructurales que puedan alterar la propuesta firmada.

**Riesgo corregido:**  
Evita que el navegador sea fuente de verdad para el importe o contenido de la firma.

---

### 4.7. `app/api/track/route.ts`

**Cambio realizado:**  
El endpoint pasa a recibir `publicToken` en lugar de `id`.

**Motivo:**  
El tracking es una acción pública asociada al enlace del cliente, por lo que debe usar el token público.

**Riesgo corregido:**  
Reduce dependencia del ID interno y alinea tracking con la nueva estrategia de enlaces públicos.

---

### 4.8. `lib/trackProposal.ts`

**Cambios realizados:**

1. La función trabaja con `publicToken`.
2. La búsqueda se realiza por `public_token`.
3. Se usa `supabaseAdmin` para SELECT y UPDATE.
4. Se mantiene la lógica de no trackear propuestas firmadas o caducadas.
5. Se mantiene la notificación solo en la primera apertura.
6. Se escapan campos como `client_name` y `title` en el email de tracking.

**Motivo:**  
El tracking es lógica server-side. No debe depender del cliente anon ni de políticas RLS públicas para escribir en base de datos.

**Riesgo corregido:**  
Evita escrituras con cliente público y reduce el riesgo de métricas manipuladas o dependientes de permisos inseguros.

---

### 4.9. `app/api/stripe/webhook/route.ts`

**Cambio realizado:**  
Se mantiene `stripe.webhooks.constructEvent(...)`, pero si falla la validación del webhook se devuelve error HTTP adecuado, por ejemplo `400`.

**Motivo:**  
Un webhook inválido o mal firmado no debe recibir una respuesta exitosa.

**Riesgo corregido:**  
Evita tratar como correctos eventos de Stripe inválidos.

---

### 4.10. `app/api/stripe/checkout/route.ts`

**Cambio realizado:**  
Se eliminaron logs de variables relacionadas con Stripe.

**Motivo:**  
Aunque solo se imprimiera parte de la clave o el price ID, no conviene dejar trazas innecesarias de configuración sensible.

**Riesgo corregido:**  
Reduce exposición en logs.

---

### 4.11. `types/index.ts`

**Cambio realizado:**  
Se añadieron tipos mínimos compartidos:

- `ProposalStatus`
- `Service`
- `TimelineItem`
- `Block`
- `Proposal`
- `Profile`
- `Template`
- `Subscription`

**Motivo:**  
El archivo estaba vacío. Añadir tipos compartidos ayuda a reducir duplicidad futura y preparar una base más mantenible.

**Riesgo corregido:**  
No corrige una vulnerabilidad directa, pero mejora mantenibilidad y reduce inconsistencias futuras.

---

### 4.12. `supabase/functions/send-follow-up-reminders/index.ts`

**Cambios realizados:**

1. La query incluye `public_token`.
2. Los emails de recordatorio usan:

```ts
/p/${proposal.public_token}
```

3. Si una propuesta no tiene `public_token`, se omite el envío de recordatorio para esa fila y se registra aviso.
4. Se escapan campos textuales usados en HTML.

**Motivo:**  
Los recordatorios son emails externos enviados al cliente. No podían seguir usando `/p/${proposal.id}` porque esos enlaces quedaban rotos y exponían el ID interno.

**Riesgo corregido:**  
Corrige enlaces externos inseguros o rotos en la Edge Function.

---

## 5. Cambio manual pendiente o asociado en Supabase

Además de los cambios de código, es necesario aplicar el cambio de base de datos para añadir y poblar `public_token` en la tabla `proposals`.

SQL recomendado:

```sql
alter table proposals
add column if not exists public_token text;

create unique index if not exists proposals_public_token_key
on proposals(public_token);

update proposals
set public_token = gen_random_uuid()::text
where public_token is null;

alter table proposals
alter column public_token set not null;
```

Después de ejecutarlo, conviene verificar que no quedan propuestas sin token:

```sql
select count(*)
from proposals
where public_token is null;
```

El resultado esperado debe ser:

```txt
0
```

También se recomienda guardar este SQL en el repositorio como migración o documentación, por ejemplo:

```txt
supabase/migrations/20260504_add_public_token_to_proposals.sql
```

---

## 6. Estado final del hotfix

Tras las modificaciones revisadas:

- Las URLs públicas ya no deben construirse con `proposal.id`.
- La vista pública busca propuestas por `public_token`.
- El dashboard copia enlaces usando `public_token`.
- Los emails de envío y recordatorio usan `public_token`.
- El tracking trabaja con `publicToken` y usa `supabaseAdmin` para escribir.
- La firma ya no acepta `finalTotal` ni `finalBlocks` desde cliente.
- El total firmado se recalcula en servidor.
- Stripe webhook responde con error en caso de firma inválida.
- Stripe checkout ya no imprime variables sensibles en logs.
- `types/index.ts` ya no está vacío.

---

## 7. Verificación realizada

Se realizó búsqueda global de referencias públicas a:

```txt
/p/${proposal.id}
```

Resultado reportado:

```txt
0 coincidencias públicas
```

Las referencias restantes a `proposal.id` son internas y legítimas, por ejemplo:

- `key={proposal.id}` en React;
- rutas autenticadas como `/editor/${proposal.id}`;
- acciones internas de dashboard como duplicar, eliminar o marcar como enviada;
- lógica server-side interna.

---

## 8. Verificación no completada por entorno local

No se pudo ejecutar correctamente:

```bash
npm run lint
npm run build
```

Motivo:

```txt
node_modules no existe localmente
```

Los comandos fallaron porque dependencias como `eslint` y `next` no estaban instaladas en el entorno local, no necesariamente por errores del código.

Antes de cerrar definitivamente el hotfix, se recomienda ejecutar:

```bash
npm install
npm run lint
npm run build
```

O verificar que el build de Vercel/CI pasa correctamente.

---

## 9. Riesgos pendientes

Aunque el hotfix corrige los problemas críticos detectados en código, quedan revisiones pendientes importantes:

### 9.1. Revisar políticas RLS de Supabase

Especialmente en:

- `proposals`
- `profiles`
- `templates`
- `subscriptions`

Objetivo:

- confirmar que usuarios autenticados solo acceden a sus datos;
- confirmar que anon no puede leer o modificar propuestas indebidamente;
- confirmar que la vista pública funciona únicamente por el flujo previsto;
- evitar policies excesivamente permisivas.

### 9.2. Versionar migraciones

Actualmente la carpeta `supabase/` parece contener principalmente la Edge Function. Si no existe sistema de migraciones, conviene crear una carpeta:

```txt
supabase/migrations/
```

y guardar el SQL de `public_token` como migración documentada.

### 9.3. Ejecutar lint/build en entorno con dependencias

No debe considerarse cerrado a nivel de entrega hasta que pase al menos:

```bash
npm run build
```

---

## 10. Conclusión

El hotfix ha corregido el principal problema estructural de seguridad de Proposly: el uso del `id` interno como identificador público de propuestas.

La aplicación pasa ahora a una arquitectura más segura en la que el `id` queda para operaciones internas y autenticadas, mientras que el acceso externo del cliente se realiza mediante `public_token`.

Además, se ha reforzado la firma de propuestas evitando que el cliente pueda enviar importes o bloques modificados desde el navegador. La aceptación pasa a depender de datos recalculados y controlados en servidor.

Queda pendiente la verificación definitiva mediante build/lint y, sobre todo, la revisión de las políticas RLS de Supabase para asegurar que la base de datos acompaña correctamente la nueva lógica de seguridad.

