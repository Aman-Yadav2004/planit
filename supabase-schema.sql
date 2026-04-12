-- =============================================
-- PLAN-IT - Complete Supabase SQL Schema
-- Run this in your Supabase SQL Editor
-- =============================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- PROFILES (extends Supabase auth.users)
-- =============================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  role TEXT DEFAULT 'user',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger: create profile on new user sign-up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================
-- ORGANIZATIONS
-- =============================================
CREATE TABLE IF NOT EXISTS public.organizations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  org_code TEXT UNIQUE NOT NULL DEFAULT (substring(md5(random()::text || clock_timestamp()::text), 1, 8)),
  logo_url TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- MEMBERSHIPS (org users)
-- =============================================
CREATE TABLE IF NOT EXISTS public.memberships (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  role TEXT DEFAULT 'employee' CHECK (role IN ('admin', 'employee')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, user_id)
);

-- =============================================
-- INVITATIONS (pending org invites)
-- =============================================
CREATE TABLE IF NOT EXISTS public.invitations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  email TEXT NOT NULL,
  role TEXT DEFAULT 'employee' CHECK (role IN ('admin', 'employee')),
  invited_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  token TEXT UNIQUE NOT NULL,
  accepted BOOLEAN DEFAULT FALSE,
  accepted_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  accepted_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, email)
);

