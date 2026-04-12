# Plan-IT Update Guide

## ✅ What's Been Implemented

### 1. **Profile Page** (`src/pages/ProfilePage.tsx`)
- Edit user profile (name, avatar)
- View and manage organization members
- Admin dashboard for team management
- See pending invitations
- Change member roles (admin/employee)
- Remove members from organization

### 2. **Organization Invitations System**
- New `invitations` table in database with tokens
- Invite users via email with secure tokens
- 7-day expiration on invitations
- Track who invited whom and when
- Copy invitation links for sharing
- Centralized invitation management

### 3. **Role-Based Access Control**
- **Admin**: Full organization control, invite users, change roles, remove members
- **Employee**: Standard team member without management permissions
- Different onboarding flows based on role selection

### 4. **Enhanced Onboarding** (`src/pages/OnboardingPage.tsx`)
- Step-based onboarding UI
- Option to create new organization OR join existing one
- Role selection when creating organization
- Better UX with clear guidance

### 5. **Join Organization** (`src/pages/JoinOrgPage.tsx`)
- Accept invitations via secure tokens
- Validates token, email, and expiration
- Auto-creates membership after acceptance
- Prevents duplicate memberships

### 6. **Updated Routes**
- `/profile` - Profile & team management
- `/join-org/:orgId` - Accept organization invitations
- Proper route protection with ProtectedRoute wrapper

### 7. **Database Performance Optimizations**
- Added optimal indexes on frequently queried columns:
  - `memberships(user_id, organization_id)` - composite index for auth checks
  - `invitations(organization_id, email, token, accepted, expires_at)` - optimized for invitation lookup
  - `projects(organization_id, created_at)` - range queries
  - `tasks(board_id, project_id)` - common filter combinations
  - `messages(organization_id, created_at)` - chat timeline queries
  - `events(organization_id, start_date)` - calendar queries
  - `pomodoro_sessions(user_id, created_at)` - user session lookups

---

## 🚀 Setup Instructions

### Step 1: Update Supabase Schema
1. Go to your Supabase dashboard
2. Navigate to SQL Editor
3. Copy and paste the entire contents of `supabase-schema.sql`
4. Execute the SQL

**Key changes:**
- New `invitations` table with token-based tracking
- Updated `memberships` role field: `'admin'` | `'employee'` (was `'member'`)
- New RLS policies for invitations
- Performance indexes added

### Step 2: Verify Database
Run these queries in Supabase SQL editor to confirm setup:

```sql
-- Check if invitations table exists
SELECT * FROM public.invitations LIMIT 1;

-- Check indexes
SELECT indexname FROM pg_indexes 
WHERE tablename IN ('memberships', 'invitations', 'projects', 'tasks');
```

### Step 3: Update Environment Variables
Add to your `.env` file if not already present:

```
VITE_SUPABASE_URL=your-project-url
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### Step 4: Start the App
```bash
npm install
npm run dev
```

---

## 📋 Features Overview

### Profile Management
1. Navigate to `/profile` or click avatar in sidebar
2. Edit your full name and avatar URL
3. View all team members with their roles
4. Admins can:
   - Change member roles
   - Remove members
   - Invite new users
   - Copy invitation links

### Inviting Team Members
1. Go to Profile page
2. Click "Invite" button (admin only)
3. Enter email and select role
4. Copy and share the invitation link
5. Invitee gets 7 days to accept
6. Auto-creates membership on acceptance

### Accepting Invitations
1. Receive invitation link from admin
2. Log in to your PLAN-IT account
3. Click the invitation link
4. Review organization and role details
5. Click "Accept Invitation"
6. Redirected to dashboard

---

## 🐛 Database Performance & Lag Issues

### Common Causes of Database Lag:
1. **Missing indexes** ✅ Fixed with composite indexes
2. **N+1 queries** - App was already optimized
3. **Large result sets without limits** - Consider pagination
4. **Inefficient RLS policies** - Already optimized in schema

### Performance Optimization Tips:

#### 1. **Enable Read Replicas** (Supabase Pro Plan)
- Go to Supabase Dashboard → Replication
- Create read replicas in different regions
- Supabase automatically routes reads to nearest replica

#### 2. **Enable Realtime Only on Needed Tables**
Current publication (in schema):
```sql
-- Already configured for: messages, tasks, comments
DROP PUBLICATION IF EXISTS supabase_realtime;
CREATE PUBLICATION supabase_realtime FOR TABLE
  public.messages,
  public.tasks,
  public.comments;
