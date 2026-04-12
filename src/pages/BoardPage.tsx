import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  DndContext, DragOverlay, closestCorners, PointerSensor, useSensor, useSensors,
  type DragStartEvent, type DragEndEvent
} from '@dnd-kit/core'
import { Plus, ArrowLeft, Loader2 } from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { useProjectsStore } from '../store/projectsStore'
import { BoardColumn } from '../components/tasks/BoardColumn'
import { TaskCardOverlay } from '../components/tasks/TaskCard'
import { TaskDetail } from '../components/tasks/TaskDetail'
import { Modal } from '../components/ui/Modal'
import { toast } from '../components/ui/Toast'
import type { Task } from '../types/supabase'

const DEFAULT_BOARDS = ['To Do', 'In Progress', 'Review', 'Done']

function CreateTaskForm({ boardId, boards, onSave }: {
  boardId: string
  boards: { id: string; name: string }[]
  onSave: (data: Partial<Task>) => void
}) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<Task['priority']>('medium')
  const [dueDate, setDueDate] = useState('')
  const [selectedBoardId, setSelectedBoardId] = useState(boardId)

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs text-white/40 mb-1.5">Title *</label>
        <input value={title} onChange={e => setTitle(e.target.value)} className="input" placeholder="Task title" autoFocus />
      </div>
      <div>
        <label className="block text-xs text-white/40 mb-1.5">Description</label>
        <textarea value={description} onChange={e => setDescription(e.target.value)} className="input min-h-[70px] resize-none" placeholder="Optional description..." />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-white/40 mb-1.5">Priority</label>
          <select value={priority} onChange={e => setPriority(e.target.value as Task['priority'])} className="input">
            {['low','medium','high','urgent'].map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase()+p.slice(1)}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-white/40 mb-1.5">Due Date</label>
          <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="input" />
        </div>
        <div className="col-span-2">
          <label className="block text-xs text-white/40 mb-1.5">Column</label>
          <select value={selectedBoardId} onChange={e => setSelectedBoardId(e.target.value)} className="input">
            {boards.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
      </div>
      <div className="flex justify-end">
        <button
          onClick={() => onSave({ title, description, priority, due_date: dueDate || undefined, board_id: selectedBoardId })}
          disabled={!title.trim()}
          className="btn-primary"
        >
          Create Task
        </button>
      </div>
    </div>
  )
}

