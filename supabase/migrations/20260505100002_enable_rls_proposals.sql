-- Activar RLS en proposals.
-- Solo el dueño (user_id = auth.uid()) puede leer/escribir su propia fila.
-- Acceso anónimo NO existe vía esta tabla — el flow público va por la
-- función SECURITY DEFINER get_proposal_by_token, que salta RLS.
-- service_role salta RLS automáticamente, así que /api/sign, /api/track,
-- /api/send y los webhooks de Stripe siguen funcionando.

ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Select own proposals"
  ON proposals
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Insert own proposals"
  ON proposals
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Update own proposals"
  ON proposals
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Delete own proposals"
  ON proposals
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());
