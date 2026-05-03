-- Get the actual constraint definition:
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'public.memberships'::regclass
  AND contype = 'c';