-- =============================================
-- PROJECTS
-- =============================================
CREATE TABLE IF NOT EXISTS public.projects (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#6366f1',
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- BOARDS (Kanban columns)
-- =============================================
CREATE TABLE IF NOT EXISTS public.boards (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  position INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- TASKS
-- =============================================
CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  board_id UUID REFERENCES public.boards(id) ON DELETE CASCADE NOT NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status TEXT DEFAULT 'todo',
  assignee_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  due_date TIMESTAMPTZ,
  position INTEGER DEFAULT 0,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- COMMENTS
-- =============================================
CREATE TABLE IF NOT EXISTS public.comments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- CRM CONTACTS
-- =============================================
CREATE TABLE IF NOT EXISTS public.crm_contacts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  company TEXT,
  stage TEXT DEFAULT 'lead' CHECK (stage IN ('lead', 'contacted', 'qualified', 'proposal', 'converted', 'lost')),
  notes TEXT,
  assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- DEALS
-- =============================================
CREATE TABLE IF NOT EXISTS public.deals (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  contact_id UUID REFERENCES public.crm_contacts(id) ON DELETE CASCADE NOT NULL,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  value DECIMAL(12, 2),
  stage TEXT DEFAULT 'open',
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- MESSAGES (Chat)
-- =============================================
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- EVENTS (Calendar)
-- =============================================
CREATE TABLE IF NOT EXISTS public.events (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  start_date DATE NOT NULL,
  end_date DATE,
  type TEXT DEFAULT 'event' CHECK (type IN ('event', 'task', 'followup')),
  related_task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
  related_contact_id UUID REFERENCES public.crm_contacts(id) ON DELETE SET NULL,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- POMODORO SESSIONS
-- =============================================
CREATE TABLE IF NOT EXISTS public.pomodoro_sessions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  duration_minutes INTEGER NOT NULL,
  type TEXT DEFAULT 'focus' CHECK (type IN ('focus', 'break')),
  completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- INDEXES (performance)
-- =============================================
CREATE INDEX IF NOT EXISTS idx_memberships_user_org ON public.memberships(user_id, organization_id);
CREATE INDEX IF NOT EXISTS idx_memberships_org ON public.memberships(organization_id);
CREATE INDEX IF NOT EXISTS idx_invitations_org ON public.invitations(organization_id);
CREATE INDEX IF NOT EXISTS idx_invitations_email ON public.invitations(email);
CREATE INDEX IF NOT EXISTS idx_invitations_token ON public.invitations(token);
CREATE INDEX IF NOT EXISTS idx_invitations_accepted ON public.invitations(accepted, expires_at);
CREATE INDEX IF NOT EXISTS idx_projects_org_created ON public.projects(organization_id, created_at);
CREATE INDEX IF NOT EXISTS idx_boards_project ON public.boards(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_board_project ON public.tasks(board_id, project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee ON public.tasks(assignee_id);
CREATE INDEX IF NOT EXISTS idx_tasks_created ON public.tasks(created_at);
CREATE INDEX IF NOT EXISTS idx_comments_task ON public.comments(task_id);
CREATE INDEX IF NOT EXISTS idx_crm_contacts_org ON public.crm_contacts(organization_id);
CREATE INDEX IF NOT EXISTS idx_messages_org_created ON public.messages(organization_id, created_at);
CREATE INDEX IF NOT EXISTS idx_messages_project ON public.messages(project_id);
CREATE INDEX IF NOT EXISTS idx_events_org_date ON public.events(organization_id, start_date);
CREATE INDEX IF NOT EXISTS idx_pomodoro_user_created ON public.pomodoro_sessions(user_id, created_at);

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pomodoro_sessions ENABLE ROW LEVEL SECURITY;

-- Helper function: check if user is in org
CREATE OR REPLACE FUNCTION public.is_org_member(org_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.memberships
    WHERE organization_id = org_id AND user_id = auth.uid()
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper function: check if user is org admin
CREATE OR REPLACE FUNCTION public.is_org_admin(org_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.memberships
    WHERE organization_id = org_id AND user_id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Org members can view each other's profiles" ON public.profiles;
DROP POLICY IF EXISTS "Org members can view organization" ON public.organizations;
DROP POLICY IF EXISTS "Org creators can view own organization" ON public.organizations;
DROP POLICY IF EXISTS "Authenticated users can create org" ON public.organizations;
DROP POLICY IF EXISTS "Org admins can update" ON public.organizations;
DROP POLICY IF EXISTS "Members can view memberships in their org" ON public.memberships;
DROP POLICY IF EXISTS "Org creators can insert first membership" ON public.memberships;
DROP POLICY IF EXISTS "Admins can insert memberships" ON public.memberships;
DROP POLICY IF EXISTS "Admins can update memberships" ON public.memberships;
DROP POLICY IF EXISTS "Admins can delete memberships" ON public.memberships;
DROP POLICY IF EXISTS "Admins can view invitations" ON public.invitations;
DROP POLICY IF EXISTS "Users can view invitations sent to them" ON public.invitations;
DROP POLICY IF EXISTS "Admins can create invitations" ON public.invitations;
DROP POLICY IF EXISTS "Admins can update invitations" ON public.invitations;
DROP POLICY IF EXISTS "Admins can delete invitations" ON public.invitations;
DROP POLICY IF EXISTS "Org members can view projects" ON public.projects;
DROP POLICY IF EXISTS "Org members can create projects" ON public.projects;
DROP POLICY IF EXISTS "Org members can update projects" ON public.projects;
DROP POLICY IF EXISTS "Org admins can delete projects" ON public.projects;
DROP POLICY IF EXISTS "Project members can view boards" ON public.boards;
DROP POLICY IF EXISTS "Project members can manage boards" ON public.boards;
DROP POLICY IF EXISTS "Project members can view tasks" ON public.tasks;
DROP POLICY IF EXISTS "Project members can create tasks" ON public.tasks;
DROP POLICY IF EXISTS "Project members can update tasks" ON public.tasks;
DROP POLICY IF EXISTS "Task creator or admin can delete" ON public.tasks;
DROP POLICY IF EXISTS "Task members can view comments" ON public.comments;
DROP POLICY IF EXISTS "Task members can add comments" ON public.comments;
DROP POLICY IF EXISTS "Comment owners can update" ON public.comments;
DROP POLICY IF EXISTS "Comment owners can delete" ON public.comments;
DROP POLICY IF EXISTS "Org members can view contacts" ON public.crm_contacts;
DROP POLICY IF EXISTS "Org members can create contacts" ON public.crm_contacts;
DROP POLICY IF EXISTS "Org members can update contacts" ON public.crm_contacts;
DROP POLICY IF EXISTS "Org admins can delete contacts" ON public.crm_contacts;
DROP POLICY IF EXISTS "Org members can view deals" ON public.deals;
DROP POLICY IF EXISTS "Org members can manage deals" ON public.deals;
DROP POLICY IF EXISTS "Org members can view messages" ON public.messages;
DROP POLICY IF EXISTS "Org members can send messages" ON public.messages;
DROP POLICY IF EXISTS "Org members can view events" ON public.events;
DROP POLICY IF EXISTS "Org members can create events" ON public.events;
DROP POLICY IF EXISTS "Event creators can update" ON public.events;
DROP POLICY IF EXISTS "Event creators can delete" ON public.events;
DROP POLICY IF EXISTS "Users can view own sessions" ON public.pomodoro_sessions;
DROP POLICY IF EXISTS "Users can create own sessions" ON public.pomodoro_sessions;
DROP POLICY IF EXISTS "Users can update own sessions" ON public.pomodoro_sessions;

-- PROFILES policies
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Org members can view each other's profiles" ON public.profiles FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.memberships m1
    JOIN public.memberships m2 ON m1.organization_id = m2.organization_id
    WHERE m1.user_id = auth.uid() AND m2.user_id = profiles.id
  )
);

-- ORGANIZATIONS policies
CREATE POLICY "Org members can view organization" ON public.organizations FOR SELECT USING (public.is_org_member(id));
CREATE POLICY "Org creators can view own organization" ON public.organizations FOR SELECT USING (auth.uid() = created_by);
CREATE POLICY "Authenticated users can create org" ON public.organizations FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Org admins can update" ON public.organizations FOR UPDATE USING (public.is_org_admin(id));

-- MEMBERSHIPS policies
CREATE POLICY "Members can view memberships in their org" ON public.memberships FOR SELECT USING (public.is_org_member(organization_id));
CREATE POLICY "Org creators can insert first membership" ON public.memberships FOR INSERT WITH CHECK (
  auth.uid() = user_id AND 
  EXISTS (SELECT 1 FROM public.organizations WHERE id = organization_id AND created_by = auth.uid())
);
CREATE POLICY "Admins can insert memberships" ON public.memberships FOR INSERT WITH CHECK (public.is_org_admin(organization_id));
CREATE POLICY "Admins can update memberships" ON public.memberships FOR UPDATE USING (public.is_org_admin(organization_id));
CREATE POLICY "Admins can delete memberships" ON public.memberships FOR DELETE USING (public.is_org_admin(organization_id));

-- INVITATIONS policies
CREATE POLICY "Admins can view invitations" ON public.invitations FOR SELECT USING (public.is_org_admin(organization_id));
CREATE POLICY "Users can view invitations sent to them" ON public.invitations FOR SELECT USING (
  email = (SELECT email FROM public.profiles WHERE id = auth.uid())
);
CREATE POLICY "Admins can create invitations" ON public.invitations FOR INSERT WITH CHECK (public.is_org_admin(organization_id));
CREATE POLICY "Admins can update invitations" ON public.invitations FOR UPDATE USING (public.is_org_admin(organization_id));
CREATE POLICY "Admins can delete invitations" ON public.invitations FOR DELETE USING (public.is_org_admin(organization_id));

-- PROJECTS policies
CREATE POLICY "Org members can view projects" ON public.projects FOR SELECT USING (public.is_org_member(organization_id));
CREATE POLICY "Org members can create projects" ON public.projects FOR INSERT WITH CHECK (public.is_org_member(organization_id));
CREATE POLICY "Org members can update projects" ON public.projects FOR UPDATE USING (public.is_org_member(organization_id));
CREATE POLICY "Org admins can delete projects" ON public.projects FOR DELETE USING (public.is_org_admin(organization_id));

-- BOARDS policies
CREATE POLICY "Project members can view boards" ON public.boards FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND public.is_org_member(p.organization_id))
);
CREATE POLICY "Project members can manage boards" ON public.boards FOR ALL USING (
  EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND public.is_org_member(p.organization_id))
);

-- TASKS policies
CREATE POLICY "Project members can view tasks" ON public.tasks FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND public.is_org_member(p.organization_id))
);
CREATE POLICY "Project members can create tasks" ON public.tasks FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND public.is_org_member(p.organization_id))
);
CREATE POLICY "Project members can update tasks" ON public.tasks FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND public.is_org_member(p.organization_id))
);
CREATE POLICY "Task creator or admin can delete" ON public.tasks FOR DELETE USING (
  created_by = auth.uid() OR
  EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND public.is_org_admin(p.organization_id))
);

