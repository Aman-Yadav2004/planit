-- =====================================================
-- VERIFY: Check if Profile B is in Profile A's org
-- =====================================================

-- First, find the org IDs
SELECT 
  o.id,
  o.name,
  o.org_code,
  o.created_by,
  p.email as creator_email
FROM public.organizations o
LEFT JOIN public.profiles p ON o.created_by = p.id
ORDER BY o.created_at DESC;

-- Then check memberships for Profile A's org (PLAN IT @)
-- Replace ORG_ID_HERE with the actual org ID
SELECT 
  m.organization_id,
  m.user_id,
  m.role,
  p.email,
  p.full_name
FROM public.memberships m
LEFT JOIN public.profiles p ON m.user_id = p.id
WHERE m.organization_id = '5a6f33e2-6082-47a2-b711-b248d0df151c'
ORDER BY m.joined_at ASC;
