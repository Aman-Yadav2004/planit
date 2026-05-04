import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { FolderKanban, Users, MessageSquare, Timer, TrendingUp, CheckSquare, Clock, Plus, Calendar } from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { useProjectsStore } from '../store/projectsStore'
import { useCrmStore } from '../store/crmStore'
import { supabase } from '../lib/supabase'
import { toast, ToastContainer } from '../components/ui/Toast'
import type { Task } from '../types/supabase'

export function DashboardPage() {
  const { user, organization } = useAuthStore()
  const { projects, fetchProjects } = useProjectsStore()
  const { contacts, fetchContacts } = useCrmStore()
  const [myTasks, setMyTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [todayAttendance, setTodayAttendance] = useState<any>(null)
  const [markingAttendance, setMarkingAttendance] = useState(false)

  useEffect(() => {
    if (!organization) return
    Promise.all([
      fetchProjects(organization.id),
      fetchContacts(organization.id),
      fetchMyTasks(),
      fetchTodayAttendance(),
    ]).finally(() => setLoading(false))
  }, [organization?.id])

  const fetchTodayAttendance = async () => {
    if (!user) return
    const today = new Date().toISOString().split('T')[0]
    const { data } = await supabase
      .from('attendances')
      .select('*')
      .eq('user_id', user.id)
      .eq('date', today)
      .maybeSingle()
    setTodayAttendance(data)
  }

  const handleMarkAttendance = async () => {
    if (!user || !organization) return
    setMarkingAttendance(true)
    try {
      if (todayAttendance) {
        toast.info('Attendance already marked for today')
      } else {
        const today = new Date().toISOString().split('T')[0]
        const { error } = await supabase.from('attendances').insert({
          user_id: user.id,
          organization_id: organization.id,
          date: today,
          started_at: new Date().toISOString(),
          duration_minutes: 480,
        })
        if (error) throw error
        toast.success('Attendance marked!')
        await fetchTodayAttendance()
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to mark attendance')
    } finally {
      setMarkingAttendance(false)
    }
  }

  const fetchMyTasks = async () => {
    if (!user) return
    const { data } = await supabase
      .from('tasks')
      .select('*')
      .eq('assignee_id', user.id)
      .neq('status', 'done')
      .order('due_date', { ascending: true })
      .limit(5)
    setMyTasks(data || [])
  }

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
  const firstName = user?.full_name?.split(' ')[0] || 'there'

  const stats = [
    { label: 'Projects', value: projects.length, icon: FolderKanban, color: 'text-brand-400', bg: 'bg-brand-500/10', to: '/projects' },
    { label: 'CRM Contacts', value: contacts.length, icon: Users, color: 'text-violet-400', bg: 'bg-violet-500/10', to: '/crm' },
    { label: 'My Open Tasks', value: myTasks.length, icon: CheckSquare, color: 'text-emerald-400', bg: 'bg-emerald-500/10', to: '/projects' },
    { label: 'Converted Leads', value: contacts.filter(c => c.stage === 'converted').length, icon: TrendingUp, color: 'text-amber-400', bg: 'bg-amber-500/10', to: '/crm' },
  ]

  return (
    <>
      <div className="p-6 max-w-6xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">{greeting}, {firstName} 👋</h1>
          <p className="text-white/40 text-sm mt-1">Here's what's happening in {organization?.name}</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={handleMarkAttendance}
            disabled={markingAttendance || !!todayAttendance}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all ${
              todayAttendance 
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                : 'btn-ghost hover:bg-white/5'
            }`}
          >
            <Calendar size={16} />
            {todayAttendance ? '✓ Marked' : 'Mark Attendance'}
          </button>
          <Link to="/pomodoro" className="btn-ghost flex items-center gap-2">
            <Timer size={16} /> Focus
          </Link>
          <Link to="/projects" className="btn-primary flex items-center gap-2">
            <Plus size={15} /> New Project
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(({ label, value, icon: Icon, color, bg, to }) => (
          <Link key={label} to={to} className="card p-5 hover:border-white/10 transition-colors group">
            <div className="flex items-start justify-between mb-3">
              <div className={`${bg} rounded-xl p-2.5`}>
                <Icon size={18} className={color} />
              </div>
            </div>
            <div className="text-2xl font-bold text-white mb-0.5">{loading ? '—' : value}</div>
            <div className="text-sm text-white/40">{label}</div>
          </Link>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* My Tasks */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-white">My Open Tasks</h2>
            <Link to="/projects" className="text-brand-400 text-xs hover:text-brand-300">View all →</Link>
          </div>
          {myTasks.length === 0 ? (
            <div className="text-center py-8 text-white/30 text-sm">
              <CheckSquare size={28} className="mx-auto mb-2 opacity-30" />
              No open tasks. Nice work!
            </div>
          ) : (
            <div className="space-y-2">
              {myTasks.map(task => (
                <div key={task.id} className="flex items-center gap-3 p-3 bg-surface-2 rounded-xl border border-white/5">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    task.priority === 'urgent' ? 'bg-red-400' :
                    task.priority === 'high' ? 'bg-orange-400' :
                    task.priority === 'medium' ? 'bg-amber-400' : 'bg-slate-400'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-white truncate">{task.title}</div>
                    {task.due_date && (
                      <div className="flex items-center gap-1 mt-0.5">
                        <Clock size={10} className="text-white/30" />
                        <span className="text-xs text-white/30">{new Date(task.due_date).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Projects */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-white">Recent Projects</h2>
            <Link to="/projects" className="text-brand-400 text-xs hover:text-brand-300">View all →</Link>
          </div>
          {projects.length === 0 ? (
            <div className="text-center py-8 text-white/30 text-sm">
              <FolderKanban size={28} className="mx-auto mb-2 opacity-30" />
              No projects yet. Create your first one!
            </div>
          ) : (
            <div className="space-y-2">
              {projects.slice(0, 5).map(project => (
                <Link
                  key={project.id}
                  to={`/projects/${project.id}`}
                  className="flex items-center gap-3 p-3 bg-surface-2 rounded-xl border border-white/5 hover:border-white/10 transition-colors"
                >
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: project.color }} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-white truncate">{project.name}</div>
                    {project.description && (
                      <div className="text-xs text-white/30 truncate">{project.description}</div>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { to: '/chat', icon: MessageSquare, label: 'Open Chat', desc: 'Team messages', color: 'text-blue-400' },
          { to: '/crm', icon: Users, label: 'CRM Pipeline', desc: 'Manage leads', color: 'text-violet-400' },
          { to: '/calendar', icon: Clock, label: 'Calendar', desc: 'Upcoming events', color: 'text-emerald-400' },
        ].map(({ to, icon: Icon, label, desc, color }) => (
          <Link key={to} to={to} className="card p-4 hover:border-white/10 transition-colors flex items-center gap-3">
            <Icon size={20} className={color} />
            <div>
              <div className="text-sm font-medium text-white">{label}</div>
              <div className="text-xs text-white/30">{desc}</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
    <ToastContainer />
    </>
  )
}
