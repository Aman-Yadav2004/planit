import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { supabase } from '../lib/supabase'
import { toast, ToastContainer } from '../components/ui/Toast'
import { Modal } from '../components/ui/Modal'
import { Avatar } from '../components/ui/Avatar'
import { LoadingScreen } from '../components/ui/LoadingScreen'
import type { Profile, Membership, Invitation } from '../types/supabase'
import {
  User,
  Mail,
  Phone,
  LogOut,
  Share2,
  Trash2,
  Copy,
  Check,
  Loader2,
  UserPlus,
  Crown,
  Building2,
} from 'lucide-react'

export function ProfilePage() {
  const { user, organization, signOut, fetchOrganizations, switchOrganization } = useAuthStore()
  const navigate = useNavigate()
  const [profile, setProfile] = useState<Profile | null>(user)
  const [loading, setLoading] = useState(false)
  const [fullName, setFullName] = useState(user?.full_name || '')
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url || '')
  const [members, setMembers] = useState<(Membership & { profile?: Profile })[]>([])
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [membersLoading, setMembersLoading] = useState(true)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'admin' | 'employee'>('employee')
  const [inviteLoading, setInviteLoading] = useState(false)
  const [copiedToken, setCopiedToken] = useState<string | null>(null)
  const [copiedOrgCode, setCopiedOrgCode] = useState(false)
  const [userRole, setUserRole] = useState<'admin' | 'employee' | null>(null)
  const [roleLoading, setRoleLoading] = useState(true)
  const [showJoinModal, setShowJoinModal] = useState(false)
  const [joinCode, setJoinCode] = useState('')
  const [joiningOrg, setJoiningOrg] = useState(false)

  const getMemberProfile = (membership: Membership & { profile?: Profile | Profile[] }) =>
    Array.isArray(membership.profile) ? membership.profile[0] : membership.profile

  useEffect(() => {
    if (organization) {
      setRoleLoading(true)
      fetchMembers()
      fetchInvitations()
      fetchUserRole().then(role => {
        setRoleLoading(false)
      })
    }
  }, [organization?.id])

  const fetchMembers = async () => {
    if (!organization) return
    setMembersLoading(true)
    try {
      const { data, error } = await supabase
        .from('memberships')
        .select(`
          *,
          profile:user_id(*)
        `)
        .eq('organization_id', organization.id)

      if (error) throw error
      setMembers((data || []) as any)
    } catch (error: any) {
      console.error('Members fetch error:', error.message)
    } finally {
      setMembersLoading(false)
    }
  }

  const fetchInvitations = async () => {
    if (!organization) return
    try {
      const { data, error } = await supabase
        .from('invitations')
        .select('*')
        .eq('organization_id', organization.id)
        .eq('accepted', false)

      if (error) throw error
      setInvitations(data || [])
    } catch (error: any) {
      console.error('Invitations fetch error:', error.message)
    }
  }

  const fetchUserRole = async () => {
    if (!user || !organization) return
    try {
      const { data, error } = await supabase
        .from('memberships')
        .select('role')
        .eq('organization_id', organization.id)
        .eq('user_id', user.id)
        .single()

      if (error) throw error
      const role = data?.role as 'admin' | 'employee'
      setUserRole(role)
      return role
    } catch (error: any) {
      console.error('Failed to fetch user role:', error)
      // Default to employee if fetch fails
      setUserRole('employee')
      return 'employee'
    }
  }

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    setLoading(true)
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: fullName, avatar_url: avatarUrl })
        .eq('id', user.id)

      if (error) throw error
      setProfile({ ...profile!, full_name: fullName, avatar_url: avatarUrl })
      toast.success('Profile updated!')
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleInviteUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!organization || !user) return
    setInviteLoading(true)
    try {
      // Generate unique token
      const token = Math.random().toString(36).substring(2, 15) + Date.now().toString(36)

      const { data: newInvitation, error } = await supabase.from('invitations').insert({
        organization_id: organization.id,
        email: inviteEmail,
        role: inviteRole,
        invited_by: user.id,
        token,
      }).select().single()

      if (error) {
        console.error('Insert error:', error)
        if (error.message.includes('duplicate')) {
          throw new Error('This email has already been invited')
        }
        throw error
      }

      // Create invitation link
      const inviteLink = `${window.location.origin}/join-org/${organization.id}?token=${token}`
      
      console.log('Invitation created:', { inviteEmail, token, inviteLink })

      // Try to send email via Edge Function, but don't fail if it doesn't work
      try {
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-invitation-email`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token || ''}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              email: inviteEmail,
              inviteLink,
              orgName: organization.name,
              role: inviteRole,
              invitedByName: user.full_name || user.email,
            }),
          }
        )

        if (response.ok) {
          toast.success(`Invitation sent to ${inviteEmail}!`)
        } else {
          toast.info(`Invitation created - Share link: ${inviteLink}`)
        }
      } catch (emailError) {
        console.log('Email function unavailable, invitation link ready to share')
        toast.info(`Invitation created - Share link: ${inviteLink}`)
      }
      
      setInviteEmail('')
      setInviteRole('employee')
      setShowInviteModal(false)
      await fetchInvitations()
      await fetchMembers()
    } catch (error: any) {
      console.error('Error inviting user:', error)
      toast.error(error.message || 'Failed to send invitation')
    } finally {
      setInviteLoading(false)
    }
  }

  const handleDeleteInvitation = async (invitationId: string) => {
    try {
      const { error } = await supabase
        .from('invitations')
        .delete()
        .eq('id', invitationId)

      if (error) throw error
      toast.success('Invitation deleted')
      await fetchInvitations()
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm('Are you sure you want to remove this member?')) return
    try {
      const { error } = await supabase.from('memberships').delete().eq('id', memberId)

      if (error) throw error
      toast.success('Member removed')
      await fetchMembers()
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  const handleChangeRole = async (memberId: string, newRole: 'admin' | 'employee') => {
    try {
      const { error } = await supabase
        .from('memberships')
        .update({ role: newRole })
        .eq('id', memberId)

      if (error) throw error
      toast.success('Role updated')
      await fetchMembers()
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  const handleSignOut = async () => {
    await signOut()
  }

  const handleLeaveOrg = async () => {
    if (!organization || !user) return
    if (!confirm(`Leave "${organization.name}"? You'll need the org code to rejoin.`)) return
    try {
      const { error } = await supabase
        .from('memberships')
        .delete()
        .eq('organization_id', organization.id)
        .eq('user_id', user.id)

      if (error) throw error

      toast.success('Left organization')
      await fetchOrganizations(user.id)
      navigate('/onboarding')
    } catch (error: any) {
      toast.error(error.message || 'Failed to leave organization')
    }
  }

  const handleJoinOrg = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    setJoiningOrg(true)
    try {
      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .select('*')
        .eq('org_code', joinCode.toUpperCase())
        .single()

      if (orgError || !org) {
        toast.error('Organization code not found')
        return
      }

      const { data: existing } = await supabase
        .from('memberships')
        .select('id')
        .eq('organization_id', org.id)
        .eq('user_id', user.id)
        .maybeSingle()

      if (existing) {
        toast.info('You are already a member of this organization')
        setJoinCode('')
        setShowJoinModal(false)
        return
      }

      const { error: memberError } = await supabase
        .from('memberships')
        .insert({ organization_id: org.id, user_id: user.id, role: 'employee' })

      if (memberError) throw memberError

      toast.success(`Joined "${org.name}"!`)
      setJoinCode('')
      setShowJoinModal(false)
      await fetchOrganizations(user.id)
      switchOrganization(org.id)
    } catch (error: any) {
      toast.error(error.message || 'Failed to join organization')
    } finally {
      setJoiningOrg(false)
    }
  }

  const copyToClipboard = (token: string) => {
    const link = `${window.location.origin}/join-org/${organization?.id}?token=${token}`
    navigator.clipboard.writeText(link)
    setCopiedToken(token)
    setTimeout(() => setCopiedToken(null), 2000)
  }

  const copyOrgCode = () => {
    if (!organization?.org_code) return
    navigator.clipboard.writeText(organization.org_code)
    setCopiedOrgCode(true)
    setTimeout(() => setCopiedOrgCode(false), 2000)
  }

  const isAdmin = userRole === 'admin'

  if (!user) return <LoadingScreen />

  return (
    <div className="min-h-screen bg-surface">
      {/* Header */}
      <div className="bg-surface-dark border-b border-white/5">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <Avatar
                url={profile?.avatar_url}
                name={profile?.full_name || profile?.email}
                size="lg"
              />
              <div>
                <h1 className="text-3xl font-bold text-white">{profile?.full_name || 'User'}</h1>
                <p className="text-white/60">{profile?.email}</p>
                {organization && <p className="text-white/40 text-sm mt-1">{organization.name}</p>}
              </div>
            </div>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition"
            >
              <LogOut size={18} />
              Sign out
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Profile Section */}
          <div className="lg:col-span-1">
            <div className="bg-surface-dark rounded-xl border border-white/5 p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Edit Profile</h2>

              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <div>
                  <label className="block text-sm text-white/60 mb-1.5">Full Name</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="input"
                    placeholder="Your name"
                  />
                </div>

                <div>
                  <label className="block text-sm text-white/60 mb-1.5">Avatar URL</label>
                  <input
                    type="url"
                    value={avatarUrl}
                    onChange={(e) => setAvatarUrl(e.target.value)}
                    className="input"
                    placeholder="https://example.com/avatar.jpg"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full flex items-center justify-center gap-2 py-2.5"
                >
                  {loading && <Loader2 size={15} className="animate-spin" />}
                  Save Changes
                </button>
              </form>
            </div>
          </div>

          {/* Organization Management */}
          <div className="lg:col-span-2 space-y-8">
            {organization && (
              <div className="bg-surface-dark rounded-xl border border-white/5 p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-10 h-10 bg-brand-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Building2 size={20} className="text-brand-300" />
                    </div>
                    <div className="min-w-0">
                      <h2 className="text-lg font-semibold text-white">Organization</h2>
                      <p className="text-white/40 text-sm truncate">{organization.name}</p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-white/40 text-xs mb-1">Organization Code</p>
                    <button
                      type="button"
                      onClick={copyOrgCode}
                      className="inline-flex items-center gap-2 bg-surface border border-white/10 hover:border-brand-500/40 rounded-lg px-3 py-2 transition"
                      title="Copy organization code"
                    >
                      <span className="text-brand-300 font-semibold tracking-widest">
                        {organization.org_code || 'Unavailable'}
                      </span>
                      {copiedOrgCode ? (
                        <Check size={15} className="text-green-400" />
                      ) : (
                        <Copy size={15} className="text-white/50" />
                      )}
                    </button>
                    <div className="mt-3 space-x-2">
                      <button
                        type="button"
                        onClick={() => setShowJoinModal(true)}
                        className="inline-flex items-center gap-2 bg-surface border border-white/10 hover:border-brand-500/40 rounded-lg px-3 py-2 transition text-sm"
                      >
                        <UserPlus size={14} /> Join Organization
                      </button>
                      <button
                        type="button"
                        onClick={handleLeaveOrg}
                        className="inline-flex items-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg px-3 py-2 transition text-sm"
                      >
                        <Trash2 size={14} /> Leave Organization
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Join Organization Modal */}
            <Modal open={showJoinModal} onClose={() => setShowJoinModal(false)} title="Join Organization">
              <form onSubmit={handleJoinOrg} className="space-y-4">
                <div>
                  <label className="block text-sm text-white/60 mb-1.5">Organization Code</label>
                  <input
                    type="text"
                    value={joinCode.toUpperCase()}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase().slice(0, 8))}
                    placeholder="ABC12345"
                    className="input text-center text-lg tracking-widest font-semibold"
                    required
                    maxLength={8}
                    autoFocus
                  />
                  <p className="text-white/40 text-xs mt-2">Ask your organization administrator for the code</p>
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setJoinCode('')
                      setShowJoinModal(false)
                    }}
                    className="btn-secondary px-4 py-2"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={joiningOrg || joinCode.length !== 8}
                    className="btn-primary px-4 py-2 flex items-center gap-2"
                  >
                    {joiningOrg ? 'Joining...' : 'Join'}
                  </button>
                </div>
              </form>
            </Modal>

            {/* Members Section */}
            <div className="bg-surface-dark rounded-xl border border-white/5 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-white">Team Members</h2>
                {!roleLoading && isAdmin && (
                  <button
                    onClick={() => setShowInviteModal(true)}
                    className="flex items-center gap-2 px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white rounded-lg transition text-sm"
                  >
                    <UserPlus size={16} />
                    Invite
                  </button>
                )}
                {roleLoading && (
                  <div className="text-white/40 text-sm flex items-center gap-2">
                    <Loader2 size={14} className="animate-spin" />
                    Loading...
                  </div>
                )}
              </div>

              {membersLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 size={20} className="animate-spin text-white/40" />
                </div>
              ) : (
                <div className="space-y-3">
                  {members.map((membership) => (
                    <div
                      key={membership.id}
                      className="flex items-center justify-between p-3 bg-surface rounded-lg hover:bg-white/2 transition"
                    >
                      {(() => {
                        const memberProfile = getMemberProfile(membership as Membership & { profile?: Profile | Profile[] })

                        return (
                      <div className="flex items-center gap-3 flex-1">
                        <Avatar
                          url={memberProfile?.avatar_url}
                          name={memberProfile?.full_name || memberProfile?.email}
                          size="md"
                        />
                        <div className="flex-1">
                          <p className="text-white font-medium">
                            {memberProfile?.full_name || 'Unknown'}
                          </p>
                          <p className="text-white/40 text-sm">
                            {memberProfile?.email}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {membership.role === 'admin' && (
                            <Crown size={16} className="text-yellow-400" />
                          )}
                          <span className="px-2 py-1 bg-brand-500/20 text-brand-300 rounded text-xs font-medium capitalize">
                            {membership.role}
                          </span>
                        </div>
                      </div>
                        )
                      })()}

                      {isAdmin && membership.user_id !== user.id && (
                        <div className="flex items-center gap-2">
                          <select
                            value={membership.role}
                            onChange={(e) =>
                              handleChangeRole(membership.id, e.target.value as 'admin' | 'employee')
                            }
                            className="bg-surface border border-white/10 text-white text-sm rounded px-2 py-1"
                          >
                            <option value="employee">Employee</option>
                            <option value="admin">Admin</option>
                          </select>
                          <button
                            onClick={() => handleRemoveMember(membership.id)}
                            className="p-1.5 hover:bg-red-500/20 rounded transition"
                          >
                            <Trash2 size={16} className="text-red-400" />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Invitations Section */}
            {invitations.length > 0 && (
              <div className="bg-surface-dark rounded-xl border border-white/5 p-6">
                <h2 className="text-lg font-semibold text-white mb-6">Pending Invitations</h2>
                <div className="space-y-3">
                  {invitations.map((invitation) => (
                    <div
                      key={invitation.id}
                      className="flex items-center justify-between p-3 bg-surface rounded-lg"
                    >
                      <div className="flex-1">
                        <p className="text-white font-medium">{invitation.email}</p>
                        <p className="text-white/40 text-sm capitalize">
                          Role: {invitation.role} • Expires:{' '}
                          {new Date(invitation.expires_at).toLocaleDateString()}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => copyToClipboard(invitation.token)}
                          className="p-1.5 hover:bg-blue-500/20 rounded transition"
                          title="Copy invitation link"
                        >
                          {copiedToken === invitation.token ? (
                            <Check size={16} className="text-green-400" />
                          ) : (
                            <Copy size={16} className="text-blue-400" />
                          )}
                        </button>
                        {isAdmin && (
                          <button
                            onClick={() => handleDeleteInvitation(invitation.id)}
                            className="p-1.5 hover:bg-red-500/20 rounded transition"
                          >
                            <Trash2 size={16} className="text-red-400" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Invite Modal */}
      <Modal 
        open={showInviteModal}
        title="Invite Team Member" 
        onClose={() => setShowInviteModal(false)}
      >
        <form onSubmit={handleInviteUser} className="space-y-4">
            <div>
              <label className="block text-sm text-white/60 mb-1.5">Email Address</label>
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="colleague@example.com"
                className="input"
                required
              />
            </div>

            <div>
              <label className="block text-sm text-white/60 mb-1.5">Role</label>
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as 'admin' | 'employee')}
                className="input"
              >
                <option value="employee">Employee</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={() => setShowInviteModal(false)}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
              <button type="submit" disabled={inviteLoading} className="btn-primary flex-1">
                {inviteLoading ? <Loader2 size={15} className="animate-spin mx-auto" /> : 'Send Invite'}
              </button>
            </div>
          </form>
        </Modal>

      <ToastContainer />
    </div>
  )
}
