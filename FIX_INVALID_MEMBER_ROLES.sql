-- =====================================================
-- FIX: Update invalid role values to valid ones
-- =====================================================

UPDATE public.memberships
SET role = 'employee'
WHERE role = 'member';

-- Verify the fix:
SELECT 
  m.user_id,
  m.role,
  p.email,
  p.full_name
FROM public.memberships m
LEFT JOIN public.profiles p ON m.user_id = p.id
WHERE m.organization_id = '5a6f33e2-6082-47a2-b711-b248d0df151c'
ORDER BY m.joined_at ASC;
