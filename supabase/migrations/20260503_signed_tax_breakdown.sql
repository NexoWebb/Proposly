-- Desglose fiscal guardado en el momento de la firma
ALTER TABLE proposals
  ADD COLUMN IF NOT EXISTS signed_subtotal numeric,
  ADD COLUMN IF NOT EXISTS signed_vat_amount numeric,
  ADD COLUMN IF NOT EXISTS signed_irpf_amount numeric;
