# Stripe Webhook — Debug

## Ver logs en Vercel

Vercel Dashboard → Proyecto → **Logs** → filtrar por `/api/stripe/webhook`

Cada evento loguea `[Stripe] Event received: {type} {id}` y el resultado
de cada operación en BD. Errores aparecen con `[Stripe] Handler error:` +
stack trace completo.

## Testear en local con Stripe CLI

```bash
# 1. Login (solo la primera vez)
stripe login

# 2. Reenviar eventos al servidor local
stripe listen --forward-to localhost:3000/api/stripe/webhook
# Copia el whsec_... que imprime y ponlo en .env.local:
# STRIPE_WEBHOOK_SECRET=whsec_...

# 3. Disparar eventos de prueba (en otra terminal)
stripe trigger checkout.session.completed
stripe trigger customer.subscription.updated
stripe trigger customer.subscription.deleted
stripe trigger invoice.payment_failed
stripe trigger invoice.payment_succeeded
```

## Verificar idempotencia

Si el mismo evento llega dos veces, el segundo log mostrará:
`[Stripe] Duplicate event evt_xxx, skipping`

## Antes de hacer deploy

Ejecutar la migración SQL en Supabase Dashboard → SQL Editor:
`supabase/migrations/20260503_stripe_webhook_events.sql`
