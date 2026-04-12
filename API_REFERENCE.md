# API & Component Reference

## New Components

### ProfilePage
**Location:** `src/pages/ProfilePage.tsx`
**Route:** `/profile`
**Access:** Protected (authenticated users only)

**Features:**
- User profile editing
- Team member management
- Organization member list with filtering by role
- Invite functionality with role assignment
- Pending invitations display
- Member removal and role management

**Props:** None (uses Zustand stores)

**Auth Requirements:** User must be authenticated and have an organization

---

### JoinOrgPage
**Location:** `src/pages/JoinOrgPage.tsx`
**Route:** `/join-org/:orgId?token=<token>`
**Access:** Protected (authenticated users only)

**Features:**
- Validates invitation token
- Checks email match
- Verifies token expiration
- Auto-creates membership
- Shows organization details before joining

**Query Params:**
- `token` (required): Invitation token

**Route Params:**
- `orgId` (required): Organization ID

---

## Database Tables

### invitations
```typescript
{
  id: UUID;           // Primary key
  organization_id: UUID;  // Organization ref
  email: string;      // Invited email
  role: 'admin' | 'employee';  // Target role
  invited_by: UUID;   // Who invited (profile ref)
  token: string;      // Unique token (UNIQUE)
  accepted: boolean;  // Has been accepted
  accepted_by: UUID;  // Who accepted (profile ref)
  accepted_at: timestamp;  // When accepted
  expires_at: timestamp;   // 7 days from creation
  created_at: timestamp;
}
```

### Updated: memberships
```typescript
{
  id: UUID;
  organization_id: UUID;
  user_id: UUID;
  role: 'admin' | 'employee';  // Changed from 'member'
  joined_at: timestamp;
}
```

---

## Zustand Store Methods

### useAuthStore

```typescript
// Existing methods
await authStore.signIn(email, password)
await authStore.signUp(email, password, fullName)
await authStore.signOut()
await authStore.fetchProfile(userId)
await authStore.fetchOrganization(userId)
await authStore.initialize()

// State
const user = authStore.user  // Profile | null
const organization = authStore.organization  // Organization | null
const loading = authStore.loading
const initialized = authStore.initialized
```

---

## Supabase RPC Functions

Already in schema:

```sql
-- Check if user is org member
SELECT is_org_member(org_id: UUID) -> BOOLEAN

-- Check if user is org admin
SELECT is_org_admin(org_id: UUID) -> BOOLEAN
```

**Usage:**
```typescript
const { data } = await supabase.rpc('is_org_admin', { org_id: orgId })
```

---

## Key Queries Used in Components

### Fetch org members with profiles
```typescript
const { data: members } = await supabase
  .from('memberships')
  .select(`
    *,
    profile:user_id(*)
  `)
  .eq('organization_id', orgId)
```

### Fetch pending invitations
```typescript
const { data: invitations } = await supabase
  .from('invitations')
  .select('*')
  .eq('organization_id', orgId)
  .eq('accepted', false)
```

### Validate invitation token
```typescript
const { data: invitation } = await supabase
  .from('invitations')
  .select('*')
  .eq('token', token)
  .eq('organization_id', orgId)
  .eq('accepted', false)
  .single()

// Check expiration
if (new Date(invitation.expires_at) < new Date()) {
  // Expired
}
```

### Create membership from invitation
```typescript
// Step 1: Mark invitation as accepted
await supabase
  .from('invitations')
  .update({ 
    accepted: true, 
    accepted_by: userId, 
    accepted_at: new Date().toISOString() 
  })
  .eq('token', token)

// Step 2: Create membership
await supabase.from('memberships').insert({
  organization_id: orgId,
  user_id: userId,
  role: invitation.role  // Use role from invitation
})
```

---

## Login Flow Diagram

```
User Signs In
    ↓
fetchProfile(userId) → Load user profile
    ↓
fetchOrganization(userId) → Load user's org
    ↓
Check if organization exists
    ├─ YES → Redirect to dashboard (/)
    └─ NO → Redirect to onboarding (/onboarding)
        ├─ Option 1: Create Organization
        │  ├─ Create org entry
        │  ├─ Create admin/employee membership
        │  └─ Redirect to dashboard
        └─ Option 2: Join via Invitation
           └─ Wait for email with /join-org/:id?token=X
```

