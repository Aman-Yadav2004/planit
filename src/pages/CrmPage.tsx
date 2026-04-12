import { useEffect, useState } from 'react'
import { Plus, Search, Phone, Mail, Building2, MoreHorizontal, Trash2, Edit3, TrendingUp } from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { useCrmStore } from '../store/crmStore'
import { Modal } from '../components/ui/Modal'
import { StageBadge } from '../components/ui/Badges'
import { EmptyState } from '../components/ui/EmptyState'
import { toast } from '../components/ui/Toast'
import type { CrmContact } from '../types/supabase'

const STAGES: CrmContact['stage'][] = ['lead', 'contacted', 'qualified', 'proposal', 'converted', 'lost']

function ContactForm({ initial, onSave }: {
  initial?: Partial<CrmContact>
  onSave: (data: Partial<CrmContact>) => void
}) {
  const [form, setForm] = useState({
    name: initial?.name || '',
    email: initial?.email || '',
    phone: initial?.phone || '',
    company: initial?.company || '',
    stage: initial?.stage || 'lead' as CrmContact['stage'],
    notes: initial?.notes || '',
  })
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className="block text-xs text-white/40 mb-1.5">Name *</label>
          <input value={form.name} onChange={e => set('name', e.target.value)} className="input" placeholder="John Smith" />
        </div>
        <div>
          <label className="block text-xs text-white/40 mb-1.5">Email</label>
          <input type="email" value={form.email} onChange={e => set('email', e.target.value)} className="input" placeholder="john@company.com" />
        </div>
        <div>
          <label className="block text-xs text-white/40 mb-1.5">Phone</label>
          <input value={form.phone} onChange={e => set('phone', e.target.value)} className="input" placeholder="+1 234 567 890" />
        </div>
        <div>
          <label className="block text-xs text-white/40 mb-1.5">Company</label>
          <input value={form.company} onChange={e => set('company', e.target.value)} className="input" placeholder="Acme Inc" />
        </div>
        <div>
          <label className="block text-xs text-white/40 mb-1.5">Stage</label>
          <select value={form.stage} onChange={e => set('stage', e.target.value)} className="input">
            {STAGES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}
          </select>
        </div>
        <div className="col-span-2">
          <label className="block text-xs text-white/40 mb-1.5">Notes</label>
          <textarea value={form.notes} onChange={e => set('notes', e.target.value)} className="input min-h-[70px] resize-none" placeholder="Add any notes..." />
        </div>
      </div>
      <div className="flex justify-end">
        <button onClick={() => onSave(form)} disabled={!form.name.trim()} className="btn-primary">
          {initial?.id ? 'Save Changes' : 'Add Contact'}
        </button>
      </div>
    </div>
  )
}

