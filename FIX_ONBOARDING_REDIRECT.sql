-- =====================================================
-- FIX: Stop creator accounts from being sent back to onboarding
-- Run this once in the Supabase SQL Editor.
-- =====================================================

-- Let a logged-in user read their own membership row directly.
DROP POLICY IF EXISTS "Users can view own membership" ON public.memberships;
CREATE POLICY "Users can view own membership"
ON public.memberships
FOR SELECT
USING (auth.uid() = user_id);

-- Backfill memberships for organizations whose creator was never added.
INSERT INTO public.memberships (organization_id, user_id, role)
SELECT o.id, o.created_by, 'admin'
FROM public.organizations o
WHERE o.created_by IS NOT NULL
ON CONFLICT (organization_id, user_id) DO UPDATE
SET role = 'admin';

-- Verify creators can now be found through memberships.
SELECT
  o.id AS organization_id,
  o.name AS organization_name,
  o.created_by,
  m.role
FROM public.organizations o
LEFT JOIN public.memberships m
  ON m.organization_id = o.id
 AND m.user_id = o.created_by
ORDER BY o.created_at DESC;
