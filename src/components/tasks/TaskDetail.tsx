import { useState, useEffect } from 'react'
import { Calendar, User, Flag, Trash2, Edit3, Send, Loader2 } from 'lucide-react'
import { AssigneePicker, type AssigneeOption } from './AssigneePicker'
import { useAuthStore } from '../../store/authStore'
import { useProjectsStore } from '../../store/projectsStore'
import { supabase } from '../../lib/supabase'
import { Modal } from '../ui/Modal'
import { PriorityBadge } from '../ui/Badges'
import { Avatar } from '../ui/Avatar'
import { toast } from '../ui/Toast'
import type { Task, Comment, Profile } from '../../types/supabase'

interface TaskDetailProps {
  task: Task | null
  onClose: () => void
  boards: { id: string; name: string }[]
}

const getTodayDateString = () => new Date().toISOString().split('T')[0]
const isPastDueDate = (value: string) => {
  const selectedDate = new Date(value)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  selectedDate.setHours(0, 0, 0, 0)
  return selectedDate < today
}

export function TaskDetail({ task, onClose, boards }: TaskDetailProps) {
  const { user } = useAuthStore()
  const { updateTask, deleteTask } = useProjectsStore()
  const [editing, setEditing] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<Task['priority']>('medium')
  const [dueDate, setDueDate] = useState('')
  const [boardId, setBoardId] = useState('')
  const [comments, setComments] = useState<Comment[]>([])
  const [commentText, setCommentText] = useState('')
  const [loadingComments, setLoadingComments] = useState(false)
  const [submittingComment, setSubmittingComment] = useState(false)
  const [assigneeOptions, setAssigneeOptions] = useState<AssigneeOption[]>([])
  const [assigneeId, setAssigneeId] = useState<string | null>(null)
  const [dueDateError, setDueDateError] = useState('')

  useEffect(() => {
    if (task) {
      setTitle(task.title)
      setDescription(task.description || '')
      setPriority(task.priority)
      setDueDate(task.due_date ? task.due_date.split('T')[0] : '')
      setBoardId(task.board_id)
      setAssigneeId(task.assignee_id)
      setDueDateError('')
      loadComments(task.id)
      loadAssigneeOptions(task.project_id)
    }
  }, [task?.id])

  const loadComments = async (taskId: string) => {
    setLoadingComments(true)
    const { data } = await supabase
      .from('comments')
      .select('*, user:profiles!comments_user_id_fkey(*)')
      .eq('task_id', taskId)
      .order('created_at', { ascending: true })
    setComments((data || []) as any)
    setLoadingComments(false)
  }

  const loadAssigneeOptions = async (projectId: string) => {
    const { data: project } = await supabase.from('projects').select('organization_id').eq('id', projectId).single()
    if (!project) return

    // find current user's role in this project/org
    try {
      let membership: any = null
      if (user?.id) {
        const res = await supabase
          .from('memberships')
          .select('role')
          .eq('organization_id', project.organization_id)
          .eq('user_id', user.id)
          .maybeSingle()
        membership = res.data
      }

      setIsAdmin(membership?.role === 'admin')
    } catch (e) {
      setIsAdmin(false)
    }

    const [membersResult, invitationsResult] = await Promise.all([
      supabase
        .from('memberships')
        .select('id, user_id, role, profile:user_id(*)')
        .eq('organization_id', project.organization_id),
      supabase
        .from('invitations')
        .select('id, email, role, accepted')
        .eq('organization_id', project.organization_id)
        .eq('accepted', false),
    ])

    const memberOptions: AssigneeOption[] = (membersResult.data || [])
      .map((membership: any) => {
        const profile = Array.isArray(membership.profile) ? membership.profile[0] : membership.profile
        if (!profile?.id) return null

        return {
          id: membership.id,
          value: profile.id,
          label: profile.full_name || profile.email,
          secondary: `${profile.email} • ${membership.role}`,
          status: 'member',
        } satisfies AssigneeOption
      })
      .filter(Boolean) as AssigneeOption[]

    const invitationOptions: AssigneeOption[] = (invitationsResult.data || []).map((invite: any) => ({
      id: invite.id,
      value: `invite:${invite.id}`,
      label: invite.email,
      secondary: `Invited • ${invite.role}`,
      status: 'invited',
      disabled: true,
    }))

    setAssigneeOptions([...memberOptions, ...invitationOptions])
  }

  const handleDueDateChange = (value: string) => {
    if (!value) {
      setDueDate('')
      setDueDateError('')
      return
    }

    if (isPastDueDate(value)) {
      setDueDateError('Cannot set deadline to a past date')
      return
    }

    setDueDate(value)
    setDueDateError('')
  }

  const handleSave = async () => {
    if (!task) return
    const canEditOrDelete = !!user && (user.id === task.assignee_id || isAdmin)
    if (!canEditOrDelete) {
      toast.error('Not authorized to edit this task')
      return
    }
    if (dueDate && isPastDueDate(dueDate)) {
      setDueDateError('Cannot set deadline to a past date')
      toast.error('Cannot set deadline to a past date')
      return
    }
    await updateTask(task.id, {
      title, description, priority,
      due_date: dueDate || null,
      board_id: boardId,
      assignee_id: assigneeId,
    })
    toast.success('Task updated')
    setEditing(false)
  }

  const handleDelete = async () => {
    if (!task || !confirm('Delete this task?')) return
    const canEditOrDelete = !!user && (user.id === task.assignee_id || isAdmin)
    if (!canEditOrDelete) {
      toast.error('Not authorized to delete this task')
      return
    }
    await deleteTask(task.id)
    toast.success('Task deleted')
    onClose()
  }

  const handleAddComment = async () => {
    if (!task || !user || !commentText.trim()) return
    setSubmittingComment(true)
    const { data, error } = await supabase
      .from('comments')
      .insert({ task_id: task.id, user_id: user.id, content: commentText })
      .select('*, user:profiles!comments_user_id_fkey(*)')
      .single()
    if (!error && data) {
      setComments(prev => [...prev, data as any])
      setCommentText('')
    }
    setSubmittingComment(false)
  }

  if (!task) return null

  return (
    <Modal open={!!task} onClose={onClose} size="lg" title={editing ? 'Edit Task' : task.title}>
      <div className="space-y-5">
        {editing ? (
          <div className="space-y-4">
            <div>
              <label className="block text-xs text-white/40 mb-1">Title</label>
              <input value={title} maxLength={100} onChange={e => setTitle(e.target.value.slice(0,100))} className="input" />
            </div>
            <div>
              <label className="block text-xs text-white/40 mb-1">Description</label>
              <textarea value={description} maxLength={500} onChange={e => setDescription(e.target.value.slice(0,500))} className="input min-h-[80px] resize-none" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-white/40 mb-1">Priority</label>
                <select value={priority} onChange={e => setPriority(e.target.value as Task['priority'])} className="input">
                  {['low','medium','high','urgent'].map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase()+p.slice(1)}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-white/40 mb-1">Due Date</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={e => handleDueDateChange(e.target.value)}
                  min={getTodayDateString()}
                  className="input"
                />
                {dueDateError && <p className="text-red-400 text-xs mt-1">{dueDateError}</p>}
              </div>
              <div>
                <label className="block text-xs text-white/40 mb-1">Column</label>
                <select value={boardId} onChange={e => setBoardId(e.target.value)} className="input">
                  {boards.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-white/40 mb-1">Assignee</label>
                <AssigneePicker
                  options={assigneeOptions}
                  selectedValue={assigneeId}
                  onChange={setAssigneeId}
                />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setEditing(false)} className="btn-ghost">Cancel</button>
              <button onClick={handleSave} className="btn-primary">Save</button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {task.description && <p className="text-white/60 text-sm leading-relaxed">{task.description}</p>}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-2 text-sm text-white/50">
                <Flag size={14} className="text-white/30" /> <PriorityBadge priority={task.priority} />
              </div>
              {task.due_date && (
                <div className="flex items-center gap-2 text-sm text-white/50">
                  <Calendar size={14} className="text-white/30" />
                  {new Date(task.due_date).toLocaleDateString()}
                </div>
              )}
              {task.assignee && (
                <div className="flex items-center gap-2 text-sm text-white/50 col-span-2">
                  <User size={14} className="text-white/30" />
                  <Avatar name={(task.assignee as any).full_name} size="xs" />
                  <span>{(task.assignee as any).full_name || (task.assignee as any).email}</span>
                </div>
              )}
            </div>
              <div className="flex gap-2">
              {((user && user.id === task.assignee_id) || isAdmin) && (
                <>
                  <button onClick={() => setEditing(true)} className="btn-ghost flex items-center gap-1.5 text-xs">
                    <Edit3 size={13} /> Edit
                  </button>
                  <button onClick={handleDelete} className="btn-ghost text-red-400 hover:text-red-300 flex items-center gap-1.5 text-xs">
                    <Trash2 size={13} /> Delete
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* Comments */}
        <div className="border-t border-white/5 pt-5">
          <h3 className="text-sm font-medium text-white/60 mb-3">Comments</h3>
          {loadingComments ? (
            <div className="flex justify-center py-4"><Loader2 size={16} className="animate-spin text-white/30" /></div>
          ) : (
            <div className="space-y-3 max-h-48 overflow-y-auto mb-4">
              {comments.length === 0 && <p className="text-white/30 text-sm text-center py-4">No comments yet</p>}
              {comments.map(comment => (
                <div key={comment.id} className="flex gap-3">
                  <Avatar name={(comment.user as any)?.full_name} size="xs" className="mt-0.5" />
                  <div className="flex-1 bg-surface-2 rounded-xl px-3 py-2">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium text-white/70">{(comment.user as any)?.full_name || 'User'}</span>
                      <span className="text-xs text-white/30">{new Date(comment.created_at).toLocaleString()}</span>
                    </div>
                    <p className="text-sm text-white/70">{comment.content}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <Avatar name={user?.full_name} size="xs" className="mt-2" />
            <div className="flex-1 flex gap-2">
              <input
                value={commentText}
                onChange={e => setCommentText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAddComment() } }}
                placeholder="Add a comment..."
                className="input flex-1"
              />
              <button
                onClick={handleAddComment}
                disabled={!commentText.trim() || submittingComment}
                className="btn-primary px-3"
              >
                {submittingComment ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  )
}