export function BoardPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const { user } = useAuthStore()
  const { projects, boards, loading, fetchBoards, createBoard, updateBoard, deleteBoard, createTask, moveTask } = useProjectsStore()
  const [activeTask, setActiveTask] = useState<Task | null>(null)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [addingTask, setAddingTask] = useState<{ boardId: string } | null>(null)
  const [addingBoard, setAddingBoard] = useState(false)
  const [newBoardName, setNewBoardName] = useState('')

  const project = projects.find(p => p.id === projectId)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  useEffect(() => {
    if (!projectId) return
    fetchBoards(projectId).then(async () => {
      // Create default boards if none exist
      const { useProjectsStore: store } = await import('../store/projectsStore')
      const currentBoards = store.getState().boards
      if (currentBoards.length === 0) {
        for (let i = 0; i < DEFAULT_BOARDS.length; i++) {
          await store.getState().createBoard({ project_id: projectId!, name: DEFAULT_BOARDS[i], position: i })
        }
      }
    })
  }, [projectId])

  const handleDragStart = (event: DragStartEvent) => {
    if (event.active.data.current?.type === 'task') {
      setActiveTask(event.active.data.current.task)
    }
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveTask(null)
    const { active, over } = event
    if (!over) return

    const activeData = active.data.current
    if (activeData?.type !== 'task') return

    const task: Task = activeData.task
    let targetBoardId: string | null = null

    // Dropped over a board container
    if (over.data.current?.type === 'board') {
      targetBoardId = over.data.current.boardId
    } else if (over.data.current?.type === 'task') {
      // Dropped over another task - use that task's board
      const overTask: Task = over.data.current.task
      targetBoardId = overTask.board_id
    }

    if (targetBoardId && targetBoardId !== task.board_id) {
      const targetBoard = boards.find(b => b.id === targetBoardId)
      const newPos = (targetBoard?.tasks?.length || 0)
      await moveTask(task.id, targetBoardId, newPos)
    }
  }

  const handleCreateTask = async (data: Partial<Task>) => {
    if (!user || !projectId || !addingTask) return
    const board = boards.find(b => b.id === (data.board_id || addingTask.boardId))
    const position = board?.tasks?.length || 0
    const task = await createTask({
      board_id: data.board_id || addingTask.boardId,
      project_id: projectId,
      title: data.title || '',
      description: data.description || null,
      priority: data.priority || 'medium',
      status: 'todo',
      assignee_id: null,
      due_date: data.due_date || null,
      position,
      created_by: user.id,
    })
    if (task) { toast.success('Task created!'); setAddingTask(null) }
    else toast.error('Failed to create task')
  }

  const handleAddBoard = async () => {
    if (!projectId || !newBoardName.trim()) return
    await createBoard({ project_id: projectId, name: newBoardName, position: boards.length })
    setNewBoardName('')
    setAddingBoard(false)
  }

  const handleDeleteBoard = async (boardId: string) => {
    if (!confirm('Delete this column? Tasks inside will also be deleted.')) return
    await deleteBoard(boardId)
    toast.success('Column deleted')
  }

  const handleUpdateBoard = async (boardId: string, name: string) => {
    await updateBoard(boardId, { name })
    toast.success('Column renamed')
  }

  // Update selectedTask when boards change
  useEffect(() => {
    if (selectedTask) {
      for (const board of boards) {
        const found = board.tasks?.find(t => t.id === selectedTask.id)
        if (found) { setSelectedTask(found); break }
      }
    }
  }, [boards])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="animate-spin text-white/30" size={24} />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-4 px-6 py-4 border-b border-white/5 flex-shrink-0">
        <Link to="/projects" className="btn-ghost p-2">
          <ArrowLeft size={16} />
        </Link>
        <div className="flex items-center gap-2 flex-1">
          {project && <div className="w-3 h-3 rounded-full" style={{ backgroundColor: project.color }} />}
          <h1 className="font-bold text-white">{project?.name || 'Board'}</h1>
        </div>
        <button onClick={() => setAddingTask({ boardId: boards[0]?.id || '' })} className="btn-primary flex items-center gap-2">
          <Plus size={15} /> Add Task
        </button>
      </div>

      {/* Board */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden">
        <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div className="flex gap-4 p-6 h-full items-start">
            {boards.map(board => (
              <BoardColumn
                key={board.id}
                board={board}
                onAddTask={(boardId) => setAddingTask({ boardId })}
                onTaskClick={setSelectedTask}
                onDeleteBoard={handleDeleteBoard}
                onUpdateBoard={handleUpdateBoard}
              />
            ))}

            {/* Add column */}
            <div className="flex-shrink-0 w-72">
              {addingBoard ? (
                <div className="bg-surface-1 border border-white/10 rounded-2xl p-4 space-y-2">
                  <input
                    value={newBoardName}
                    onChange={e => setNewBoardName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleAddBoard(); if (e.key === 'Escape') setAddingBoard(false) }}
                    placeholder="Column name"
                    className="input"
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <button onClick={handleAddBoard} className="btn-primary text-xs py-1.5">Add</button>
                    <button onClick={() => setAddingBoard(false)} className="btn-ghost text-xs py-1.5">Cancel</button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setAddingBoard(true)}
                  className="flex items-center gap-2 w-full px-4 py-3 text-white/30 hover:text-white/60 border-2 border-dashed border-white/10 hover:border-white/20 rounded-2xl transition-colors text-sm"
                >
                  <Plus size={15} /> Add column
                </button>
              )}
            </div>
          </div>

          <DragOverlay>
            {activeTask && <TaskCardOverlay task={activeTask} />}
          </DragOverlay>
        </DndContext>
      </div>

      {/* Task detail */}
      <TaskDetail
        task={selectedTask}
        onClose={() => setSelectedTask(null)}
        boards={boards.map(b => ({ id: b.id, name: b.name }))}
      />

      {/* Create task modal */}
      <Modal open={!!addingTask} onClose={() => setAddingTask(null)} title="Create Task">
        {addingTask && (
          <CreateTaskForm
            boardId={addingTask.boardId}
            boards={boards.map(b => ({ id: b.id, name: b.name }))}
            onSave={handleCreateTask}
          />
        )}
      </Modal>
    </div>
  )
}
