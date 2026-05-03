-- =====================================================
-- VERIFY: Check memberships and fix if needed
-- =====================================================

-- 1. Find your organization and see all members
SELECT 
  o.id as org_id,
  o.name as org_name,
  o.org_code,
  o.created_by,
  m.id as membership_id,
  m.user_id,
  m.role,
  m.joined_at,
  p.email,
  p.full_name
FROM public.organizations o
LEFT JOIN public.memberships m ON o.id = m.organization_id
LEFT JOIN public.profiles p ON m.user_id = p.id
ORDER BY o.created_at DESC, m.joined_at ASC
LIMIT 10;

-- 2. Check what the role value is for each membership:
SELECT 
  m.organization_id,
  m.user_id,
  m.role,
  m.joined_at,
  p.email,
  p.full_name
FROM public.memberships m
LEFT JOIN public.profiles p ON m.user_id = p.id
WHERE m.organization_id = '5a6f33e2-6082-47a2-b711-b248d0df151c'
ORDER BY m.joined_at ASC;