---

## State Management Flow

```
AuthStore (Zustand)
├─ user: Profile
├─ organization: Organization
├─ loading: boolean
├─ initialized: boolean
└─ methods:
   ├─ signIn/signUp
   ├─ fetchProfile
   ├─ fetchOrganization
   └─ initialize

AppLayout (uses AuthStore)
├─ Sidebar navigation
├─ User menu
├─ Profile link
└─ Sign out

ProfilePage (uses AuthStore + Supabase)
├─ Fetch members from memberships table
├─ Fetch invitations from invitations table
├─ Update profile in profiles table
├─ Create/update/delete memberships/invitations
└─ Manage user role
```

---

## Notification/Toast Usage

```typescript
import { toast } from '../components/ui/Toast'

// Success
toast.success('Action completed!')

// Error
toast.error('Something went wrong')

// Don't forget to include ToastContainer
import { ToastContainer } from '../components/ui/Toast'

<ToastContainer />
```

---

## Role Permissions Summary

### Admin
- ✅ Create projects
- ✅ Invite team members
- ✅ Change member roles
- ✅ Remove members
- ✅ View all team members
- ✅ Delete invitations
- ✅ Manage projects/tasks

### Employee
- ✅ Create projects
- ✅ Create tasks
- ✅ Comment on tasks
- ✅ View team members
- ✅ Use all features
- ❌ Invite team members
- ❌ Change roles
- ❌ Remove members
- ❌ Delete others' content

---

## Performance Indexes

Automatically created by schema:

```sql
idx_memberships_user_org(user_id, organization_id)
idx_memberships_org(organization_id)
idx_invitations_org(organization_id)
idx_invitations_email(email)
idx_invitations_token(token)
idx_invitations_accepted(accepted, expires_at)
idx_projects_org_created(organization_id, created_at)
idx_boards_project(project_id)
idx_tasks_board_project(board_id, project_id)
idx_tasks_assignee(assignee_id)
idx_tasks_created(created_at)
idx_comments_task(task_id)
idx_crm_contacts_org(organization_id)
idx_messages_org_created(organization_id, created_at)
idx_messages_project(project_id)
idx_events_org_date(organization_id, start_date)
idx_pomodoro_user_created(user_id, created_at)
```

---

## Environment Setup Checklist

- [ ] Supabase schema updated (run SQL)
- [ ] Indexes created
- [ ] RLS enabled on all tables
- [ ] Realtime publications set
- [ ] Connection pooling enabled (optional, recommended)
- [ ] `.env` file configured
- [ ] All npm packages installed
- [ ] App runs without errors (`npm run dev`)

---

## Common Issues & Solutions

### Issue: Members not showing
**Solution:** 
```sql
-- Check RLS is enabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('memberships', 'invitations');
-- Should show 't' (true)
```

### Issue: Invitations not filtering correctly
**Solution:** Ensure `accepted` field is properly set to `false` when querying pending invitations

### Issue: Token validation always fails
**Solution:** 
1. Check token matches exactly (no whitespace)
2. Check email matches (case-sensitive in some DB configs)
3. Check expiration: `expires_at > NOW()`

### Issue: Performance slow after adding users
**Solution:** Run `ANALYZE public.memberships` in Supabase SQL editor

---

## Next Features to Consider

1. **Bulk invite** - CSV upload
2. **Organization branding** - Custom logo/colors
3. **Member activity log** - Audit trail
4. **Sub-teams** - Department/squad organization
5. **Custom roles** - Beyond admin/employee
6. **SSO Integration** - Google, GitHub auth
7. **Workspace switching** - Quick org switcher
8. **Member permissions matrix** - Fine-grained perms

---

**Documentation Version:** 1.0  
**Last Updated:** April 2026  
**Framework:** React 18 + TypeScript + Supabase + Zustand
