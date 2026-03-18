-- =============================================================================
-- Fix: Allow authenticated users to read their own admin_users record.
--
-- Without this, the RLS check on admin_users uses is_admin() → app_metadata,
-- which is never set, creating a circular dependency where you can't verify
-- admin status to read the record that proves you're an admin.
-- =============================================================================

CREATE POLICY "users_can_read_own_admin_record"
  ON public.admin_users FOR SELECT TO authenticated
  USING (id = auth.uid());
