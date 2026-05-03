-- =====================================================
-- FIX: Update role constraint to allow 'employee'
-- =====================================================

-- Drop the old constraint
ALTER TABLE public.memberships
DROP CONSTRAINT memberships_role_check;

-- Add new constraint that allows admin, member, and employee
ALTER TABLE public.memberships
ADD CONSTRAINT memberships_role_check CHECK (role IN ('admin', 'member', 'employee'));

-- Now update the invalid 'employee' role back to 'member'
UPDATE public.memberships
SET role = 'member'
WHERE role = 'employee';

-- Verify:
SELECT 
  m.user_id,
  m.role,
  p.email,
  p.full_name
FROM public.memberships m
LEFT JOIN public.profiles p ON m.user_id = p.id
WHERE m.organization_id = '5a6f33e2-6082-47a2-b711-b248d0df151c'
ORDER BY m.joined_at ASC;
