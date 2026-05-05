-- Activar RLS en stripe_webhook_events SIN policies.
-- Esta tabla solo la escribe/lee el webhook de Stripe usando service_role.
-- service_role salta RLS automáticamente, así que sigue funcionando.
-- Sin policies = ningún rol authenticated o anon puede tocarla.

ALTER TABLE stripe_webhook_events ENABLE ROW LEVEL SECURITY;
