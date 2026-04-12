import { useState, useEffect } from 'react'
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
} from 'lucide-react'

export function ProfilePage() {
  const { user, organization, signOut } = useAuthStore()
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
  const [userRole, setUserRole] = useState<'admin' | 'employee' | null>(null)
  const [roleLoading, setRoleLoading] = useState(true)

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
      setMembers(data || [])
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
      
      // Show success with link to copy
      toast.success(`Invitation created for ${inviteEmail}!`)
      
      // Copy link to clipboard automatically
      navigator.clipboard.writeText(inviteLink)
      toast.info('Invite link copied to clipboard - share it with them')

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

  const copyToClipboard = (token: string) => {
    const link = `${window.location.origin}/join-org/${organization?.id}?token=${token}`
    navigator.clipboard.writeText(link)
    setCopiedToken(token)
    setTimeout(() => setCopiedToken(null), 2000)
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
                src={profile?.avatar_url}
                name={profile?.full_name || profile?.email}
                size={80}
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
                      <div className="flex items-center gap-3 flex-1">
                        <Avatar
                          src={
                            membership.profile?.[0]?.avatar_url ||
                            (membership.profile as any)?.avatar_url
                          }
                          name={
                            membership.profile?.[0]?.full_name ||
                            (membership.profile as any)?.full_name
                          }
                          size={40}
                        />
                        <div className="flex-1">
                          <p className="text-white font-medium">
                            {membership.profile?.[0]?.full_name ||
                              (membership.profile as any)?.full_name ||
                              'Unknown'}
                          </p>
                          <p className="text-white/40 text-sm">
                            {membership.profile?.[0]?.email || (membership.profile as any)?.email}
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