```

#### 3. **Connection Pooling**
- Use Supabase connection pooling in PostgreSQL
- Dashboard → Database → Connection pooling → Enable
- Set pool mode to "Transaction"

#### 4. **Query Optimization Checklist**

```typescript
// ❌ BAD - N+1 queries
const orgs = await supabase
  .from('organizations').select('*')
const members = await Promise.all(
  orgs.map(org => supabase.from('memberships').select('*').eq('organization_id', org.id))
)

// ✅ GOOD - Single query with joins
const { data } = await supabase
  .from('organizations')
  .select('*, memberships(*)')
```

#### 5. **Add Pagination for Large Datasets**

```typescript
// For chat messages, tasks, etc.
const { data, count } = await supabase
  .from('messages')
  .select('*', { count: 'exact' })
  .eq('organization_id', orgId)
  .order('created_at', { ascending: false })
  .range(0, 49)  // Fetch 50 at a time
```

#### 6. **Cache Strategy**
- Use Zustand store caching (already in use)
- Cache organization data for 5 minutes
- Invalidate cache on mutations

```typescript
// Example store caching
const useOrgStore = create((set, get) => ({
  orgs: null,
  lastFetch: null,
  
  fetchOrgs: async () => {
    const cached = get().orgs
    const age = Date.now() - (get().lastFetch || 0)
    
    if (cached && age < 300000) return cached // 5 min cache
    
    const { data } = await supabase.from('organizations').select('*')
    set({ orgs: data, lastFetch: Date.now() })
    return data
  }
}))
```

#### 7. **Database Maintenance**
Run these in Supabase periodically:

```sql
-- Analyze tables for query planner
ANALYZE public.memberships;
ANALYZE public.invitations;
ANALYZE public.projects;
ANALYZE public.tasks;

-- Vacuuming (automatic but can be manual)
VACUUM ANALYZE public.memberships;
```

#### 8. **Monitor Query Performance**
Go to Supabase Dashboard → Logs → Database Query Performance to identify slow queries.

---

## 🔒 Security Notes

### Invitations Token Security
- Tokens are randomly generated (36+ character strings)
- Tokens are unique per invitation
- Tokens can only be used once
- Tokens expire after 7 days
- Email is verified on acceptance

### RLS Policies
- All tables have row-level security enabled
- Users can only see/modify their organization's data
- Admins have elevated permissions for team management

---

## 📱 Testing Checklist

- [ ] Create organization during signup
- [ ] Select role when creating organization
- [ ] Visit profile page and see team members
- [ ] Invite a team member (as admin)
- [ ] Copy and share invitation link
- [ ] Accept invitation as new user
- [ ] Verify new member appears in team list
- [ ] Change member role (as admin)
- [ ] Remove a member (as admin)
- [ ] View pending invitations
- [ ] Accept/decline expired invitations
- [ ] Verify employee cannot invite others
- [ ] Check database performance improved

---

## 🆘 Troubleshooting

### "Invalid Invitation" Error
- Check token is correct
- Check email matches invitation email
- Check invitation hasn't expired (7 days)
- Check you're not already a member

### Members Not Showing
- Ensure RLS policies are enabled in schema
- Check `memberships` table has your org_id and user_id
- Try refreshing the page

### Performance Still Slow
1. Check Supabase logs for slow queries
2. Verify indexes exist: `SELECT * FROM pg_indexes WHERE table schema = 'public'`
3. Consider enabling connection pooling
4. Check your internet connection
5. Try enabling read replicas (Pro plan)

---

Last Updated: April 2026
