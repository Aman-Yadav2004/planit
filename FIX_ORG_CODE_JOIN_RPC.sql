-- =====================================================
-- FIX: Robust organization-code join (case-insensitive + RLS-safe)
-- Run this once in Supabase SQL Editor
-- =====================================================

CREATE OR REPLACE FUNCTION public.join_organization_by_code(p_org_code TEXT)
RETURNS TABLE (
  org_id UUID,
  org_name TEXT,
  org_code TEXT,
  already_member BOOLEAN
) AS $$
DECLARE
  v_user_id UUID;
  v_org public.organizations%ROWTYPE;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_org_code IS NULL OR trim(p_org_code) = '' THEN
    RAISE EXCEPTION 'Organization code is required';
  END IF;

  SELECT * INTO v_org
  FROM public.organizations o
  WHERE upper(o.org_code) = upper(trim(p_org_code))
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Organization code not found';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.memberships m
    WHERE m.organization_id = v_org.id
      AND m.user_id = v_user_id
  ) THEN
    RETURN QUERY SELECT v_org.id, v_org.name, v_org.org_code, TRUE;
    RETURN;
  END IF;

  INSERT INTO public.memberships (organization_id, user_id)
  VALUES (v_org.id, v_user_id)
  ON CONFLICT (organization_id, user_id) DO NOTHING;

  RETURN QUERY SELECT v_org.id, v_org.name, v_org.org_code, FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.join_organization_by_code(TEXT) TO authenticated;
