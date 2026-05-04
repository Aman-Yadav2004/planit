import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import { AppLayout } from './components/layout/AppLayout'
import { AuthPage } from './pages/AuthPage'
import { DashboardPage } from './pages/DashboardPage'
import { ProjectsPage } from './pages/ProjectsPage'
import { BoardPage } from './pages/BoardPage'
import { CrmPageNew } from './pages/CrmPageNew'
import { ChatPage } from './pages/ChatPage'
import { CalendarPage } from './pages/CalendarPage'
import { PomodoroPage } from './pages/PomodoroPage'
import { AttendancePage } from './pages/AttendancePage'
import { OnboardingPage } from './pages/OnboardingPage'
import { ProfilePage } from './pages/ProfilePage'
import { JoinOrgPage } from './pages/JoinOrgPage'
import { LoadingScreen } from './components/ui/LoadingScreen'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, initialized } = useAuthStore()
  if (!initialized) return <LoadingScreen />
  if (!user) return <Navigate to="/auth" replace />
  return <>{children}</>
}

function OrgRoute({ children }: { children: React.ReactNode }) {
  const { user, organization, initialized } = useAuthStore()
  if (!initialized) return <LoadingScreen />
  if (!user) return <Navigate to="/auth" replace />
  if (!organization) return <Navigate to="/onboarding" replace />
  return <>{children}</>
}

export default function App() {
  const { initialize } = useAuthStore()

  useEffect(() => {
    initialize()
  }, [])

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/onboarding" element={
          <ProtectedRoute><OnboardingPage /></ProtectedRoute>
        } />
        <Route path="/join-org/:orgId" element={
          <ProtectedRoute><JoinOrgPage /></ProtectedRoute>
        } />
        <Route path="/" element={
          <OrgRoute><AppLayout /></OrgRoute>
        }>
          <Route index element={<DashboardPage />} />
          <Route path="projects" element={<ProjectsPage />} />
          <Route path="projects/:projectId" element={<BoardPage />} />
          <Route path="crm" element={<CrmPageNew />} />
          <Route path="chat" element={<ChatPage />} />
          <Route path="calendar" element={<CalendarPage />} />
          <Route path="pomodoro" element={<PomodoroPage />} />
          <Route path="attendance" element={<AttendancePage />} />
          <Route path="profile" element={<ProfilePage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