-- COMMENTS policies
CREATE POLICY "Task members can view comments" ON public.comments FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.tasks t JOIN public.projects p ON p.id = t.project_id WHERE t.id = task_id AND public.is_org_member(p.organization_id))
);
CREATE POLICY "Task members can add comments" ON public.comments FOR INSERT WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (SELECT 1 FROM public.tasks t JOIN public.projects p ON p.id = t.project_id WHERE t.id = task_id AND public.is_org_member(p.organization_id))
);
CREATE POLICY "Comment owners can update" ON public.comments FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Comment owners can delete" ON public.comments FOR DELETE USING (user_id = auth.uid());

-- CRM CONTACTS policies
CREATE POLICY "Org members can view contacts" ON public.crm_contacts FOR SELECT USING (public.is_org_member(organization_id));
CREATE POLICY "Org members can create contacts" ON public.crm_contacts FOR INSERT WITH CHECK (public.is_org_member(organization_id));
CREATE POLICY "Org members can update contacts" ON public.crm_contacts FOR UPDATE USING (public.is_org_member(organization_id));
CREATE POLICY "Org admins can delete contacts" ON public.crm_contacts FOR DELETE USING (public.is_org_admin(organization_id) OR created_by = auth.uid());

-- DEALS policies
CREATE POLICY "Org members can view deals" ON public.deals FOR SELECT USING (public.is_org_member(organization_id));
CREATE POLICY "Org members can manage deals" ON public.deals FOR ALL USING (public.is_org_member(organization_id));

