import { useState } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { Plus, MoreHorizontal, Trash2, Edit3, X, Check } from 'lucide-react'
import { TaskCard } from './TaskCard'
import type { Board, Task } from '../../types/supabase'

interface BoardColumnProps {
  board: Board
  onAddTask: (boardId: string) => void
  onTaskClick: (task: Task) => void
  onDeleteBoard: (boardId: string) => void
  onUpdateBoard: (boardId: string, name: string) => void
}

export function BoardColumn({ board, onAddTask, onTaskClick, onDeleteBoard, onUpdateBoard }: BoardColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: board.id, data: { type: 'board', boardId: board.id } })
  const [menuOpen, setMenuOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(board.name)
  const tasks = board.tasks || []

  const handleSaveName = () => {
    if (name.trim()) onUpdateBoard(board.id, name)
    setEditing(false)
  }

  return (
    <div className={`flex flex-col rounded-2xl bg-surface-1 border transition-colors flex-shrink-0 w-72 ${isOver ? 'border-brand-500/30 bg-brand-500/5' : 'border-white/5'}`}>
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5">
        <span className="w-2 h-2 rounded-full bg-brand-500/60 flex-shrink-0" />
        {editing ? (
          <div className="flex items-center gap-1 flex-1">
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSaveName(); if (e.key === 'Escape') setEditing(false) }}
              className="input py-0.5 text-sm h-7"
              autoFocus
            />
            <button onClick={handleSaveName} className="p-1 text-emerald-400 hover:text-emerald-300"><Check size={14} /></button>
            <button onClick={() => setEditing(false)} className="p-1 text-white/40 hover:text-white/60"><X size={14} /></button>
          </div>
        ) : (
          <span className="font-medium text-white text-sm flex-1 truncate">{board.name}</span>
        )}
        <span className="text-xs text-white/30 bg-surface-3 rounded-md px-1.5 py-0.5 flex-shrink-0">{tasks.length}</span>
        <div className="relative flex-shrink-0">
          <button onClick={() => setMenuOpen(!menuOpen)} className="btn-ghost p-1">
            <MoreHorizontal size={14} />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-8 bg-surface-3 border border-white/10 rounded-xl shadow-xl z-10 py-1 min-w-[130px]">
              <button onClick={() => { setEditing(true); setMenuOpen(false) }} className="flex items-center gap-2 w-full px-3 py-2 text-sm text-white/60 hover:text-white hover:bg-white/5">
                <Edit3 size={13} /> Rename
              </button>
              <button onClick={() => { onDeleteBoard(board.id); setMenuOpen(false) }} className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-400 hover:bg-red-500/10">
                <Trash2 size={13} /> Delete
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Tasks */}
      <div ref={setNodeRef} className="flex-1 p-3 space-y-2 min-h-[100px] overflow-y-auto max-h-[calc(100vh-280px)]">
        <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map(task => (
            <TaskCard key={task.id} task={task} onClick={onTaskClick} />
          ))}
        </SortableContext>
      </div>
    </div>
  )
}
