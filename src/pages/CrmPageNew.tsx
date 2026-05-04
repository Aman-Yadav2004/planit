import { useState, useEffect } from 'react'
import { Plus, Search, Phone, Mail, Building2, MoreHorizontal, Trash2, Edit3, GripVertical, X } from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { useCrmStore } from '../store/crmStore'
import { Modal } from '../components/ui/Modal'
import { EmptyState } from '../components/ui/EmptyState'
import { toast } from '../components/ui/Toast'
import type { CrmContact } from '../types/supabase'

const STAGES: CrmContact['stage'][] = ['lead', 'contacted', 'qualified', 'proposal', 'converted', 'lost']

function ContactForm({
  initial,
  onSave,
  onCancel,
  existingContacts = [],
}: {
  initial?: Partial<CrmContact>
  onSave: (data: Partial<CrmContact>) => void
  onCancel: () => void
  existingContacts?: CrmContact[]
}) {
  const [form, setForm] = useState({
    name: initial?.name || '',
    email: initial?.email || '',
    phone: initial?.phone || '',
    company: initial?.company || '',
    stage: initial?.stage || ('lead' as CrmContact['stage']),
    notes: initial?.notes || '',
    assigned_to: initial?.assigned_to || '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validateEmail = (email: string): boolean => {
    if (!email) return true
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const validatePhone = (phone: string): boolean => {
    if (!phone) return true
    const phoneRegex = /^[0-9+\-\s()]*$/ 
    return phoneRegex.test(phone) && phone.replace(/\D/g, '').length >= 10
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const newErrors: Record<string, string> = {}

    if (!form.name.trim()) {
      newErrors.name = 'Contact name is required'
    } else if (form.name.length > 100) {
      newErrors.name = 'Name must be 100 characters or less'
    } else if (!initial?.id) {
      const isDuplicate = existingContacts.some(c => c.name.toLowerCase() === form.name.toLowerCase())
      if (isDuplicate) {
        newErrors.name = 'A contact with this name already exists'
      }
    }

    if (form.email && !validateEmail(form.email)) {
      newErrors.email = 'Please enter a valid email address'
    } else if (form.email && form.email.length > 150) {
      newErrors.email = 'Email must be 150 characters or less'
    } else if (form.email && !initial?.id) {
      const isDuplicate = existingContacts.some(c => c.email?.toLowerCase() === form.email.toLowerCase())
      if (isDuplicate) {
        newErrors.email = 'This email is already in use'
      }
    }

    if (form.phone && !validatePhone(form.phone)) {
      newErrors.phone = 'Phone must contain at least 10 digits'
    } else if (form.phone && form.phone.length > 20) {
      newErrors.phone = 'Phone must be 20 characters or less'
    }

    if (form.company && form.company.length > 100) {
      newErrors.company = 'Company name must be 100 characters or less'
    }

    if (form.notes && form.notes.length > 500) {
      newErrors.notes = 'Notes must be 500 characters or less'
    }

    if (form.assigned_to && form.assigned_to.length > 100) {
      newErrors.assigned_to = 'Assigned to must be 100 characters or less'
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    setErrors({})
    onSave(form)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className="block text-xs text-white/40 mb-1.5">Name * ({form.name.length}/100)</label>
          <input
            value={form.name}
            onChange={(e) => {
              setForm({ ...form, name: e.target.value.slice(0, 100) })
              if (errors.name) setErrors({ ...errors, name: '' })
            }}
            className={`input ${errors.name ? 'border-red-400/50' : ''}`}
            placeholder="John Smith"
            required
          />
          {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name}</p>}
        </div>
        <div>
          <label className="block text-xs text-white/40 mb-1.5">Email ({form.email.length}/150)</label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => {
              setForm({ ...form, email: e.target.value.slice(0, 150) })
              if (errors.email) setErrors({ ...errors, email: '' })
            }}
            className={`input ${errors.email ? 'border-red-400/50' : ''}`}
            placeholder="john@company.com"
          />
          {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email}</p>}
        </div>
        <div>
          <label className="block text-xs text-white/40 mb-1.5">Phone ({form.phone.length}/20)</label>
          <input
            value={form.phone}
            onChange={(e) => {
              setForm({ ...form, phone: e.target.value.slice(0, 20) })
              if (errors.phone) setErrors({ ...errors, phone: '' })
            }}
            className={`input ${errors.phone ? 'border-red-400/50' : ''}`}
            placeholder="+1 234 567 890"
          />
          {errors.phone && <p className="text-red-400 text-xs mt-1">{errors.phone}</p>}
        </div>
        <div>
          <label className="block text-xs text-white/40 mb-1.5">Company ({form.company.length}/100)</label>
          <input
            value={form.company}
            onChange={(e) => {
              setForm({ ...form, company: e.target.value.slice(0, 100) })
              if (errors.company) setErrors({ ...errors, company: '' })
            }}
            className={`input ${errors.company ? 'border-red-400/50' : ''}`}
            placeholder="Acme Inc"
          />
          {errors.company && <p className="text-red-400 text-xs mt-1">{errors.company}</p>}
        </div>
        <div>
          <label className="block text-xs text-white/40 mb-1.5">Stage</label>
          <select
            value={form.stage}
            onChange={(e) => setForm({ ...form, stage: e.target.value as CrmContact['stage'] })}
            className="input"
          >
            {STAGES.map((s) => (
              <option key={s} value={s}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </option>
            ))}
          </select>
        </div>
        <div className="col-span-2">
          <label className="block text-xs text-white/40 mb-1.5">Assign To ({form.assigned_to.length}/100)</label>
          <input
            value={form.assigned_to}
            onChange={(e) => {
              setForm({ ...form, assigned_to: e.target.value.slice(0, 100) })
              if (errors.assigned_to) setErrors({ ...errors, assigned_to: '' })
            }}
            className={`input ${errors.assigned_to ? 'border-red-400/50' : ''}`}
            placeholder="Team member name or email"
          />
          {errors.assigned_to && <p className="text-red-400 text-xs mt-1">{errors.assigned_to}</p>}
        </div>
        <div className="col-span-2">
          <label className="block text-xs text-white/40 mb-1.5">Notes ({form.notes.length}/500)</label>
          <textarea
            value={form.notes}
            onChange={(e) => {
              setForm({ ...form, notes: e.target.value.slice(0, 500) })
              if (errors.notes) setErrors({ ...errors, notes: '' })
            }}
            className={`input min-h-[70px] resize-none ${errors.notes ? 'border-red-400/50' : ''}`}
            placeholder="Add any notes..."
          />
          {errors.notes && <p className="text-red-400 text-xs mt-1">{errors.notes}</p>}
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="btn-secondary px-4 py-2">
          Cancel
        </button>
        <button type="submit" className="btn-primary px-4 py-2">
          {initial?.id ? 'Update Contact' : 'Add Contact'}
        </button>
      </div>
    </form>
  )
}

