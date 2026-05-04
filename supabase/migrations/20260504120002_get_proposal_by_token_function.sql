-- Función SECURITY DEFINER para que clientes públicos (anon) puedan leer
-- una propuesta a partir de su public_token, sin acceso directo a la tabla.
--
-- Devuelve solo columnas necesarias para renderizar /p/[token].
-- Excluye id interno, user_id, metadatos internos, defaults del perfil.
-- Filtra status = 'draft' para no exponer borradores.

CREATE OR REPLACE FUNCTION public.get_proposal_by_token(p_token uuid)
RETURNS TABLE (
  title text,
  client_name text,
  client_email text,
  blocks jsonb,
  status text,
  total_amount numeric,
  currency text,
  valid_until date,
  signed_at timestamp without time zone,
  signer_name text,
  notes text,
  sent_at timestamp with time zone,
  expires_at timestamp with time zone,
  signed_selections jsonb,
  client_fiscal_name text,
  client_fiscal_id text,
  client_fiscal_address text,
  vat_rate text,
  irpf_enabled boolean,
  irpf_rate text,
  signed_subtotal numeric,
  signed_vat_amount numeric,
  signed_irpf_amount numeric,
  public_token uuid,
  issuer_name text,
  issuer_logo_url text,
  issuer_fiscal_name text,
  issuer_fiscal_id text,
  issuer_fiscal_address text,
  issuer_fiscal_postal_code text,
  issuer_fiscal_city text,
  issuer_fiscal_province text,
  issuer_fiscal_country text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT
    p.title,
    p.client_name,
    p.client_email,
    p.blocks,
    p.status,
    p.total_amount,
    p.currency,
    p.valid_until,
    p.signed_at,
    p.signer_name,
    p.notes,
    p.sent_at,
    p.expires_at,
    p.signed_selections,
    p.client_fiscal_name,
    p.client_fiscal_id,
    p.client_fiscal_address,
    p.vat_rate,
    p.irpf_enabled,
    p.irpf_rate,
    p.signed_subtotal,
    p.signed_vat_amount,
    p.signed_irpf_amount,
    p.public_token,
    pr.name,
    pr.logo_url,
    pr.fiscal_name,
    pr.fiscal_id,
    pr.fiscal_address,
    pr.fiscal_postal_code,
    pr.fiscal_city,
    pr.fiscal_province,
    pr.fiscal_country
  FROM proposals p
  LEFT JOIN profiles pr ON pr.user_id = p.user_id
  WHERE p.public_token = p_token
    AND p.status != 'draft';
$$;

REVOKE ALL ON FUNCTION public.get_proposal_by_token(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_proposal_by_token(uuid) TO anon, authenticated;
