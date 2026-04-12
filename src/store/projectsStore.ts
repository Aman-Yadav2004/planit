import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import type { Database, Project, Board, Task } from '../types/supabase'

type ProjectInsert = Database['public']['Tables']['projects']['Insert']
type ProjectUpdate = Database['public']['Tables']['projects']['Update']
type BoardInsert = Database['public']['Tables']['boards']['Insert']
type BoardUpdate = Database['public']['Tables']['boards']['Update']
type TaskInsert = Database['public']['Tables']['tasks']['Insert']
type TaskUpdate = Database['public']['Tables']['tasks']['Update']

interface ProjectsState {
  projects: Project[]
  activeProject: Project | null
  boards: Board[]
  loading: boolean
  error: string | null
  setActiveProject: (project: Project | null) => void
  fetchProjects: (orgId: string) => Promise<void>
  createProject: (data: ProjectInsert) => Promise<Project | null>
  updateProject: (id: string, data: ProjectUpdate) => Promise<void>
  deleteProject: (id: string) => Promise<void>
  fetchBoards: (projectId: string) => Promise<void>
  createBoard: (data: BoardInsert) => Promise<Board | null>
  updateBoard: (id: string, data: BoardUpdate) => Promise<void>
  deleteBoard: (id: string) => Promise<void>
  createTask: (data: TaskInsert) => Promise<Task | null>
  updateTask: (id: string, data: TaskUpdate) => Promise<void>
  deleteTask: (id: string) => Promise<void>
  moveTask: (taskId: string, newBoardId: string, newPosition: number) => Promise<void>
}

export const useProjectsStore = create<ProjectsState>((set, get) => ({
  projects: [],
  activeProject: null,
  boards: [],
  loading: false,
  error: null,

  setActiveProject: (project) => set({ activeProject: project }),

  fetchProjects: async (orgId) => {
    set({ loading: true, error: null })
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false })
      if (error) throw error
      set({ projects: data || [] })
    } catch (e: any) {
      set({ error: e.message })
    } finally {
      set({ loading: false })
    }
  },

  createProject: async (data) => {
    const { data: project, error } = await supabase
      .from('projects')
      .insert(data)
      .select()
      .single()
    if (error || !project) return null
    set(state => ({ projects: [project, ...state.projects] }))
    return project
  },

  updateProject: async (id, data) => {
    const { data: updated } = await supabase
      .from('projects')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    if (updated) {
      set(state => ({
        projects: state.projects.map(p => p.id === id ? updated : p),
        activeProject: state.activeProject?.id === id ? updated : state.activeProject,
      }))
    }
  },

  deleteProject: async (id) => {
    await supabase.from('projects').delete().eq('id', id)
    set(state => ({
      projects: state.projects.filter(p => p.id !== id),
      activeProject: state.activeProject?.id === id ? null : state.activeProject,
    }))
  },

  fetchBoards: async (projectId) => {
    set({ loading: true })
    const { data, error } = await supabase
      .from('boards')
      .select(`*, tasks(*, assignee:profiles!tasks_assignee_id_fkey(*))`)
      .eq('project_id', projectId)
      .order('position', { ascending: true })
    if (!error && data) {
      const boards = data.map((b: any) => ({
        ...b,
        tasks: ((b.tasks || []) as Task[]).sort((a: Task, b: Task) => a.position - b.position),
      })) as Board[]
      set({ boards })
    }
    set({ loading: false })
  },

  createBoard: async (data) => {
    const { data: board, error } = await supabase
      .from('boards')
      .insert(data)
      .select()
      .single()
    if (error || !board) return null
    set(state => ({ boards: [...state.boards, { ...(board as Board), tasks: [] }] }))
    return board
  },

  updateBoard: async (id, data) => {
    const { data: updated } = await supabase
      .from('boards')
      .update(data)
      .eq('id', id)
      .select()
      .single()
    if (updated) {
      set(state => ({
        boards: state.boards.map(b => b.id === id ? { ...b, ...updated } : b),
      }))
    }
  },

  deleteBoard: async (id) => {
    await supabase.from('boards').delete().eq('id', id)
    set(state => ({ boards: state.boards.filter(b => b.id !== id) }))
  },

  createTask: async (data) => {
    const { data: task, error } = await supabase
      .from('tasks')
      .insert(data)
      .select('*, assignee:profiles!tasks_assignee_id_fkey(*)')
      .single()
    if (error || !task) return null
    const newTask = task as unknown as Task
    set(state => ({
      boards: state.boards.map(b =>
        b.id === newTask.board_id
          ? { ...b, tasks: [...(b.tasks || []), newTask] }
          : b
      ),
    }))
    return newTask
  },

  updateTask: async (id, data) => {
    const { data: updated } = await supabase
      .from('tasks')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('*, assignee:profiles!tasks_assignee_id_fkey(*)')
      .single()
    if (updated) {
      const updatedTask = updated as unknown as Task
      set(state => ({
        boards: state.boards.map(b => ({
          ...b,
          tasks: (b.tasks || []).map(t => t.id === id ? updatedTask : t),
        })),
      }))
    }
  },

  deleteTask: async (id) => {
    await supabase.from('tasks').delete().eq('id', id)
    set(state => ({
      boards: state.boards.map(b => ({
        ...b,
        tasks: (b.tasks || []).filter(t => t.id !== id),
      })),
    }))
  },

  moveTask: async (taskId, newBoardId, newPosition) => {
    // Optimistic update
    let movedTask: Task | null = null
    set(state => {
      const boards = state.boards.map(b => ({
        ...b,
        tasks: (b.tasks || []).filter(t => {
          if (t.id === taskId) { movedTask = t; return false }
          return true
        }),
      }))
      if (!movedTask) return { boards }
      return {
        boards: boards.map(b =>
          b.id === newBoardId
            ? { ...b, tasks: [...(b.tasks || []), { ...movedTask!, board_id: newBoardId, position: newPosition }] }
            : b
        ),
      }
    })
    await supabase.from('tasks').update({ board_id: newBoardId, position: newPosition, updated_at: new Date().toISOString() }).eq('id', taskId)
  },
}))
