-- Tabla de idempotencia para webhooks de Stripe
-- El PK único garantiza que cada event.id se procesa una sola vez
CREATE TABLE IF NOT EXISTS stripe_webhook_events (
  id           text        PRIMARY KEY,
  processed_at timestamptz DEFAULT now() NOT NULL
);

-- Columna cancel_at_period_end en subscriptions (usada en subscription.updated)
ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS cancel_at_period_end boolean DEFAULT false;
