import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import type { CrmContact } from '../types/supabase'

interface CrmState {
  contacts: CrmContact[]
  loading: boolean
  error: string | null
  fetchContacts: (orgId: string) => Promise<void>
  createContact: (data: Omit<CrmContact, 'id' | 'created_at' | 'updated_at'>) => Promise<CrmContact | null>
  updateContact: (id: string, data: Partial<CrmContact>) => Promise<void>
  deleteContact: (id: string) => Promise<void>
}

export const useCrmStore = create<CrmState>((set) => ({
  contacts: [],
  loading: false,
  error: null,

  fetchContacts: async (orgId) => {
    set({ loading: true, error: null })
    const { data, error } = await supabase
      .from('crm_contacts')
      .select('*')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false })
    if (error) set({ error: error.message })
    else set({ contacts: data || [] })
    set({ loading: false })
  },

  createContact: async (data) => {
    const { data: contact, error } = await supabase
      .from('crm_contacts')
      .insert(data)
      .select()
      .single()
    if (error || !contact) return null
    set(state => ({ contacts: [contact, ...state.contacts] }))
    return contact
  },

  updateContact: async (id, data) => {
    const { data: updated } = await supabase
      .from('crm_contacts')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    if (updated) {
      set(state => ({ contacts: state.contacts.map(c => c.id === id ? updated : c) }))
    }
  },

  deleteContact: async (id) => {
    await supabase.from('crm_contacts').delete().eq('id', id)
    set(state => ({ contacts: state.contacts.filter(c => c.id !== id) }))
  },
}))
