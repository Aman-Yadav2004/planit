import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, FolderKanban, Trash2, MoreHorizontal, Edit3 } from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { useProjectsStore } from '../store/projectsStore'
import { Modal } from '../components/ui/Modal'
import { EmptyState } from '../components/ui/EmptyState'
import { toast } from '../components/ui/Toast'
import type { Project } from '../types/supabase'

const PROJECT_COLORS = [
  '#6366f1','#8b5cf6','#ec4899','#f59e0b','#10b981','#06b6d4','#f97316','#3b82f6'
]

function ProjectForm({ onSave, initial }: {
  onSave: (data: { name: string; description: string; color: string }) => void
  initial?: Partial<Project>
}) {
  const [name, setName] = useState(initial?.name || '')
  const [description, setDescription] = useState(initial?.description || '')
  const [color, setColor] = useState(initial?.color || PROJECT_COLORS[0])

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm text-white/60 mb-1.5">Project Name *</label>
        <input value={name} onChange={e => setName(e.target.value)} className="input" placeholder="My awesome project" />
      </div>
      <div>
        <label className="block text-sm text-white/60 mb-1.5">Description</label>
        <textarea value={description} onChange={e => setDescription(e.target.value)} className="input min-h-[80px] resize-none" placeholder="What's this project about?" />
      </div>
      <div>
        <label className="block text-sm text-white/60 mb-2">Color</label>
        <div className="flex gap-2 flex-wrap">
          {PROJECT_COLORS.map(c => (
            <button
              key={c}
              onClick={() => setColor(c)}
              className={`w-7 h-7 rounded-full transition-all ${color === c ? 'ring-2 ring-white ring-offset-2 ring-offset-surface-1 scale-110' : ''}`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <button
          onClick={() => onSave({ name, description, color })}
          disabled={!name.trim()}
          className="btn-primary"
        >
          {initial?.id ? 'Save Changes' : 'Create Project'}
        </button>
      </div>
    </div>
  )
}

export function ProjectsPage() {
  const { user, organization } = useAuthStore()
  const { projects, loading, fetchProjects, createProject, updateProject, deleteProject } = useProjectsStore()
  const [showModal, setShowModal] = useState(false)
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [menuOpen, setMenuOpen] = useState<string | null>(null)

  useEffect(() => {
    if (organization) fetchProjects(organization.id)
  }, [organization?.id])

  const handleCreate = async ({ name, description, color }: { name: string; description: string; color: string }) => {
    if (!user || !organization) return
    const project = await createProject({ name, description, color, organization_id: organization.id, created_by: user.id })
    if (project) { toast.success('Project created!'); setShowModal(false) }
    else toast.error('Failed to create project')
  }

  const handleUpdate = async ({ name, description, color }: { name: string; description: string; color: string }) => {
    if (!editingProject) return
    await updateProject(editingProject.id, { name, description, color })
    toast.success('Project updated!')
    setEditingProject(null)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this project? This will also delete all boards and tasks.')) return
    await deleteProject(id)
    toast.success('Project deleted')
    setMenuOpen(null)
  }

  return (
    <div className="p-6 max-w-6xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-white">Projects</h1>
          <p className="text-white/40 text-sm mt-0.5">{projects.length} project{projects.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2">
          <Plus size={15} /> New Project
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3].map(i => <div key={i} className="card h-40 animate-pulse bg-surface-2" />)}
        </div>
      ) : projects.length === 0 ? (
        <EmptyState
          icon="🚀"
          title="No projects yet"
          description="Create your first project to start organizing your work with Kanban boards."
          action={<button onClick={() => setShowModal(true)} className="btn-primary">Create Project</button>}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map(project => (
            <div key={project.id} className="card hover:border-white/10 transition-all group relative">
              <div className="h-2 rounded-t-xl" style={{ backgroundColor: project.color }} />
              <div className="p-5">
                <div className="flex items-start justify-between mb-2">
                  <Link to={`/projects/${project.id}`} className="flex items-center gap-2 flex-1 min-w-0">
                    <FolderKanban size={18} style={{ color: project.color }} className="flex-shrink-0" />
                    <h3 className="font-semibold text-white truncate hover:text-brand-300 transition-colors">{project.name}</h3>
                  </Link>
                  <div className="relative flex-shrink-0">
                    <button
                      onClick={() => setMenuOpen(menuOpen === project.id ? null : project.id)}
                      className="btn-ghost p-1.5 opacity-0 group-hover:opacity-100"
                    >
                      <MoreHorizontal size={15} />
                    </button>
                    {menuOpen === project.id && (
                      <div className="absolute right-0 top-8 bg-surface-3 border border-white/10 rounded-xl shadow-xl z-10 py-1 min-w-[130px]">
                        <button onClick={() => { setEditingProject(project); setMenuOpen(null) }} className="flex items-center gap-2 w-full px-3 py-2 text-sm text-white/60 hover:text-white hover:bg-white/5">
                          <Edit3 size={14} /> Edit
                        </button>
                        <button onClick={() => handleDelete(project.id)} className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-400 hover:bg-red-500/10">
                          <Trash2 size={14} /> Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                {project.description && (
                  <p className="text-white/40 text-sm line-clamp-2 mb-4">{project.description}</p>
                )}
                <div className="flex items-center justify-between pt-3 border-t border-white/5">
                  <span className="text-xs text-white/30">{new Date(project.created_at).toLocaleDateString()}</span>
                  <Link to={`/projects/${project.id}`} className="text-xs text-brand-400 hover:text-brand-300">
                    Open Board →
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Create Project">
        <ProjectForm onSave={handleCreate} />
      </Modal>

      <Modal open={!!editingProject} onClose={() => setEditingProject(null)} title="Edit Project">
        {editingProject && <ProjectForm onSave={handleUpdate} initial={editingProject} />}
      </Modal>
    </div>
  )
}
