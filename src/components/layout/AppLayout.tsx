import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import {
  LayoutDashboard, FolderKanban, Users, MessageSquare,
  Calendar, Timer, LogOut, ChevronDown, Plus, Settings,
  Bell, Search
} from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { Avatar } from '../ui/Avatar'
import { ToastContainer } from '../ui/Toast'

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/projects', label: 'Projects', icon: FolderKanban },
  { to: '/crm', label: 'CRM', icon: Users },
  { to: '/chat', label: 'Chat', icon: MessageSquare },
  { to: '/calendar', label: 'Calendar', icon: Calendar },
  { to: '/pomodoro', label: 'Focus', icon: Timer },
]

export function AppLayout() {
  const { user, organization, signOut } = useAuthStore()
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState(false)

  const handleSignOut = async () => {
    await signOut()
    navigate('/auth')
  }

  return (
    <div className="flex h-screen bg-surface overflow-hidden">
      {/* Sidebar */}
      <aside className={`flex flex-col bg-surface-1 border-r border-white/5 transition-all duration-300 flex-shrink-0 ${collapsed ? 'w-16' : 'w-60'}`}>
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-5 border-b border-white/5">
          <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center flex-shrink-0 text-lg">
            🪐
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <div className="font-bold text-white tracking-tight">PLAN-IT</div>
              <div className="text-white/30 text-xs truncate">{organization?.name}</div>
            </div>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="ml-auto text-white/30 hover:text-white/60 transition-colors flex-shrink-0"
          >
            <ChevronDown size={14} className={`transition-transform duration-300 ${collapsed ? '-rotate-90' : 'rotate-90'}`} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group ${
                  isActive
                    ? 'bg-brand-600/20 text-brand-300 border border-brand-500/20'
                    : 'text-white/50 hover:text-white hover:bg-white/5'
                }`
              }
            >
              <Icon size={18} className="flex-shrink-0" />
              {!collapsed && <span className="truncate">{label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* User */}
        <div className="p-3 border-t border-white/5">
          <div className={`flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 transition-colors cursor-pointer group`}>
            <Avatar name={user?.full_name || user?.email} size="sm" />
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-white truncate">{user?.full_name || 'User'}</div>
                <div className="text-xs text-white/30 truncate">{user?.email}</div>
              </div>
            )}
            {!collapsed && (
              <button
                onClick={handleSignOut}
                className="opacity-0 group-hover:opacity-100 text-white/30 hover:text-white/60 transition-all"
                title="Sign out"
              >
                <LogOut size={14} />
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-hidden flex flex-col min-w-0">
        {/* Top bar */}
        <header className="flex items-center gap-4 px-6 py-4 border-b border-white/5 bg-surface-1/50 backdrop-blur-sm flex-shrink-0">
          <div className="flex-1 relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
            <input
              type="text"
              placeholder="Search anything..."
              className="input pl-9 max-w-sm bg-surface-2/50"
            />
          </div>
          <button className="btn-ghost p-2 relative">
            <Bell size={16} />
            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-brand-500 rounded-full" />
          </button>
          <Avatar name={user?.full_name || user?.email} size="sm" />
        </header>

        {/* Content */}
        <div className="flex-1 overflow-auto">
          <Outlet />
        </div>
      </main>

      <ToastContainer />
    </div>
  )
}
