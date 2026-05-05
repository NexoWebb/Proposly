-- Añadir WITH CHECK a la policy de INSERT en profiles para evitar
-- que un usuario autenticado pueda insertar un perfil con user_id ajeno.
-- La policy existente "Upsert own profile" tiene qual = NULL, lo que
-- permitiría INSERT libre. Con WITH CHECK queda blindada.

DROP POLICY IF EXISTS "Upsert own profile" ON profiles;

CREATE POLICY "Upsert own profile"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());
