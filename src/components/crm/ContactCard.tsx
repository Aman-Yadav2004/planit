import { useState } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { MoreHorizontal, Trash2, Edit3, GripVertical, Building2, Mail, Phone } from 'lucide-react'
import type { CrmContact } from '../../types/supabase'

interface ContactCardProps {
  contact: CrmContact
  onEdit: (c: CrmContact) => void
  onDelete: (id: string) => void
  isAdmin: boolean
}

export function ContactCard({ contact, onEdit, onDelete, isAdmin }: ContactCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: contact.id,
    data: { type: 'contact', contact },
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-surface-2 border border-white/5 rounded-xl p-3.5 hover:border-white/10 transition-all group animate-fade-in`}
    >
      <div className="flex items-start justify-between mb-1.5">
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm text-white truncate">{contact.name}</div>
        </div>
        <div className="relative">
          <button onClick={() => setMenuOpen(prev => !prev)} className="opacity-0 group-hover:opacity-100 btn-ghost p-0.5">
            <MoreHorizontal size={13} />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-6 bg-surface-3 border border-white/10 rounded-xl shadow-xl z-20 py-1 min-w-[120px]">
              {isAdmin ? (
                <>
                  <button onClick={() => { onEdit(contact); setMenuOpen(false) }} className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-white/60 hover:text-white hover:bg-white/5">
                    <Edit3 size={12} /> Edit
                  </button>
                  <button onClick={() => onDelete(contact.id)} className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-red-400 hover:bg-red-500/10">
                    <Trash2 size={12} /> Delete
                  </button>
                </>
              ) : (
                <div className="px-3 py-2 text-xs text-white/40">Admins only</div>
              )}
            </div>
          )}
        </div>
      </div>

      {contact.company && (
        <div className="text-xs text-white/40 flex items-center gap-1 mb-1"><Building2 size={12} />{contact.company}</div>
      )}

      {contact.email && (
        <div className="text-xs text-white/40 flex items-center gap-1 mt-0.5"><Mail size={12}/>{contact.email}</div>
      )}

      {contact.phone && (
        <div className="text-xs text-white/40 flex items-center gap-1 mt-0.5"><Phone size={12}/>{contact.phone}</div>
      )}

      <div className="flex items-center justify-end mt-3 pt-3 border-t border-white/5">
        {isAdmin ? (
          <button
            {...attributes}
            {...listeners}
            onClick={e => e.stopPropagation()}
            className="opacity-0 group-hover:opacity-100 text-white/20 hover:text-white/40 cursor-grab active:cursor-grabbing mt-0.5 flex-shrink-0"
          >
            <GripVertical size={14} />
          </button>
        ) : (
          <div className="opacity-0 group-hover:opacity-100 text-white/20 mt-0.5 flex-shrink-0">
            <GripVertical size={14} />
          </div>
        )}
      </div>
    </div>
  )
}

export function ContactCardOverlay({ contact }: { contact: CrmContact }) {
  return (
    <div className="bg-surface-2 border border-brand-500/30 rounded-xl p-3.5 shadow-2xl rotate-2 w-64">
      <p className="text-sm text-white">{contact.name}</p>
    </div>
  )
}
