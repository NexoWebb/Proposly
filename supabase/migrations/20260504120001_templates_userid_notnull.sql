-- Migration: enforce user_id NOT NULL on templates
-- Verificado: 0 filas con user_id NULL antes de ejecutar
-- Ejecutar en Supabase Dashboard → SQL Editor

ALTER TABLE templates
  ALTER COLUMN user_id SET NOT NULL;