export function CrmPageNew() {
  const { user, organization } = useAuthStore()
  const { contacts, loading, fetchContacts, createContact, updateContact, deleteContact } =
    useCrmStore()
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editContact, setEditContact] = useState<CrmContact | null>(null)
  const [draggedContact, setDraggedContact] = useState<CrmContact | null>(null)
  const [menuOpen, setMenuOpen] = useState<string | null>(null)

  useEffect(() => {
    if (organization) {
      fetchContacts(organization.id)
    }
  }, [organization?.id, fetchContacts])

  const filtered = contacts.filter((c) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      c.name.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.company?.toLowerCase().includes(q)
    )
  })

  const getStageContacts = (stage: CrmContact['stage']) =>
    filtered.filter((c) => c.stage === stage)

  const handleCreate = async (data: Partial<CrmContact>) => {
    if (!user || !organization) {
      toast.error('Please sign in and select an organization')
      return
    }
    try {
      await createContact({
        ...data,
        organization_id: organization.id,
        created_by: user.id,
      } as any)
      toast.success('Contact added!')
      setShowModal(false)
    } catch (error: any) {
      console.error('Error creating contact:', error)
      toast.error(error.message || 'Failed to add contact')
    }
  }

  const handleUpdate = async (data: Partial<CrmContact>) => {
    if (!editContact) return
    try {
      await updateContact(editContact.id, data)
      toast.success('Contact updated!')
      setEditContact(null)
      setShowModal(false)
    } catch (error: any) {
      toast.error(error.message || 'Failed to update contact')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this contact?')) return
    try {
      await deleteContact(id)
      toast.success('Contact deleted')
      setMenuOpen(null)
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete contact')
    }
  }

  const handleDragStart = (contact: CrmContact) => {
    setDraggedContact(contact)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = async (stage: CrmContact['stage']) => {
    if (!draggedContact || draggedContact.stage === stage) {
      setDraggedContact(null)
      return
    }
    try {
      await updateContact(draggedContact.id, { stage })
      toast.success('Contact moved!')
      setDraggedContact(null)
    } catch (error: any) {
      toast.error('Failed to update contact')
    }
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="text-white/40">Loading contacts...</div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">CRM Pipeline</h1>
          <p className="text-white/40 text-sm mt-1">{contacts.length} contacts total</p>
        </div>
        <button onClick={() => {setEditContact(null); setShowModal(true)}} className="btn-primary flex items-center gap-2">
          <Plus size={18} />
          Add Contact
        </button>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search contacts..."
            className="input pl-9 w-full"
          />
        </div>
      </div>

      {/* Pipeline Board */}
      <div className="overflow-x-auto pb-4">
        <div className="flex gap-4 min-w-max">
          {STAGES.map((stage) => {
            const stageCts = getStageContacts(stage)
            return (
              <div
                key={stage}
                onDragOver={handleDragOver}
                onDrop={() => handleDrop(stage)}
                className="w-80 bg-surface-1 border border-white/5 rounded-2xl flex flex-col hover:border-white/10 transition"
              >
                {/* Stage Header */}
                <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
                  <span className="text-sm font-semibold text-white capitalize">{stage}</span>
                  <span className="text-xs text-white/30 bg-surface-dark rounded-md px-2 py-1">
                    {stageCts.length}
                  </span>
                </div>

                {/* Contacts */}
                <div className="p-3 space-y-3 flex-1 overflow-y-auto max-h-[600px]">
                  {stageCts.length === 0 ? (
                    <div className="text-center py-8 text-white/20 text-xs">
                      <p>No contacts</p>
                      <p className="text-white/10 text-xs mt-1">Drag contacts here</p>
                    </div>
                  ) : (
                    stageCts.map((contact) => (
                      <div
                        key={contact.id}
                        draggable
                        onDragStart={() => handleDragStart(contact)}
                        className={`bg-surface-2 border border-white/5 rounded-xl p-3.5 hover:border-white/10 transition cursor-grab active:cursor-grabbing group ${
                          draggedContact?.id === contact.id ? 'opacity-50' : ''
                        }`}
                      >
                        <div className="flex items-start gap-2 mb-2">
                          <GripVertical size={14} className="text-white/10 group-hover:text-white/30 flex-shrink-0 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-sm text-white truncate">{contact.name}</h3>
                          </div>
                          <div className="relative flex-shrink-0">
                            <button
                              onClick={() => setMenuOpen(menuOpen === contact.id ? null : contact.id)}
                              className="opacity-0 group-hover:opacity-100 text-white/40 hover:text-white transition p-0.5"
                            >
                              <MoreHorizontal size={14} />
                            </button>
                            {menuOpen === contact.id && (
                              <div className="absolute right-0 top-6 bg-surface-3 border border-white/10 rounded-xl shadow-xl z-20 min-w-[120px]">
                                <button
                                  onClick={() => {
                                    setEditContact(contact)
                                    setShowModal(true)
                                    setMenuOpen(null)
                                  }}
                                  className="flex items-center gap-2 w-full px-3 py-2 text-xs text-white/60 hover:text-white hover:bg-white/5 transition"
                                >
                                  <Edit3 size={12} />
                                  Edit
                                </button>
                                <button
                                  onClick={() => handleDelete(contact.id)}
                                  className="flex items-center gap-2 w-full px-3 py-2 text-xs text-red-400/60 hover:text-red-400 hover:bg-red-500/10 transition"
                                >
                                  <Trash2 size={12} />
                                  Delete
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                        {contact.company && (
                          <div className="flex items-center gap-1.5 text-xs text-white/40 mb-1.5 ml-5">
                            <Building2 size={12} />
                            {contact.company}
                          </div>
                        )}

                        {contact.email && (
                          <div className="flex items-center gap-1.5 text-xs text-white/40 mb-1.5 ml-5">
                            <Mail size={12} />
                            {contact.email}
                          </div>
                        )}

                        {contact.phone && (
                          <div className="flex items-center gap-1.5 text-xs text-white/40 ml-5">
                            <Phone size={12} />
                            {contact.phone}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Modal */}
      <Modal
        open={showModal}
        title={editContact ? 'Edit Contact' : 'Add New Contact'}
        onClose={() => {
          setShowModal(false)
          setEditContact(null)
        }}
      >
        <ContactForm
          initial={editContact || undefined}
          onSave={editContact ? handleUpdate : handleCreate}
          onCancel={() => {
            setShowModal(false)
            setEditContact(null)
          }}
          existingContacts={contacts}
        />
      </Modal>
    </div>
  )
}
