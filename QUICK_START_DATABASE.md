# Quick Start: Applying Database Changes

## What You Need to Do

Run the SQL queries in `DATABASE_CHANGES.sql` in your Supabase console to add constraints and prevent duplicates.

## Steps

### Step 1: Open Supabase Dashboard
- Go to https://app.supabase.com
- Select your "plan-it" project

### Step 2: Open SQL Editor
- In the left sidebar, click **"SQL Editor"**
- Click **"New Query"**

### Step 3: Copy & Paste the SQL
- Open the file: `DATABASE_CHANGES.sql`
- Copy ALL the content
- Paste it into the Supabase SQL Editor

### Step 4: Run the Query
- Click the **"Run"** button (or press `Ctrl+Enter`)
- Wait for success message ✅

### Step 5: Verify It Worked
- Look for "Query executed successfully" message
- All constraints are now active

## What Gets Added

### Unique Constraints (Prevent Duplicates)
✅ CRM Contacts: Can't have 2 contacts with same name + email
✅ Tasks: Can't have 2 tasks with same title in same project

### Check Constraints (Validate Data)
✅ CRM Contact names must not be empty
✅ CRM Contact emails must be valid format (if provided)
✅ Task titles must not be empty
✅ Project names must not be empty

### Performance Indexes
✅ Faster lookups for CRM contacts
✅ Faster lookups for tasks

## Testing the Constraints

### Test 1: Duplicate Contacts
Try this in SQL Editor to verify it blocks duplicates:

```sql
-- This should FAIL with unique constraint error
INSERT INTO crm_contacts (
  organization_id, 
  name, 
  email, 
  created_by
) VALUES (
  'your-org-id-here',
  'John Doe',
  'john@example.com',
  'your-user-id-here'
);

-- Run it twice - the second time should fail
```

### Test 2: Duplicate Tasks
Try this to verify tasks can't have same title:

```sql
-- This should FAIL with unique constraint error
INSERT INTO tasks (
  project_id,
  board_id,
  title,
  created_by
) VALUES (
  'your-project-id',
  'your-board-id',
  'My Task Title',
  'your-user-id'
);

-- Run it twice - the second time should fail
```

### Test 3: Empty Name
Try this to verify check constraints:

```sql
-- This should FAIL - name can't be empty
INSERT INTO crm_contacts (
  organization_id,
  name,
  created_by
) VALUES (
  'your-org-id',
  '',
  'your-user-id'
);
```

## If Something Goes Wrong

### Query Fails with "constraint already exists"
- The constraints are already applied (probably from a previous run)
- This is fine - your database is already protected
- No need to run again

### Query Fails with Other Error
- Check the error message in Supabase
- Make sure you copied ALL content from `DATABASE_CHANGES.sql`
- Ensure you're in the right Supabase project

### Want to Remove Constraints
```sql
-- Run this to remove all new constraints:
DROP INDEX IF EXISTS idx_crm_contacts_name_email_org CASCADE;
DROP INDEX IF EXISTS idx_tasks_title_project CASCADE;
ALTER TABLE public.crm_contacts DROP CONSTRAINT IF EXISTS check_name_not_empty CASCADE;
ALTER TABLE public.crm_contacts DROP CONSTRAINT IF EXISTS check_email_format CASCADE;
-- etc... (remove others as needed)
```

## That's It! 🎉

Your database now has:
- ✅ Duplicate prevention for contacts and tasks
- ✅ Data validation on all key fields
- ✅ Performance indexes for fast queries
- ✅ Full integration with frontend validation

The app will now show friendly error messages when users try to create duplicates, and the database will block any duplicates that somehow get through.

## Time Estimate
⏱️ Less than 1 minute to apply all changes
