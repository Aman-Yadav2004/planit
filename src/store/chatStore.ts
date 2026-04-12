import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import type { Database, Message } from '../types/supabase'

type MessageInsert = Database['public']['Tables']['messages']['Insert']

interface ChatState {
  messages: Message[]
  activeChannel: { type: 'org' | 'project'; id: string } | null
  loading: boolean
  setActiveChannel: (channel: { type: 'org' | 'project'; id: string } | null) => void
  fetchMessages: (orgId: string, projectId?: string) => Promise<void>
  sendMessage: (data: MessageInsert) => Promise<void>
  addMessage: (message: Message) => void
}

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  activeChannel: null,
  loading: false,

  setActiveChannel: (channel) => set({ activeChannel: channel, messages: [] }),

  fetchMessages: async (orgId, projectId) => {
    set({ loading: true })
    let query = supabase
      .from('messages')
      .select('*, user:profiles!messages_user_id_fkey(*)')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: true })
      .limit(50)

    if (projectId) {
      query = query.eq('project_id', projectId)
    } else {
      query = query.is('project_id', null)
    }

    const { data } = await query
    set({ messages: (data || []) as unknown as Message[], loading: false })
  },

  sendMessage: async (data) => {
    await supabase.from('messages').insert(data)
  },

  addMessage: (message) => {
    set(state => ({ messages: [...state.messages, message] }))
  },
}))
