import { create } from 'zustand'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import type { Profile, Organization } from '../types/supabase'

interface AuthState {
  user: Profile | null
  organization: Organization | null
  loading: boolean
  initialized: boolean
  hydrateFallbackUser: (authUser: User) => void
  setUser: (user: Profile | null) => void
  setOrganization: (org: Organization | null) => void
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
  fetchProfile: (userId: string) => Promise<{ error: string | null }>
  fetchOrganization: (userId: string) => Promise<{ error: string | null }>
  initialize: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  organization: null,
  loading: false,
  initialized: false,

  setUser: (user) => set({ user }),
  setOrganization: (organization) => set({ organization }),

  hydrateFallbackUser: (authUser: User) =>
    set({
      user: {
        id: authUser.id,
        email: authUser.email ?? '',
        full_name: (authUser.user_metadata?.full_name as string | undefined) ?? null,
        avatar_url: null,
        role: 'user',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    } as Partial<AuthState>),

  signIn: async (email, password) => {
    set({ loading: true })
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) return { error: error.message }
      if (data.user) {
        const profileResult = await get().fetchProfile(data.user.id)
        if (profileResult.error) {
          get().hydrateFallbackUser(data.user)
        }

        await get().fetchOrganization(data.user.id)
      }
      return { error: null }
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Sign in failed. Please try again.',
      }
    } finally {
      set({ loading: false })
    }
  },

  signUp: async (email, password, fullName) => {
    set({ loading: true })
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } },
      })
      if (error) return { error: error.message }
      if (data.user) {
        // Profile is created via trigger in Supabase
        await new Promise(r => setTimeout(r, 500))
        const profileResult = await get().fetchProfile(data.user.id)
        if (profileResult.error) {
          get().hydrateFallbackUser(data.user)
        }
      }
      return { error: null }
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Sign up failed. Please try again.',
      }
    } finally {
      set({ loading: false })
    }
  },

  signOut: async () => {
    await supabase.auth.signOut()
    set({ user: null, organization: null })
  },

  fetchProfile: async (userId) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    if (error) return { error: error.message }
    if (data) {
      set({ user: data })
    }
    return { error: null }
  },

  fetchOrganization: async (userId) => {
    const { data, error } = await supabase
      .from('memberships')
      .select('organization_id, organizations(*)')
      .eq('user_id', userId)
      .limit(1)
      .single()
    if (error) {
      set({ organization: null })
      return { error: error.message }
    }
    if (data?.organizations) {
      set({ organization: data.organizations as unknown as Organization })
      return { error: null }
    }
    set({ organization: null })
    return { error: null }
  },

  initialize: async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.user) {
      const profileResult = await get().fetchProfile(session.user.id)
      if (profileResult.error) {
        get().hydrateFallbackUser(session.user)
      }
      await get().fetchOrganization(session.user.id)
    }
    set({ initialized: true })

    supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        set({ user: null, organization: null })
      } else if (session?.user) {
        const profileResult = await get().fetchProfile(session.user.id)
        if (profileResult.error) {
          get().hydrateFallbackUser(session.user)
        }
        await get().fetchOrganization(session.user.id)
      }
    })
  },
}))
