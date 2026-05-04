import { create } from 'zustand'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import type { Profile, Organization } from '../types/supabase'

interface AuthState {
  user: Profile | null
  organization: Organization | null
  organizations: Organization[]
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
  fetchOrganizations: (userId: string) => Promise<{ error: string | null }>
  switchOrganization: (orgId: string) => Promise<void>
  joinByOrgCode: (orgCode: string) => Promise<{ error: string | null; orgId?: string }>
  initialize: () => Promise<void>
}

function normalizeOrganization(value: unknown): Organization | null {
  if (!value) return null
  return Array.isArray(value) ? (value[0] as Organization | undefined) ?? null : (value as Organization)
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  organization: null,
  organizations: [],
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
      .maybeSingle()
    if (error) {
      set({ organization: null })
      return { error: error.message }
    }
    const memberOrg = normalizeOrganization(data?.organizations)
    if (memberOrg) {
      set({ organization: memberOrg })
      return { error: null }
    }

    const { data: ownedOrg, error: ownedOrgError } = await supabase
      .from('organizations')
      .select('*')
      .eq('created_by', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (ownedOrgError) {
      set({ organization: null })
      return { error: ownedOrgError.message }
    }

    if (ownedOrg) {
      await supabase
        .from('memberships')
        .upsert(
          { organization_id: ownedOrg.id, user_id: userId, role: 'admin' },
          { onConflict: 'organization_id,user_id' }
        )

      set({
        organization: ownedOrg,
        organizations: [ownedOrg, ...get().organizations.filter(org => org.id !== ownedOrg.id)],
      })
      return { error: null }
    }

    set({ organization: null })
    return { error: null }
  },

  fetchOrganizations: async (userId) => {
    const { data, error } = await supabase
      .from('memberships')
      .select('organization_id, organizations(*)')
      .eq('user_id', userId)
    if (error) return { error: error.message }
    const memberOrgs = data?.map(m => normalizeOrganization(m.organizations)).filter(Boolean) as Organization[] || []
    const { data: ownedOrgs, error: ownedOrgsError } = await supabase
      .from('organizations')
      .select('*')
      .eq('created_by', userId)

    if (ownedOrgsError) return { error: ownedOrgsError.message }

    const orgsById = new Map<string, Organization>()
    memberOrgs.forEach(org => orgsById.set(org.id, org))
    ;(ownedOrgs || []).forEach(org => orgsById.set(org.id, org))

    const orgs = Array.from(orgsById.values())
    set({ organizations: orgs })

    await Promise.all(
      (ownedOrgs || []).map(org =>
        supabase
          .from('memberships')
          .upsert(
            { organization_id: org.id, user_id: userId, role: 'admin' },
            { onConflict: 'organization_id,user_id' }
          )
      )
    )

    return { error: null }
  },

  switchOrganization: async (orgId) => {
    const org = get().organizations.find(o => o.id === orgId)
    if (org) {
      set({ organization: org })
    }
  },

  joinByOrgCode: async (orgCode) => {
    const { user } = get()
    if (!user) return { error: 'Not authenticated' }
    
    try {
      // Find org by code
      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .select('*')
        .eq('org_code', orgCode.toUpperCase())
        .single()
      
      if (orgError || !org) return { error: 'Organization code not found' }
      
      // Check if already a member
      const { data: existing } = await supabase
        .from('memberships')
        .select('id')
        .eq('organization_id', org.id)
        .eq('user_id', user.id)
        .single()
      
      if (existing) return { error: 'You are already a member of this organization', orgId: org.id }
      
      // Create membership as employee
      const { error: memberError } = await supabase
        .from('memberships')
        .insert({ organization_id: org.id, user_id: user.id, role: 'employee' })
      
      if (memberError) return { error: memberError.message }
      
      // Fetch updated organizations
      await get().fetchOrganizations(user.id)
      set({ organization: org })
      
      return { error: null, orgId: org.id }
    } catch (e: any) {
      return { error: e.message }
    }
  },

  initialize: async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.user) {
      const profileResult = await get().fetchProfile(session.user.id)
      if (profileResult.error) {
        get().hydrateFallbackUser(session.user)
      }
      await get().fetchOrganizations(session.user.id)
      await get().fetchOrganization(session.user.id)
    }
    set({ initialized: true })

    supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        set({ user: null, organization: null, organizations: [] })
      } else if (session?.user) {
        const profileResult = await get().fetchProfile(session.user.id)
        if (profileResult.error) {
          get().hydrateFallbackUser(session.user)
        }
        await get().fetchOrganizations(session.user.id)
        await get().fetchOrganization(session.user.id)
      }
    })
  },
}))