-- MESSAGES policies
CREATE POLICY "Org members can view messages" ON public.messages FOR SELECT USING (public.is_org_member(organization_id));
CREATE POLICY "Org members can send messages" ON public.messages FOR INSERT WITH CHECK (auth.uid() = user_id AND public.is_org_member(organization_id));

-- EVENTS policies
CREATE POLICY "Org members can view events" ON public.events FOR SELECT USING (public.is_org_member(organization_id));
CREATE POLICY "Org members can create events" ON public.events FOR INSERT WITH CHECK (public.is_org_member(organization_id));
CREATE POLICY "Event creators can update" ON public.events FOR UPDATE USING (created_by = auth.uid() OR public.is_org_admin(organization_id));
CREATE POLICY "Event creators can delete" ON public.events FOR DELETE USING (created_by = auth.uid() OR public.is_org_admin(organization_id));

-- POMODORO SESSIONS policies
CREATE POLICY "Users can view own sessions" ON public.pomodoro_sessions FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can create own sessions" ON public.pomodoro_sessions FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own sessions" ON public.pomodoro_sessions FOR UPDATE USING (user_id = auth.uid());

-- =============================================
-- REALTIME (enable for chat & tasks)
-- =============================================
-- Run in Supabase dashboard: Realtime > Tables
-- Or via SQL:
BEGIN;
  DROP PUBLICATION IF EXISTS supabase_realtime;
  CREATE PUBLICATION supabase_realtime FOR TABLE
    public.messages,
    public.tasks,
    public.comments;
COMMIT;
