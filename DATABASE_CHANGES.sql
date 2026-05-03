-- =====================================================
-- DATABASE CONSTRAINTS & UNIQUE INDEXES
-- Run this in your Supabase SQL Editor
-- =====================================================

-- 1. Remove exact duplicate CRM contacts before enforcing uniqueness
WITH ranked_contacts AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY
        organization_id,
        lower(trim(name)),
        coalesce(lower(trim(email)), ''),
        coalesce(lower(trim(phone)), ''),
        coalesce(lower(trim(company)), ''),
        stage,
        coalesce(lower(trim(notes)), '')
      ORDER BY created_at ASC, id ASC
    ) AS rn
  FROM public.crm_contacts
)
DELETE FROM public.crm_contacts c
USING ranked_contacts r
WHERE c.id = r.id
  AND r.rn > 1;

-- 2. Remove exact duplicate projects before enforcing uniqueness
WITH ranked_projects AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY
        organization_id,
        lower(trim(name)),
        coalesce(lower(trim(description)), ''),
        coalesce(color, '')
      ORDER BY created_at ASC, id ASC
    ) AS rn
  FROM public.projects
)
DELETE FROM public.projects p
USING ranked_projects r
WHERE p.id = r.id
  AND r.rn > 1;

-- 3. Remove exact duplicate tasks before enforcing uniqueness
WITH ranked_tasks AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY
        project_id,
        board_id,
        lower(trim(title)),
        coalesce(lower(trim(description)), ''),
        priority,
        coalesce(status, ''),
        coalesce(due_date::date::text, ''),
        coalesce(assignee_id::text, '')
      ORDER BY created_at ASC, id ASC
    ) AS rn
  FROM public.tasks
)
DELETE FROM public.tasks t
USING ranked_tasks r
WHERE t.id = r.id
  AND r.rn > 1;

-- 4. Add exact-duplicate prevention indexes
DROP INDEX IF EXISTS idx_crm_contacts_exact_duplicate;
CREATE UNIQUE INDEX idx_crm_contacts_exact_duplicate 
ON public.crm_contacts(
  organization_id,
  coalesce(name, ''),
  coalesce(email, ''),
  coalesce(phone, ''),
  coalesce(company, ''),
  stage,
  coalesce(notes, '')
);

DROP INDEX IF EXISTS idx_projects_exact_duplicate;
CREATE UNIQUE INDEX idx_projects_exact_duplicate 
ON public.projects(
  organization_id,
  coalesce(name, ''),
  coalesce(description, ''),
  coalesce(color, '')
);

DROP INDEX IF EXISTS idx_tasks_exact_duplicate;
CREATE UNIQUE INDEX idx_tasks_exact_duplicate 
ON public.tasks(
  project_id,
  board_id,
  coalesce(title, ''),
  coalesce(description, ''),
  coalesce(priority, ''),
  coalesce(status, ''),
  coalesce(due_date, TIMESTAMPTZ '1970-01-01 00:00:00+00'),
  coalesce(assignee_id, UUID '00000000-0000-0000-0000-000000000000')
);

-- 5. Add check constraints to CRM contacts
ALTER TABLE public.crm_contacts
  ADD CONSTRAINT check_name_not_empty CHECK (name IS NOT NULL AND length(trim(name)) > 0),
  ADD CONSTRAINT check_name_length CHECK (length(trim(name)) <= 100),
  ADD CONSTRAINT check_email_length CHECK (email IS NULL OR length(trim(email)) <= 254),
  ADD CONSTRAINT check_email_format CHECK (email IS NULL OR email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$'),
  ADD CONSTRAINT check_phone_length CHECK (phone IS NULL OR length(trim(phone)) BETWEEN 3 AND 20),
  ADD CONSTRAINT check_phone_format CHECK (phone IS NULL OR phone ~ '^[0-9+()\-\s.]+$'),
  ADD CONSTRAINT check_company_length CHECK (company IS NULL OR length(trim(company)) <= 120),
  ADD CONSTRAINT check_notes_length CHECK (notes IS NULL OR length(trim(notes)) <= 500);

-- 6. Add check constraints to tasks
ALTER TABLE public.tasks
  ADD CONSTRAINT check_task_title_not_empty CHECK (title IS NOT NULL AND length(trim(title)) > 0),
  ADD CONSTRAINT check_task_title_length CHECK (length(trim(title)) <= 150),
  ADD CONSTRAINT check_task_description_length CHECK (description IS NULL OR length(trim(description)) <= 500),
  ADD CONSTRAINT check_priority_valid CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  ADD CONSTRAINT check_status_valid CHECK (status IN ('todo', 'in_progress', 'done', 'cancelled'));

-- 7. Add check constraints to profiles (for password-related fields when needed)
ALTER TABLE public.profiles
  ADD CONSTRAINT check_full_name_length CHECK (full_name IS NULL OR length(trim(full_name)) > 1);

-- 8. Add check constraints to projects
ALTER TABLE public.projects
  ADD CONSTRAINT check_project_name_not_empty CHECK (name IS NOT NULL AND length(trim(name)) > 0),
  ADD CONSTRAINT check_project_name_length CHECK (length(trim(name)) <= 100),
  ADD CONSTRAINT check_project_description_length CHECK (description IS NULL OR length(trim(description)) <= 500);

-- Optional: Add index for performance on CRM contact lookups
CREATE INDEX IF NOT EXISTS idx_crm_contacts_org_name_email ON public.crm_contacts(organization_id, name, email);
CREATE INDEX IF NOT EXISTS idx_crm_contacts_org_stage ON public.crm_contacts(organization_id, stage);

-- Optional: Add index for task lookups
CREATE INDEX IF NOT EXISTS idx_tasks_project_title ON public.tasks(project_id, title);
CREATE INDEX IF NOT EXISTS idx_tasks_priority_status ON public.tasks(project_id, priority, status);

-- =====================================================
-- VERIFICATION QUERIES (run these to test)
-- =====================================================

-- Check if duplicate constraint works:
-- Try creating two contacts with same name and email (should fail)
-- INSERT INTO crm_contacts (organization_id, name, email, created_by) 
-- VALUES ('your-org-id', 'John Doe', 'john@example.com', 'your-user-id');

-- Check if duplicate task constraint works:
-- Try creating two tasks with same title in same project (should fail)
-- INSERT INTO tasks (project_id, board_id, title, created_by) 
-- VALUES ('your-project-id', 'your-board-id', 'Task Title', 'your-user-id');
