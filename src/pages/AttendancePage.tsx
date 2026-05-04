import { useMemo, useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'
import { Calendar, TrendingUp, Users, Clock, Loader2, CheckCircle2 } from 'lucide-react'
import { format, startOfMonth } from 'date-fns'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'
import { toast } from '../components/ui/Toast'
import type { Attendance } from '../types/supabase'

interface AttendanceRecord {
  id: string
  organization_id: string
  user_id: string
  date: string
  started_at: string
  duration_minutes: number
  created_at: string
  status: 'present' | 'absent' | 'late' | 'half-day'
}

export function AttendancePage() {
  const { user, organization } = useAuthStore()
  const [attendanceData, setAttendanceData] = useState<AttendanceRecord[]>([])
  const [todayAttendance, setTodayAttendance] = useState<Attendance | null>(null)
  const [markingAttendance, setMarkingAttendance] = useState(false)
  const [loading, setLoading] = useState(true)
  const [timerRemaining, setTimerRemaining] = useState(0)

  const currentDate = new Date()
  const currentMonth = startOfMonth(currentDate)

  useEffect(() => {
    if (!organization || !user) return
    fetchTodayAttendance()
    fetchAttendanceData()
  }, [organization?.id, user?.id])

  useEffect(() => {
    if (!todayAttendance) {
      setTimerRemaining(0)
      return
    }

    const updateTimer = () => {
      const start = new Date(todayAttendance.started_at).getTime()
      const end = start + (todayAttendance.duration_minutes || 480) * 60 * 1000
      setTimerRemaining(Math.max(0, end - Date.now()))
    }

    updateTimer()
    const intervalId = setInterval(updateTimer, 1000)
    return () => clearInterval(intervalId)
  }, [todayAttendance?.id])

  const fetchTodayAttendance = async () => {
    if (!organization || !user) return

    const today = new Date().toISOString().slice(0, 10)
    const { data } = await supabase
      .from('attendances')
      .select('*')
      .eq('organization_id', organization.id)
      .eq('user_id', user.id)
      .eq('date', today)
      .maybeSingle()

    setTodayAttendance((data as Attendance | null) || null)
  }

  const fetchAttendanceData = async () => {
    if (!organization || !user) return
    try {
      setLoading(true)
      const startDate = format(currentMonth, 'yyyy-MM-01')
      const endDate = format(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0), 'yyyy-MM-dd')

      const { data, error } = await supabase
        .from('attendances')
        .select('*')
        .eq('organization_id', organization.id)
        .eq('user_id', user.id)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: false })

      if (error) {
        throw error
      }

      if (data) {
        const records: AttendanceRecord[] = data.map(item => ({
          ...item,
          status: 'present' as const,
        }))
        setAttendanceData(records)
      } else {
        setAttendanceData([])
      }
    } catch (err) {
      console.error('Failed to fetch attendance', err)
      setAttendanceData([])
    } finally {
      setLoading(false)
    }
  }

  const formatDuration = (ms: number) => {
    if (ms <= 0) return '0:00:00'
    const totalSeconds = Math.floor(ms / 1000)
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  }

  const markAttendance = async () => {
    if (!organization || !user || todayAttendance) return

    setMarkingAttendance(true)
    try {
      const today = new Date().toISOString().slice(0, 10)
      const { data, error } = await supabase
        .from('attendances')
        .insert({
          user_id: user.id,
          organization_id: organization.id,
          date: today,
          started_at: new Date().toISOString(),
          duration_minutes: 480,
        })
        .select('*')
        .single()

      if (error) throw error

      setTodayAttendance(data as Attendance)
      await fetchAttendanceData()
      toast.success('Attendance recorded')
    } catch (err: any) {
      console.error('Failed to mark attendance', err)
      toast.error(err?.message || 'Failed to mark attendance')
    } finally {
      setMarkingAttendance(false)
    }
  }

  const stats = useMemo(() => {
    const statusCounts = {
      present: 0,
      absent: 0,
      late: 0,
      'half-day': 0,
    }

    attendanceData.forEach(record => {
      statusCounts[record.status]++
    })

    return statusCounts
  }, [attendanceData])

  const chartData = [
    { name: 'Present', value: stats.present, color: '#10b981' },
    { name: 'Late', value: stats.late, color: '#f59e0b' },
    { name: 'Half-day', value: stats['half-day'], color: '#8b5cf6' },
    { name: 'Absent', value: stats.absent, color: '#ef4444' },
  ].filter(item => item.value > 0)

  const totalDays = attendanceData.length
  const attendancePercentage = totalDays > 0 ? ((stats.present / totalDays) * 100).toFixed(1) : 0

  return (
    <div className="flex-1 overflow-auto">
      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Attendance Register</h1>
          <p className="text-white/60">Track and monitor your attendance</p>
        </div>

        <div className="bg-surface-1 border border-white/5 rounded-xl p-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2 text-white font-semibold">
              <CheckCircle2 size={18} className={todayAttendance ? 'text-green-400' : 'text-white/30'} />
              {todayAttendance ? 'Checked in today' : 'No attendance marked today'}
            </div>
            <p className="text-white/50 text-sm mt-1">
              {todayAttendance ? 'Your 8-hour timer is running.' : 'Use the button to record your attendance for today.'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {todayAttendance && (
              <div className="text-right pr-2">
                <div className="text-xs text-white/40">Time left</div>
                <div className="text-lg font-medium text-white">{formatDuration(timerRemaining)}</div>
              </div>
            )}
            <button
              onClick={markAttendance}
              disabled={markingAttendance || !!todayAttendance}
              className="btn-primary inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {markingAttendance ? <Loader2 size={14} className="animate-spin" /> : <Clock size={14} />}
              {todayAttendance ? 'Attendance Saved' : 'Mark Attendance'}
            </button>
            <Link to="/" className="btn-ghost">Back to Home</Link>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-surface-1 border border-white/5 rounded-xl p-6 hover:border-white/10 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/60 text-sm mb-1">Total Days</p>
                <p className="text-3xl font-bold text-white">{totalDays}</p>
              </div>
              <Calendar className="text-white/30" size={32} />
            </div>
          </div>

          <div className="bg-surface-1 border border-white/5 rounded-xl p-6 hover:border-white/10 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/60 text-sm mb-1">Present</p>
                <p className="text-3xl font-bold text-green-400">{stats.present}</p>
              </div>
              <div className="w-12 h-12 bg-green-500/10 rounded-lg flex items-center justify-center">
                <TrendingUp className="text-green-400" size={24} />
              </div>
            </div>
          </div>

          <div className="bg-surface-1 border border-white/5 rounded-xl p-6 hover:border-white/10 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/60 text-sm mb-1">Attendance %</p>
                <p className="text-3xl font-bold text-brand-400">{attendancePercentage}%</p>
              </div>
              <div className="w-12 h-12 bg-brand-500/10 rounded-lg flex items-center justify-center">
                <span className="text-brand-400 font-bold">%</span>
              </div>
            </div>
          </div>

          <div className="bg-surface-1 border border-white/5 rounded-xl p-6 hover:border-white/10 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/60 text-sm mb-1">Absent</p>
                <p className="text-3xl font-bold text-red-400">{stats.absent}</p>
              </div>
              <div className="w-12 h-12 bg-red-500/10 rounded-lg flex items-center justify-center">
                <Users className="text-red-400" size={24} />
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-surface-1 border border-white/5 rounded-xl p-6">
            <h2 className="text-xl font-bold text-white mb-6">Attendance Breakdown</h2>
            {chartData.length > 0 ? (
              <div className="flex justify-center items-center h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={(props: any) => `${props.name}: ${props.value}`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                      animationDuration={800}
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '8px',
                      }}
                      labelStyle={{ color: '#fff' }}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-80 flex items-center justify-center text-white/40">
                {loading ? 'Loading attendance...' : 'No attendance data available'}
              </div>
            )}
          </div>

          <div className="bg-surface-1 border border-white/5 rounded-xl p-6">
            <h2 className="text-xl font-bold text-white mb-6">Summary</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between py-3 border-b border-white/5">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-white/80">Present</span>
                </div>
                <span className="font-bold text-white">{stats.present}</span>
              </div>
              <div className="flex items-center justify-between py-3 border-b border-white/5">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-amber-500 rounded-full"></div>
                  <span className="text-white/80">Late</span>
                </div>
                <span className="font-bold text-white">{stats.late}</span>
              </div>
              <div className="flex items-center justify-between py-3 border-b border-white/5">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                  <span className="text-white/80">Half-day</span>
                </div>
                <span className="font-bold text-white">{stats['half-day']}</span>
              </div>
              <div className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <span className="text-white/80">Absent</span>
                </div>
                <span className="font-bold text-white">{stats.absent}</span>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-white/5">
              <p className="text-white/60 text-sm mb-2">Report Period</p>
              <p className="text-white font-medium">
                {format(currentMonth, 'MMMM yyyy')}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-surface-1 border border-white/5 rounded-xl p-6">
          <h2 className="text-xl font-bold text-white mb-6">Attendance Calendar</h2>
          {attendanceData.length === 0 && !loading ? (
            <div className="rounded-xl border border-dashed border-white/10 px-4 py-8 text-center text-white/40">
              No attendance marked for this month yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/5">
                    <th className="text-left px-4 py-3 text-white/60 text-sm font-medium">Date</th>
                    <th className="text-left px-4 py-3 text-white/60 text-sm font-medium">Day</th>
                    <th className="text-left px-4 py-3 text-white/60 text-sm font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {attendanceData.slice(-15).reverse().map((record, idx) => {
                    const date = new Date(record.date)
                    const day = format(date, 'EEEE')
                    const statusColor = {
                      present: 'text-green-400 bg-green-500/10',
                      absent: 'text-red-400 bg-red-500/10',
                      late: 'text-amber-400 bg-amber-500/10',
                      'half-day': 'text-purple-400 bg-purple-500/10',
                    }[record.status]

                    return (
                      <tr key={idx} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                        <td className="px-4 py-3 text-white">{format(date, 'MMM dd, yyyy')}</td>
                        <td className="px-4 py-3 text-white/60">{day}</td>
                        <td className="px-4 py-3">
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColor} capitalize`}>
                            {record.status}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
