-- Activar RLS en templates. Misma estructura que proposals.
-- No hay flow público en templates: solo el dueño accede.

ALTER TABLE templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Select own templates"
  ON templates
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Insert own templates"
  ON templates
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Update own templates"
  ON templates
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Delete own templates"
  ON templates
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());
