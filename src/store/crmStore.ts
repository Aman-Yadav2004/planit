import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import type { CrmContact } from '../types/supabase'

interface CrmState {
  contacts: CrmContact[]
  loading: boolean
  error: string | null
  fetchContacts: (orgId: string) => Promise<void>
  createContact: (data: Omit<CrmContact, 'id' | 'created_at' | 'updated_at'>) => Promise<{ contact: CrmContact | null; error: string | null }>
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
    // Sanitize UUID fields: convert empty strings or invalid values to null
    const insertData: any = { ...data }
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

    if ('assigned_to' in insertData) {
      if (!insertData.assigned_to || insertData.assigned_to === '') insertData.assigned_to = null
      else if (typeof insertData.assigned_to === 'string' && !uuidRegex.test(insertData.assigned_to)) {
        // assigned_to was entered as free text (name/email), clear to avoid DB UUID errors
        insertData.assigned_to = null
      }
    }

    if ('created_by' in insertData) {
      if (!insertData.created_by || insertData.created_by === '') insertData.created_by = null
    }

    if (!insertData.organization_id) {
      const errMsg = 'Missing organization_id'
      set({ error: errMsg })
      return { contact: null, error: errMsg }
    }

    const { data: contact, error } = await supabase
      .from('crm_contacts')
      .insert(insertData)
      .select()
      .single()

    if (error || !contact) {
      console.error('createContact error:', error)
      set({ error: error?.message ?? 'Insert failed' })
      return { contact: null, error: error?.message ?? 'Insert failed' }
    }

    set(state => ({ contacts: [contact, ...state.contacts] }))
    return { contact, error: null }
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
