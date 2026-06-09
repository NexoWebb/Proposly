ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS brand_color text;

-- Validar formato hex (#RRGGBB) cuando no es NULL
ALTER TABLE profiles
  ADD CONSTRAINT profiles_brand_color_format
  CHECK (brand_color IS NULL OR brand_color ~ '^#[0-9A-Fa-f]{6}$');
