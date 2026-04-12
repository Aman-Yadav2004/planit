import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Calendar, MessageSquare, GripVertical } from 'lucide-react'
import { PriorityBadge } from '../ui/Badges'
import { Avatar } from '../ui/Avatar'
import type { Task } from '../../types/supabase'

interface TaskCardProps {
  task: Task
  onClick: (task: Task) => void
}

export function TaskCard({ task, onClick }: TaskCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: { type: 'task', task },
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'done'

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-surface-2 border border-white/5 rounded-xl p-3.5 cursor-pointer hover:border-white/10 transition-all group animate-fade-in"
      onClick={() => onClick(task)}
    >
      <div className="flex items-start justify-between gap-2 mb-2.5">
        <p className="text-sm text-white leading-snug flex-1">{task.title}</p>
        <button
          {...attributes}
          {...listeners}
          onClick={e => e.stopPropagation()}
          className="opacity-0 group-hover:opacity-100 text-white/20 hover:text-white/40 cursor-grab active:cursor-grabbing mt-0.5 flex-shrink-0"
        >
          <GripVertical size={14} />
        </button>
      </div>

      {task.description && (
        <p className="text-xs text-white/30 line-clamp-2 mb-2.5">{task.description}</p>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        <PriorityBadge priority={task.priority} />
      </div>

      <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/5">
        <div className="flex items-center gap-2">
          {task.due_date && (
            <div className={`flex items-center gap-1 text-xs ${isOverdue ? 'text-red-400' : 'text-white/30'}`}>
              <Calendar size={11} />
              {new Date(task.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </div>
          )}
          {task.comments && task.comments.length > 0 && (
            <div className="flex items-center gap-1 text-xs text-white/30">
              <MessageSquare size={11} />
              {task.comments.length}
            </div>
          )}
        </div>
        {task.assignee && (
          <Avatar name={(task.assignee as any).full_name || (task.assignee as any).email} size="xs" />
        )}
      </div>
    </div>
  )
}

export function TaskCardOverlay({ task }: { task: Task }) {
  return (
    <div className="bg-surface-2 border border-brand-500/30 rounded-xl p-3.5 shadow-2xl rotate-2 w-64">
      <p className="text-sm text-white">{task.title}</p>
    </div>
  )
}
