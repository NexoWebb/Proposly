-- Migration: add public_token to proposals + enforce user_id NOT NULL
-- Ejecutar en Supabase Dashboard → SQL Editor

CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE proposals
  ADD COLUMN IF NOT EXISTS public_token uuid;

UPDATE proposals
  SET public_token = gen_random_uuid()
  WHERE public_token IS NULL;

ALTER TABLE proposals
  ALTER COLUMN public_token SET NOT NULL,
  ALTER COLUMN public_token SET DEFAULT gen_random_uuid();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'proposals_public_token_unique'
  ) THEN
    ALTER TABLE proposals
      ADD CONSTRAINT proposals_public_token_unique UNIQUE (public_token);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS proposals_public_token_idx ON proposals(public_token);

ALTER TABLE proposals
  ALTER COLUMN user_id SET NOT NULL;
