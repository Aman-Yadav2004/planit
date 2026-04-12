import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, Plus, X } from 'lucide-react'
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  addDays, isSameMonth, isToday, isSameDay, addMonths, subMonths
} from 'date-fns'
import { useAuthStore } from '../store/authStore'
import { supabase } from '../lib/supabase'
import { Modal } from '../components/ui/Modal'
import { toast } from '../components/ui/Toast'
import type { CalendarEvent, Database } from '../types/supabase'

type EventInsert = Database['public']['Tables']['events']['Insert']

const EVENT_COLORS: Record<string, string> = {
  event: 'bg-brand-500/20 text-brand-300 border-brand-500/30',
  task: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  followup: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
}

function EventForm({ date, onSave }: { date: Date; onSave: (data: Pick<EventInsert, 'title' | 'description' | 'start_date' | 'type'>) => void }) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [startDate, setStartDate] = useState(format(date, 'yyyy-MM-dd'))
  const [type, setType] = useState<CalendarEvent['type']>('event')

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs text-white/40 mb-1.5">Title *</label>
        <input value={title} onChange={e => setTitle(e.target.value)} className="input" placeholder="Event title" autoFocus />
      </div>
      <div>
        <label className="block text-xs text-white/40 mb-1.5">Description</label>
        <textarea value={description} onChange={e => setDescription(e.target.value)} className="input min-h-[60px] resize-none" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-white/40 mb-1.5">Date</label>
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="input" />
        </div>
        <div>
          <label className="block text-xs text-white/40 mb-1.5">Type</label>
          <select value={type} onChange={e => setType(e.target.value as CalendarEvent['type'])} className="input">
            <option value="event">Event</option>
            <option value="task">Task</option>
            <option value="followup">Follow-up</option>
          </select>
        </div>
      </div>
      <div className="flex justify-end">
        <button onClick={() => onSave({ title, description, start_date: startDate, type })} disabled={!title.trim()} className="btn-primary">
          Add Event
        </button>
      </div>
    </div>
  )
}

export function CalendarPage() {
  const { user, organization } = useAuthStore()
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [clickedDate, setClickedDate] = useState<Date>(new Date())

  useEffect(() => {
    if (organization) fetchEvents()
  }, [organization?.id, currentMonth])

  const fetchEvents = async () => {
    if (!organization) return
    const start = format(startOfMonth(currentMonth), 'yyyy-MM-dd')
    const end = format(endOfMonth(currentMonth), 'yyyy-MM-dd')
    const { data } = await supabase
      .from('events')
      .select('*')
      .eq('organization_id', organization.id)
      .gte('start_date', start)
      .lte('start_date', end)
    setEvents(data || [])
  }

  const handleCreateEvent = async (data: Pick<EventInsert, 'title' | 'description' | 'start_date' | 'type'>) => {
    if (!user || !organization) return
    const { data: event, error } = await supabase
      .from('events')
      .insert({ ...data, organization_id: organization.id, created_by: user.id })
      .select()
      .single()
    if (!error && event) {
      setEvents(prev => [...prev, event])
      toast.success('Event created!')
      setShowCreateModal(false)
    } else {
      toast.error('Failed to create event')
    }
  }

  const handleDeleteEvent = async (id: string) => {
    await supabase.from('events').delete().eq('id', id)
    setEvents(prev => prev.filter(e => e.id !== id))
    setSelectedEvent(null)
    toast.success('Event deleted')
  }

  // Build calendar days
  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const calStart = startOfWeek(monthStart, { weekStartsOn: 0 })
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 0 })

  const days: Date[] = []
  let day = calStart
  while (day <= calEnd) {
    days.push(day)
    day = addDays(day, 1)
  }

  const getEventsForDay = (d: Date) => events.filter(e => isSameDay(new Date(e.start_date), d))

  return (
    <div className="p-6 max-w-6xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold text-white">Calendar</h1>
          <div className="flex items-center gap-1">
            <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="btn-ghost p-2">
              <ChevronLeft size={16} />
            </button>
            <span className="text-white font-medium min-w-[150px] text-center">
              {format(currentMonth, 'MMMM yyyy')}
            </span>
            <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="btn-ghost p-2">
              <ChevronRight size={16} />
            </button>
          </div>
          <button onClick={() => setCurrentMonth(new Date())} className="btn-ghost text-xs">Today</button>
        </div>
        <button onClick={() => { setClickedDate(new Date()); setShowCreateModal(true) }} className="btn-primary flex items-center gap-2">
          <Plus size={15} /> Add Event
        </button>
      </div>

      {/* Calendar grid */}
      <div className="card overflow-hidden">
        {/* Day headers */}
        <div className="grid grid-cols-7 border-b border-white/5">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
            <div key={d} className="px-3 py-3 text-center text-xs font-medium text-white/30 uppercase tracking-wider">
              {d}
            </div>
          ))}
        </div>

        {/* Days */}
        <div className="grid grid-cols-7">
          {days.map((d, i) => {
            const dayEvents = getEventsForDay(d)
            const isCurrentMonth = isSameMonth(d, currentMonth)
            const isSelected = selectedDate && isSameDay(d, selectedDate)
            const isTodayDate = isToday(d)

            return (
              <div
                key={i}
                onClick={() => { setClickedDate(d); setSelectedDate(d === selectedDate ? null : d) }}
                className={`min-h-[100px] p-2 border-b border-r border-white/5 cursor-pointer transition-colors hover:bg-white/2 ${
                  !isCurrentMonth ? 'opacity-30' : ''
                } ${isSelected ? 'bg-brand-500/5' : ''}`}
              >
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm mb-1 ${
                  isTodayDate ? 'bg-brand-600 text-white font-semibold' : 'text-white/70'
                }`}>
                  {format(d, 'd')}
                </div>
                <div className="space-y-0.5">
                  {dayEvents.slice(0, 3).map(event => (
                    <div
                      key={event.id}
                      onClick={e => { e.stopPropagation(); setSelectedEvent(event) }}
                      className={`text-xs px-1.5 py-0.5 rounded border truncate cursor-pointer ${EVENT_COLORS[event.type]}`}
                    >
                      {event.title}
                    </div>
                  ))}
                  {dayEvents.length > 3 && (
                    <div className="text-xs text-white/30 px-1">+{dayEvents.length - 3} more</div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Event detail modal */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setSelectedEvent(null)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative bg-surface-1 border border-white/10 rounded-2xl p-6 max-w-sm w-full shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <span className={`badge ${EVENT_COLORS[selectedEvent.type]} mb-2`}>{selectedEvent.type}</span>
                <h3 className="font-semibold text-white text-lg">{selectedEvent.title}</h3>
              </div>
              <button onClick={() => setSelectedEvent(null)} className="btn-ghost p-1.5"><X size={15} /></button>
            </div>
            {selectedEvent.description && <p className="text-white/50 text-sm mb-4">{selectedEvent.description}</p>}
            <p className="text-white/30 text-sm mb-4">{format(new Date(selectedEvent.start_date), 'MMMM d, yyyy')}</p>
            <button
              onClick={() => handleDeleteEvent(selectedEvent.id)}
              className="text-red-400 hover:text-red-300 text-sm flex items-center gap-1"
            >
              Delete event
            </button>
          </div>
        </div>
      )}

      <Modal open={showCreateModal} onClose={() => setShowCreateModal(false)} title="Add Event">
        <EventForm date={clickedDate} onSave={handleCreateEvent} />
      </Modal>
    </div>
  )
}