export function CrmPage() {
  const { user, organization } = useAuthStore()
  const { contacts, loading, fetchContacts, createContact, updateContact, deleteContact } = useCrmStore()
  const [search, setSearch] = useState('')
  const [filterStage, setFilterStage] = useState<string>('all')
  const [showModal, setShowModal] = useState(false)
  const [editContact, setEditContact] = useState<CrmContact | null>(null)
  const [menuOpen, setMenuOpen] = useState<string | null>(null)
  const [view, setView] = useState<'list' | 'pipeline'>('pipeline')

  useEffect(() => {
    if (organization) fetchContacts(organization.id)
  }, [organization?.id])

  const filtered = contacts.filter(c => {
    const q = search.toLowerCase()
    const matchSearch = !q || c.name.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q) || c.company?.toLowerCase().includes(q)
    const matchStage = filterStage === 'all' || c.stage === filterStage
    return matchSearch && matchStage
  })

  const handleCreate = async (data: Partial<CrmContact>) => {
    if (!user || !organization) return
    const contact = await createContact({ ...data, organization_id: organization.id, created_by: user.id } as any)
    if (contact) { toast.success('Contact added!'); setShowModal(false) }
    else toast.error('Failed to add contact')
  }

  const handleUpdate = async (data: Partial<CrmContact>) => {
    if (!editContact) return
    await updateContact(editContact.id, data)
    toast.success('Contact updated')
    setEditContact(null)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this contact?')) return
    await deleteContact(id)
    toast.success('Contact deleted')
    setMenuOpen(null)
  }

  const stageContacts = (stage: CrmContact['stage']) => filtered.filter(c => c.stage === stage)

  return (
    <div className="p-6 max-w-7xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-white">CRM</h1>
          <p className="text-white/40 text-sm mt-0.5">{contacts.length} contact{contacts.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-surface-2 rounded-xl p-1 gap-1">
            {(['pipeline','list'] as const).map(v => (
              <button key={v} onClick={() => setView(v)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${view === v ? 'bg-brand-600 text-white' : 'text-white/40'}`}>
                {v.charAt(0).toUpperCase()+v.slice(1)}
              </button>
            ))}
          </div>
          <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2">
            <Plus size={15} /> Add Contact
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-6 flex-wrap">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search contacts..."
            className="input pl-9 w-56"
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {['all', ...STAGES].map(s => (
            <button
              key={s}
              onClick={() => setFilterStage(s)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all border ${
                filterStage === s ? 'bg-brand-600/20 text-brand-300 border-brand-500/30' : 'text-white/40 border-transparent hover:text-white/60 hover:bg-white/5'
              }`}
            >
              {s === 'all' ? 'All' : s.charAt(0).toUpperCase()+s.slice(1)}
              <span className="ml-1.5 text-white/30">{s === 'all' ? contacts.length : contacts.filter(c=>c.stage===s).length}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Pipeline view */}
      {view === 'pipeline' ? (
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-4 min-w-max">
            {STAGES.map(stage => {
              const stageCts = stageContacts(stage)
              return (
                <div key={stage} className="w-60 bg-surface-1 border border-white/5 rounded-2xl flex flex-col">
                  <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
                    <span className="text-sm font-medium text-white capitalize">{stage}</span>
                    <span className="text-xs text-white/30 bg-surface-3 rounded-md px-1.5 py-0.5">{stageCts.length}</span>
                  </div>
                  <div className="p-3 space-y-2 flex-1 overflow-y-auto max-h-[500px]">
                    {stageCts.length === 0 && (
                      <div className="text-center py-6 text-white/20 text-xs">No contacts</div>
                    )}
                    {stageCts.map(contact => (
                      <div key={contact.id} className="bg-surface-2 border border-white/5 rounded-xl p-3 hover:border-white/10 transition-colors cursor-pointer group">
                        <div className="flex items-start justify-between mb-1.5">
                          <div className="font-medium text-sm text-white">{contact.name}</div>
                          <div className="relative">
                            <button onClick={() => setMenuOpen(menuOpen === contact.id ? null : contact.id)} className="opacity-0 group-hover:opacity-100 btn-ghost p-0.5">
                              <MoreHorizontal size={13} />
                            </button>
                            {menuOpen === contact.id && (
                              <div className="absolute right-0 top-6 bg-surface-3 border border-white/10 rounded-xl shadow-xl z-20 py-1 min-w-[120px]">
                                <button onClick={() => { setEditContact(contact); setMenuOpen(null) }} className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-white/60 hover:text-white hover:bg-white/5">
                                  <Edit3 size={12} /> Edit
                                </button>
                                <button onClick={() => handleDelete(contact.id)} className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-red-400 hover:bg-red-500/10">
                                  <Trash2 size={12} /> Delete
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                        {contact.company && <div className="text-xs text-white/40 flex items-center gap-1"><Building2 size={10}/>{contact.company}</div>}
                        {contact.email && <div className="text-xs text-white/40 flex items-center gap-1 mt-0.5"><Mail size={10}/>{contact.email}</div>}
                      </div>
                    ))}
                  </div>
                  <div className="p-3 border-t border-white/5">
                    <button onClick={() => { setShowModal(true) }} className="flex items-center gap-1.5 w-full text-xs text-white/30 hover:text-white/60 transition-colors">
                      <Plus size={12} /> Add
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        /* List view */
        <div className="space-y-2">
          {loading ? (
            [1,2,3].map(i => <div key={i} className="card h-16 animate-pulse bg-surface-2" />)
          ) : filtered.length === 0 ? (
            <EmptyState icon="👥" title="No contacts found" description="Add your first CRM contact to start tracking leads." action={<button onClick={() => setShowModal(true)} className="btn-primary">Add Contact</button>} />
          ) : filtered.map(contact => (
            <div key={contact.id} className="card flex items-center gap-4 px-5 py-4 hover:border-white/10 transition-colors group">
              <div className="w-9 h-9 bg-brand-600/20 rounded-xl flex items-center justify-center text-brand-400 font-semibold text-sm flex-shrink-0">
                {contact.name[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0 grid grid-cols-4 gap-4">
                <div>
                  <div className="text-sm font-medium text-white truncate">{contact.name}</div>
                  {contact.company && <div className="text-xs text-white/40 truncate">{contact.company}</div>}
                </div>
                <div className="text-sm text-white/50 truncate flex items-center gap-1.5">
                  {contact.email && <><Mail size={12} className="flex-shrink-0 text-white/30" />{contact.email}</>}
                </div>
                <div className="text-sm text-white/50 flex items-center gap-1.5">
                  {contact.phone && <><Phone size={12} className="flex-shrink-0 text-white/30" />{contact.phone}</>}
                </div>
                <div><StageBadge stage={contact.stage} /></div>
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 flex-shrink-0">
                <button onClick={() => setEditContact(contact)} className="btn-ghost p-1.5"><Edit3 size={14} /></button>
                <button onClick={() => handleDelete(contact.id)} className="btn-ghost p-1.5 text-red-400/60 hover:text-red-400"><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Add Contact">
        <ContactForm onSave={handleCreate} />
      </Modal>
      <Modal open={!!editContact} onClose={() => setEditContact(null)} title="Edit Contact">
        {editContact && <ContactForm initial={editContact} onSave={handleUpdate} />}
      </Modal>
    </div>
  )
}
