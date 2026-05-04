import { useState, useEffect } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { supabase } from '../lib/supabase'
import { toast, ToastContainer } from '../components/ui/Toast'
import { LoadingScreen } from '../components/ui/LoadingScreen'
import { AlertCircle, CheckCircle, Loader2 } from 'lucide-react'

export function JoinOrgPage() {
  const navigate = useNavigate()
  const { user, initialize } = useAuthStore()
  const [searchParams] = useSearchParams()
  const { orgId } = useParams<{ orgId: string }>()

  const [loading, setLoading] = useState(true)
  const [joining, setJoining] = useState(false)
  const [status, setStatus] = useState<'loading' | 'valid' | 'invalid' | 'success' | 'already-member'>(
    'loading',
  )
  const [orgName, setOrgName] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [role, setRole] = useState<'admin' | 'employee'>('employee')

  const token = searchParams.get('token')

  useEffect(() => {
    const validateInvitation = async () => {
      try {
        // Wait for auth to initialize
        if (!user) {
          setLoading(false)
          setStatus('invalid')
          return
        }

        if (!token || !orgId) {
          setStatus('invalid')
          setLoading(false)
          return
        }

        // Check if user is already a member
        const { data: existingMember } = await supabase
          .from('memberships')
          .select('id')
          .eq('organization_id', orgId)
          .eq('user_id', user.id)
          .single()

        if (existingMember) {
          setStatus('already-member')
          setLoading(false)
          return
        }

        // Validate invitation token
        const { data: invitation, error } = await supabase
          .from('invitations')
          .select('*')
          .eq('token', token)
          .eq('organization_id', orgId)
          .eq('accepted', false)
          .single()

        if (error || !invitation) {
          setStatus('invalid')
          setLoading(false)
          return
        }

        // Check if invitation is expired
        if (new Date(invitation.expires_at) < new Date()) {
          setStatus('invalid')
          setLoading(false)
          return
        }

        // Check if email matches
        if (invitation.email !== user.email) {
          setStatus('invalid')
          setLoading(false)
          return
        }

        // Fetch org details
        const { data: org } = await supabase
          .from('organizations')
          .select('name')
          .eq('id', orgId)
          .single()

        if (org) {
          setOrgName(org.name)
          setInviteEmail(invitation.email)
          setRole(invitation.role)
        }

        setStatus('valid')
      } catch (error) {
        console.error('Error validating invitation:', error)
        setStatus('invalid')
      } finally {
        setLoading(false)
      }
    }

    validateInvitation()
  }, [token, orgId, user])

  const handleJoinOrganization = async () => {
    if (!user || !token || !orgId) return

    setJoining(true)
    try {
      // Update invitation as accepted
      const { error: updateError } = await supabase
        .from('invitations')
        .update({ accepted: true, accepted_by: user.id, accepted_at: new Date().toISOString() })
        .eq('token', token)

      if (updateError) throw updateError

      // Create membership
      const { error: memberError } = await supabase
        .from('memberships')
        .insert({
          organization_id: orgId,
          user_id: user.id,
          role,
        })

      if (memberError) throw memberError

      // Refresh auth store
      await useAuthStore.getState().fetchOrganization(user.id)

      toast.success('Successfully joined organization!')
      setTimeout(() => navigate('/'), 1000)
    } catch (error: any) {
      console.error('Error joining organization:', error)
      toast.error(error.message || 'Failed to join organization')
    } finally {
      setJoining(false)
    }
  }

  if (loading) return <LoadingScreen />

  if (!user) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="bg-surface-dark rounded-xl border border-white/5 p-8 text-center">
            <AlertCircle size={48} className="mx-auto mb-4 text-red-400" />
            <h1 className="text-2xl font-bold text-white mb-2">Sign In Required</h1>
            <p className="text-white/60 mb-6">
              Please sign in to accept this organization invitation.
            </p>
            <button onClick={() => navigate('/auth')} className="btn-primary w-full">
              Go to Sign In
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (status === 'invalid') {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="bg-surface-dark rounded-xl border border-white/5 p-8 text-center">
            <AlertCircle size={48} className="mx-auto mb-4 text-red-400" />
            <h1 className="text-2xl font-bold text-white mb-2">Invalid Invitation</h1>
            <p className="text-white/60 mb-6">
              This invitation is invalid, expired, or has already been used. Please ask your
              organization admin to send you a new invitation.
            </p>
            <button onClick={() => navigate('/')} className="btn-primary w-full">
              Go to Dashboard
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (status === 'already-member') {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="bg-surface-dark rounded-xl border border-white/5 p-8 text-center">
            <CheckCircle size={48} className="mx-auto mb-4 text-green-400" />
            <h1 className="text-2xl font-bold text-white mb-2">Already a Member</h1>
            <p className="text-white/60 mb-6">
              You are already a member of {orgName}. Redirecting you now...
            </p>
            <button onClick={() => navigate('/')} className="btn-primary w-full">
              Go to Dashboard
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-surface-dark rounded-xl border border-white/5 p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-brand-600 rounded-xl flex items-center justify-center mx-auto mb-4">
              <img src="/plant.svg" alt="" className="w-11 h-11" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Join Organization</h1>
            <p className="text-white/60">{orgName}</p>
          </div>

          <div className="space-y-4 mb-8 bg-surface rounded-lg p-4">
            <div>
              <p className="text-white/60 text-sm">Email</p>
              <p className="text-white font-medium">{inviteEmail}</p>
            </div>
            <div>
              <p className="text-white/60 text-sm">Role</p>
              <p className="text-white font-medium capitalize">{role}</p>
            </div>
          </div>

          <button
            onClick={handleJoinOrganization}
            disabled={joining}
            className="btn-primary w-full flex items-center justify-center gap-2 py-2.5 mb-3"
          >
            {joining && <Loader2 size={15} className="animate-spin" />}
            Accept Invitation
          </button>

          <button onClick={() => navigate('/auth')} className="btn-secondary w-full py-2.5">
            Cancel
          </button>

          <p className="text-white/40 text-xs text-center mt-4">
            By accepting, you agree to join {orgName} and collaborate with your team.
          </p>
        </div>
      </div>
      <ToastContainer />
    </div>
  )
}
