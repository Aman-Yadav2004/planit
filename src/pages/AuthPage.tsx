import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { toast } from '../components/ui/Toast'
import { ToastContainer } from '../components/ui/Toast'
import { Eye, EyeOff, Loader2 } from 'lucide-react'

const validatePassword = (pwd: string): string | null => {
  if (!pwd) return 'Password is required'
  if (pwd.length < 8) return 'Password must be at least 8 characters'
  if (!/[A-Z]/.test(pwd)) return 'Password must contain uppercase letter'
  if (!/[a-z]/.test(pwd)) return 'Password must contain lowercase letter'
  if (!/[0-9]/.test(pwd)) return 'Password must contain number'
  if (!/[!@#$%^&*]/.test(pwd)) return 'Password must contain special character (!@#$%^&*)'
  return null
}

export function AuthPage() {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [passwordError, setPasswordError] = useState('')
  const { signIn, signUp, loading } = useAuthStore()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (mode === 'login') {
        const { error } = await signIn(email, password)
        if (error) { toast.error(error); return }
        navigate('/')
      } else {
        if (!fullName.trim()) { toast.error('Please enter your name'); return }
        const pwdError = validatePassword(password)
        if (pwdError) { toast.error(pwdError); return }
        const { error } = await signUp(email, password, fullName)
        if (error) { toast.error(error); return }
        toast.success('Account created! Set up your organization.')
        navigate('/onboarding')
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Authentication failed. Please try again.')
    }
  }

  return (
    <div className="min-h-screen bg-surface flex">
      {/* Left panel */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 bg-surface-1 p-12 border-r border-white/5 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-900/30 via-transparent to-violet-900/20" />
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-brand-600/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl" />

        <div className="relative flex items-center gap-3">
          <div className="w-10 h-10 bg-brand-600 rounded-xl flex items-center justify-center">
            <img src="/plant.svg" alt="" className="w-7 h-7" />
          </div>
          <span className="font-bold text-xl tracking-tight">PLAN-IT</span>
        </div>

        <div className="relative">
          <h1 className="text-4xl font-bold text-white leading-tight mb-4">
            Your team's mission<br />
            <span className="text-brand-400">control center.</span>
          </h1>
          <p className="text-white/50 text-lg mb-8">
            Projects, CRM, chat, and productivity tools — all in one growing workspace.
          </p>
          <div className="grid grid-cols-2 gap-3">
            {['Kanban Boards', 'CRM Pipeline', 'Team Chat', 'Focus Timer'].map(f => (
              <div key={f} className="bg-surface-2/60 border border-white/5 rounded-xl px-4 py-3">
                <div className="text-sm text-white/70 font-medium">{f}</div>
              </div>
            ))}
          </div>
        </div>

        <p className="relative text-white/20 text-sm">© 2025 PLAN-IT. Built for teams.</p>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div className="w-9 h-9 bg-brand-600 rounded-xl flex items-center justify-center">
              <img src="/plant.svg" alt="" className="w-6 h-6" />
            </div>
            <span className="font-bold text-lg tracking-tight">PLAN-IT</span>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-1">
              {mode === 'login' ? 'Welcome back' : 'Create account'}
            </h2>
            <p className="text-white/40 text-sm">
              {mode === 'login' ? "Sign in to your workspace." : "Get started with your team."}
            </p>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 bg-surface-2 rounded-xl p-1 mb-6">
            {(['login', 'register'] as const).map(m => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                  mode === m ? 'bg-brand-600 text-white' : 'text-white/40 hover:text-white/60'
                }`}
              >
                {m === 'login' ? 'Sign In' : 'Register'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div>
                <label className="block text-sm text-white/60 mb-1.5">Full Name</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  placeholder="Jane Smith"
                  className="input"
                  required
                />
              </div>
            )}
            <div>
              <label className="block text-sm text-white/60 mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="input"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-white/60 mb-1.5">Password {mode === 'register' && <span className="text-red-400">*</span>}</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => {
                    setPassword(e.target.value)
                    if (mode === 'register') {
                      const error = validatePassword(e.target.value)
                      setPasswordError(error || '')
                    }
                  }}
                  placeholder="••••••••"
                  className={`input pr-10 ${mode === 'register' && passwordError ? 'border-red-400/50' : ''}`}
                  required
                  minLength={mode === 'register' ? 8 : 1}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {mode === 'register' && passwordError && (
                <p className="text-red-400 text-xs mt-1">{passwordError}</p>
              )}
              {mode === 'register' && !passwordError && password && (
                <p className="text-emerald-400 text-xs mt-1">✓ Password is strong</p>
              )}
              {mode === 'register' && (
                <p className="text-white/40 text-xs mt-2">
                  Password must: 8+ chars, uppercase, lowercase, number, special char (!@#$%^&*)
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full justify-center flex items-center gap-2 py-2.5 mt-2"
            >
              {loading && <Loader2 size={15} className="animate-spin" />}
              {mode === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </form>
        </div>
      </div>
      <ToastContainer />
    </div>
  )
}
