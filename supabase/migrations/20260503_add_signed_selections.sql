-- Stores which optional services the client accepted/rejected at signing time
-- Array of { name: string, price: number, selected: boolean }
ALTER TABLE proposals
  ADD COLUMN IF NOT EXISTS signed_selections jsonb DEFAULT NULL;
