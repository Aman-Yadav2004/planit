import { useEffect, useRef, useState } from 'react'
import { Play, Pause, RotateCcw, Coffee, Brain, CheckCircle } from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { supabase } from '../lib/supabase'
import { toast } from '../components/ui/Toast'

type Mode = 'focus' | 'break' | 'long_break'

const MODES: Record<Mode, { label: string; duration: number; color: string; bg: string; icon: React.ReactNode }> = {
  focus:      { label: 'Focus',      duration: 25 * 60, color: 'text-brand-400',   bg: 'bg-brand-500',   icon: <Brain size={18} /> },
  break:      { label: 'Break',      duration: 5 * 60,  color: 'text-emerald-400', bg: 'bg-emerald-500', icon: <Coffee size={18} /> },
  long_break: { label: 'Long Break', duration: 15 * 60, color: 'text-violet-400',  bg: 'bg-violet-500',  icon: <Coffee size={18} /> },
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0')
  const s = (seconds % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

export function PomodoroPage() {
  const { user } = useAuthStore()
  const [mode, setMode] = useState<Mode>('focus')
  const [timeLeft, setTimeLeft] = useState(MODES.focus.duration)
  const [running, setRunning] = useState(false)
  const [sessions, setSessions] = useState<{ type: Mode; completed: boolean; created_at: string }[]>([])
  const [sessionCount, setSessionCount] = useState(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startRef = useRef<number>(0)

  useEffect(() => {
    if (user) fetchSessions()
  }, [user])

  const fetchSessions = async () => {
    const { data } = await supabase
      .from('pomodoro_sessions')
      .select('*')
      .eq('user_id', user!.id)
      .order('created_at', { ascending: false })
      .limit(20)
    setSessions((data || []) as any)
  }

  useEffect(() => {
    if (running) {
      startRef.current = Date.now()
      intervalRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            handleComplete()
            return 0
          }
          return prev - 1
        })
      }, 1000)
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [running])

  const handleComplete = async () => {
    setRunning(false)
    if (intervalRef.current) clearInterval(intervalRef.current)
    toast.success(mode === 'focus' ? '🎯 Focus session complete!' : '☕ Break time over!')
    
    if (user) {
      await supabase.from('pomodoro_sessions').insert({
        user_id: user.id,
        duration_minutes: MODES[mode].duration / 60,
        type: mode === 'focus' ? 'focus' : 'break',
        completed: true,
      })
      fetchSessions()
    }

    if (mode === 'focus') {
      const newCount = sessionCount + 1
      setSessionCount(newCount)
      if (newCount % 4 === 0) {
        switchMode('long_break')
      } else {
        switchMode('break')
      }
    } else {
      switchMode('focus')
    }
  }

  const switchMode = (newMode: Mode) => {
    setMode(newMode)
    setTimeLeft(MODES[newMode].duration)
    setRunning(false)
  }

  const handleReset = () => {
    setRunning(false)
    setTimeLeft(MODES[mode].duration)
  }

  const current = MODES[mode]
  const progress = 1 - timeLeft / MODES[mode].duration
  const circumference = 2 * Math.PI * 110
  const strokeDashoffset = circumference * (1 - progress)

  const todayFocus = sessions.filter(s => {
    const today = new Date().toDateString()
    return new Date(s.created_at).toDateString() === today && s.type === 'focus' && s.completed
  })

  return (
    <div className="p-6 max-w-3xl mx-auto animate-fade-in">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-white">Focus Timer</h1>
        <p className="text-white/40 text-sm mt-0.5">Stay productive with the Pomodoro technique</p>
      </div>

      <div className="grid lg:grid-cols-[1fr_280px] gap-6">
        {/* Timer */}
        <div className="card p-8 flex flex-col items-center">
          {/* Mode tabs */}
          <div className="flex gap-1 bg-surface-2 rounded-xl p-1 mb-8 self-stretch">
            {(Object.keys(MODES) as Mode[]).map(m => (
              <button
                key={m}
                onClick={() => switchMode(m)}
                className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1.5 ${
                  mode === m ? `${MODES[m].bg} text-white` : 'text-white/40 hover:text-white/60'
                }`}
              >
                {MODES[m].icon} {MODES[m].label}
              </button>
            ))}
          </div>

          {/* Circle */}
          <div className="relative mb-8">
            <svg width="260" height="260" className="-rotate-90">
              <circle cx="130" cy="130" r="110" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
              <circle
                cx="130" cy="130" r="110"
                fill="none"
                stroke={mode === 'focus' ? '#6366f1' : mode === 'break' ? '#10b981' : '#8b5cf6'}
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                className="transition-all duration-1000"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className={`text-5xl font-bold font-mono ${current.color}`}>
                {formatTime(timeLeft)}
              </div>
              <div className="text-white/40 text-sm mt-1">{current.label}</div>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-4">
            <button onClick={handleReset} className="w-12 h-12 rounded-full bg-surface-2 border border-white/10 flex items-center justify-center text-white/40 hover:text-white transition-colors">
              <RotateCcw size={18} />
            </button>
            <button
              onClick={() => setRunning(!running)}
              className={`w-16 h-16 rounded-full ${current.bg} flex items-center justify-center text-white shadow-lg transition-all active:scale-95 hover:brightness-110`}
            >
              {running ? <Pause size={24} /> : <Play size={24} className="ml-0.5" />}
            </button>
            <div className="w-12 h-12 flex items-center justify-center">
              <div className="text-center">
                <div className="text-lg font-bold text-white">{sessionCount}</div>
                <div className="text-xs text-white/30">done</div>
              </div>
            </div>
          </div>

          {/* Session dots */}
          <div className="flex gap-2 mt-6">
            {[1,2,3,4].map(i => (
              <div key={i} className={`w-2.5 h-2.5 rounded-full transition-all ${i <= (sessionCount % 4 || (sessionCount > 0 && sessionCount % 4 === 0 ? 4 : 0)) ? 'bg-brand-500' : 'bg-white/10'}`} />
            ))}
          </div>
          <p className="text-xs text-white/20 mt-2">Every 4 sessions = long break</p>
        </div>

        {/* Stats & History */}
        <div className="space-y-4">
          {/* Today's stats */}
          <div className="card p-5">
            <h2 className="text-sm font-semibold text-white mb-4">Today</h2>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-surface-2 rounded-xl p-3 text-center">
                <div className="text-2xl font-bold text-brand-400">{todayFocus.length}</div>
                <div className="text-xs text-white/30 mt-0.5">Sessions</div>
              </div>
              <div className="bg-surface-2 rounded-xl p-3 text-center">
                <div className="text-2xl font-bold text-emerald-400">{todayFocus.length * 25}</div>
                <div className="text-xs text-white/30 mt-0.5">Minutes</div>
              </div>
            </div>
          </div>

          {/* Recent sessions */}
          <div className="card p-5">
            <h2 className="text-sm font-semibold text-white mb-4">Recent Sessions</h2>
            <div className="space-y-2">
              {sessions.length === 0 && (
                <p className="text-white/30 text-xs text-center py-4">No sessions yet. Start focusing!</p>
              )}
              {sessions.slice(0, 8).map((session, i) => (
                <div key={i} className="flex items-center gap-3">
                  <CheckCircle size={14} className={session.type === 'focus' ? 'text-brand-400' : 'text-emerald-400'} />
                  <div className="flex-1">
                    <div className="text-xs text-white/60 capitalize">{session.type === 'focus' ? 'Focus' : 'Break'} — {session.type === 'focus' ? '25' : '5'} min</div>
                  </div>
                  <div className="text-xs text-white/20">
                    {new Date(session.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
