# 🪐 PLAN-IT — Project Management Suite

A full-featured, production-ready project management tool with Jira-like boards, CRM, real-time chat, calendar, and a Pomodoro timer. Built with React, TypeScript, Tailwind CSS, and Supabase.

---

## ✨ Features

| Module | Features |
|--------|----------|
| **Auth** | Email/password login, registration, user profiles, organizations |
| **Projects** | Create projects with colors, manage boards (Kanban) |
| **Kanban** | Drag-and-drop columns & tasks, task priority, due dates, assignees, comments |
| **CRM** | Contact pipeline (Lead → Converted), notes, list & pipeline views |
| **Chat** | Real-time org-wide & per-project channels via Supabase Realtime |
| **Calendar** | Monthly calendar with events, tasks, and follow-ups |
| **Pomodoro** | 25/5 timer, session history, stats |
| **Dark Mode** | Full dark theme throughout |

---

## 🛠 Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS (dark mode, custom design system)
- **State**: Zustand stores per domain
- **Backend**: Supabase (Auth, Postgres, Realtime, RLS)
- **DnD**: @dnd-kit/core for Kanban drag-and-drop
- **Routing**: React Router v6
- **Icons**: Lucide React
- **Dates**: date-fns

---

## 📁 Folder Structure

```
src/
├── components/
│   ├── auth/          # (future: invite flow)
│   ├── layout/        # AppLayout, sidebar
│   ├── tasks/         # TaskCard, BoardColumn, TaskDetail
│   ├── ui/            # Modal, Avatar, Badges, Toast, EmptyState
│   └── ...
├── hooks/             # (custom hooks)
├── lib/
│   └── supabase.ts    # Supabase client
├── pages/
│   ├── AuthPage.tsx
│   ├── OnboardingPage.tsx
│   ├── DashboardPage.tsx
│   ├── ProjectsPage.tsx
│   ├── BoardPage.tsx
│   ├── CrmPage.tsx
│   ├── ChatPage.tsx
│   ├── CalendarPage.tsx
│   └── PomodoroPage.tsx
├── store/
│   ├── authStore.ts
│   ├── projectsStore.ts
│   ├── crmStore.ts
│   └── chatStore.ts
├── types/
│   └── supabase.ts    # All TypeScript types
├── App.tsx
├── main.tsx
└── index.css
```

---

## 🚀 Setup Instructions

### Step 1: Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign up
2. Click **New Project**
3. Choose a name, password, and region
4. Wait for the project to initialize (~2 min)

### Step 2: Run the SQL Schema

1. In your Supabase dashboard, go to **SQL Editor**
2. Click **New Query**
3. Copy the entire contents of `supabase-schema.sql`
4. Paste and click **Run**

This creates all tables, indexes, RLS policies, and triggers.

### Step 3: Enable Realtime

1. In Supabase dashboard, go to **Database → Replication**
2. Under "Source", ensure `supabase_realtime` publication includes:
   - `messages`
   - `tasks`
   - `comments`
3. Or run this in SQL Editor:
```sql
BEGIN;
  DROP PUBLICATION IF EXISTS supabase_realtime;
  CREATE PUBLICATION supabase_realtime FOR TABLE
    public.messages, public.tasks, public.comments;
COMMIT;
```

### Step 4: Get API Keys

1. In Supabase dashboard, go to **Settings → API**
2. Copy:
   - **Project URL** (e.g., `https://xxxx.supabase.co`)
   - **anon public key** (starts with `eyJ...`)

### Step 5: Configure Environment

```bash
# In the project root, create .env
cp .env.example .env
```

Edit `.env`:
```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Step 6: Install & Run

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

### Step 7: Build for Production

```bash
npm run build
npm run preview
```

---

## 🗄 Database Schema

```
profiles          ← extends auth.users via trigger
organizations     ← company/team workspace
memberships       ← user ↔ org (many-to-many, with roles)
projects          ← belongs to org
boards            ← Kanban columns, belong to project
tasks             ← belong to board + project
comments          ← belong to task
crm_contacts      ← leads/clients in org
deals             ← belong to contact
messages          ← org-wide or project chat
events            ← calendar items
pomodoro_sessions ← per user
```

### Row Level Security

All tables are protected with RLS policies:
- Users can only access data in their organization
- Admins can delete projects/contacts
- Users own their own pomodoro sessions and comments

---

## 🔒 Security Notes

- Never expose your Supabase **service_role** key in the frontend
- Only the **anon key** is used client-side
- RLS policies enforce multi-tenant isolation
- The `handle_new_user` trigger runs with `SECURITY DEFINER` to safely create profiles

---

## 📡 Realtime Architecture

Chat uses Supabase Realtime's `postgres_changes` feature:
```
User sends message → INSERT into messages table
→ Supabase broadcasts to all subscribers of that channel
→ Clients receive the new message and fetch full details (with JOIN)
→ UI updates instantly
```

Each channel is scoped by `organization_id` or `project_id`.

---

## 🎨 Design System

Custom dark theme built on Tailwind with CSS variables:

| Token | Value |
|-------|-------|
| `bg-surface` | `#0f0f13` (base background) |
| `bg-surface-1` | `#161620` (cards, sidebar) |
| `bg-surface-2` | `#1e1e2a` (inner cards) |
| `bg-surface-3` | `#252535` (inputs, dropdowns) |
| `brand-600` | `#4f46e5` (primary action) |

---

## 🔧 Customization

### Adding a new Kanban column default
Edit `BoardPage.tsx`:
```ts
const DEFAULT_BOARDS = ['To Do', 'In Progress', 'Review', 'Done']
```

### Changing Pomodoro durations
Edit `PomodoroPage.tsx`:
```ts
const MODES = {
  focus:      { duration: 25 * 60, ... },
  break:      { duration: 5 * 60, ... },
  long_break: { duration: 15 * 60, ... },
}
```

### Adding CRM stages
Edit `CrmPage.tsx` and update the Supabase `CHECK` constraint in the schema.

---

## 🚧 Roadmap / Bonus Features

- [ ] Email invitations to organization
- [ ] File attachments (Supabase Storage)
- [ ] Global search (Supabase full-text search)
- [ ] Notification center
- [ ] Activity log / audit trail
- [ ] Mobile responsive improvements
- [ ] Dark/light mode toggle
- [ ] Export to CSV (CRM)
- [ ] Gantt chart view
- [ ] Recurring calendar events

---

## 🐛 Troubleshooting

**"Missing Supabase environment variables"**
→ Make sure `.env` exists and has both `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.

**Auth works but no organization appears**
→ Complete onboarding at `/onboarding` to create an organization.

**Realtime chat not working**
→ Ensure the `supabase_realtime` publication includes the `messages` table (Step 3 above).

**RLS errors (403)**
→ Make sure you ran the full `supabase-schema.sql` including all policy statements.

**Drag and drop not working on mobile**
→ Add `TouchSensor` from `@dnd-kit/core` alongside `PointerSensor`.
