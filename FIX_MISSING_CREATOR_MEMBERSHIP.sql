-- =====================================================
-- FIX: Add missing creator membership
-- The original org creator was not added to memberships table
-- Run this to restore their membership
-- =====================================================

-- Replace 'YOUR_ORG_ID' with the actual organization UUID
-- You can find it from the organizations table
-- This will add the creator back as an 'admin' member

-- First, find the org and its creator:
SELECT id, name, created_by FROM public.organizations ORDER BY created_at DESC LIMIT 5;

-- Then run this (replace the org_id and user_id UUIDs):
INSERT INTO public.memberships (organization_id, user_id, role)
VALUES ('ORG_UUID_HERE', 'CREATOR_USER_ID_HERE', 'admin')
ON CONFLICT (organization_id, user_id) DO UPDATE
SET role = 'admin'
WHERE memberships.organization_id = 'ORG_UUID_HERE'
  AND memberships.user_id = 'CREATOR_USER_ID_HERE';

-- Verify both members are now in the org:
SELECT m.user_id, m.role, p.full_name, p.email
FROM public.memberships m
LEFT JOIN public.profiles p ON m.user_id = p.id
WHERE m.organization_id = 'ORG_UUID_HERE'
ORDER BY m.joined_at ASC;
