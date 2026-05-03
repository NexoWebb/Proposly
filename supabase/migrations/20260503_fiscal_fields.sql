-- Datos fiscales del emisor (agencia/freelance) en profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS fiscal_name text,
  ADD COLUMN IF NOT EXISTS fiscal_id text,
  ADD COLUMN IF NOT EXISTS fiscal_address text,
  ADD COLUMN IF NOT EXISTS fiscal_postal_code text,
  ADD COLUMN IF NOT EXISTS fiscal_city text,
  ADD COLUMN IF NOT EXISTS fiscal_province text,
  ADD COLUMN IF NOT EXISTS fiscal_country text DEFAULT 'España',
  ADD COLUMN IF NOT EXISTS default_vat_rate text DEFAULT '21',
  ADD COLUMN IF NOT EXISTS default_irpf_enabled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS default_irpf_rate text;

-- Datos fiscales del cliente + override de impuestos por propuesta
ALTER TABLE proposals
  ADD COLUMN IF NOT EXISTS client_fiscal_name text,
  ADD COLUMN IF NOT EXISTS client_fiscal_id text,
  ADD COLUMN IF NOT EXISTS client_fiscal_address text,
  ADD COLUMN IF NOT EXISTS vat_rate text DEFAULT '21',
  ADD COLUMN IF NOT EXISTS irpf_enabled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS irpf_rate text;