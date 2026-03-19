-- =============================================================================
-- Admin Bootstrap
--
-- Solves the chicken-and-egg problem: the admin_users table starts empty,
-- but the only INSERT policy requires the user to already be a super_admin.
--
-- This migration adds:
--   1. A SECURITY DEFINER function to check if any admin exists (callable by
--      anyone, including unauthenticated — used by the setup page).
--   2. A one-time bootstrap INSERT policy that lets the FIRST authenticated
--      user to insert only their own row, only while the table is empty.
--      Once one admin exists, this policy is a no-op.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. check_admin_initialized()
--    Returns TRUE if at least one active admin row exists.
--    SECURITY DEFINER → runs as postgres, bypasses RLS on admin_users.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.check_admin_initialized()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users WHERE is_active = true
  );
$$;

-- Allow any authenticated (or even anon) caller to execute this function.
GRANT EXECUTE ON FUNCTION public.check_admin_initialized() TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2. Bootstrap INSERT policy
--    Allows an authenticated user to insert THEIR OWN row into admin_users
--    if and only if the table is currently empty.
-- ---------------------------------------------------------------------------
CREATE POLICY "bootstrap_first_admin"
  ON public.admin_users
  FOR INSERT
  TO authenticated
  WITH CHECK (
    id = auth.uid()
    AND NOT public.check_admin_initialized()
  );
