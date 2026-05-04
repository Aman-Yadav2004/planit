import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'
import { toast } from '../components/ui/Toast'
import { ToastContainer } from '../components/ui/Toast'
import { Building2, Loader2, Users, ChevronRight, Copy, Check } from 'lucide-react'

export function OnboardingPage() {
  const [step, setStep] = useState<'type' | 'create' | 'join' | 'success'>('type')
  const [orgName, setOrgName] = useState('')
  const [orgCode, setOrgCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [orgType, setOrgType] = useState<'solo' | 'team'>('solo')
  const [userRole, setUserRole] = useState<'admin' | 'employee'>('admin')
  const [createdOrgCode, setCreatedOrgCode] = useState<string>('')
  const [copied, setCopied] = useState(false)
  const { user, fetchOrganizations, fetchOrganization, setOrganization } = useAuthStore()
  const navigate = useNavigate()

  const handleCreateOrganization = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    setLoading(true)
    try {
      const slug = orgName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .insert({ name: orgName, slug: `${slug}-${Date.now()}`, created_by: user.id })
        .select()
        .single()

      if (orgError) throw orgError

      // Create membership with selected role
      const { error: memberError } = await supabase.from('memberships').insert({
        organization_id: org.id,
        user_id: user.id,
        role: userRole,
      })

      if (memberError) throw memberError

      setOrganization(org)
      await fetchOrganizations(user.id)

      // Display the org code for sharing
      if (org.org_code) {
        setCreatedOrgCode(org.org_code)
        setStep('success')
      } else {
        await fetchOrganization(user.id)
        navigate('/')
      }
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setLoading(false)
    }
  }

  const handleJoinByCode = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    setLoading(true)
    try {
      const result = await useAuthStore.getState().joinByOrgCode(orgCode)
      if (result.error) {
        if (result.error === 'You are already a member of this organization') {
          toast.info(result.error)
          await fetchOrganization(user.id)
          navigate('/')
        } else {
          toast.error(result.error)
        }
      } else {
        toast.success('Successfully joined organization!')
        navigate('/')
      }
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-8">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-3 mb-10">
          <div className="w-10 h-10 bg-brand-600 rounded-xl flex items-center justify-center">
            <img src="/plant.svg" alt="" className="w-7 h-7" />
          </div>
          <span className="font-bold text-xl text-white">PLAN-IT</span>
        </div>

        {step === 'type' && (
          <div>
            <h1 className="text-2xl font-bold text-white mb-2">Set up your workspace</h1>
            <p className="text-white/40 text-sm mb-8">
              Choose how you want to get started with PLAN-IT.
            </p>

            <div className="space-y-3">
              <button
                onClick={() => {
                  setOrgType('solo')
                  setUserRole('admin')
                  setStep('create')
                }}
                className="w-full p-4 bg-surface-dark hover:bg-surface-dark/80 border border-white/10 hover:border-brand-500/50 rounded-lg transition text-left group"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-white mb-1 group-hover:text-brand-400 transition">
                      Create Your Organization
                    </h3>
                    <p className="text-white/60 text-sm">Start fresh with your own workspace</p>
                  </div>
                  <ChevronRight size={20} className="text-white/40 group-hover:text-brand-400 transition mt-1" />
                </div>
              </button>

              <button
                onClick={() => {
                  setOrgType('team')
                  setStep('join')
                }}
                className="w-full p-4 bg-surface-dark hover:bg-surface-dark/80 border border-white/10 hover:border-brand-500/50 rounded-lg transition text-left group"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-white mb-1 group-hover:text-brand-400 transition">
                      Join an Organization
                    </h3>
                    <p className="text-white/60 text-sm">Enter your organization code</p>
                  </div>
                  <ChevronRight size={20} className="text-white/40 group-hover:text-brand-400 transition mt-1" />
                </div>
              </button>
            </div>
          </div>
        )}

        {step === 'create' && orgType === 'solo' && (
          <div>
            <button onClick={() => setStep('type')} className="text-white/60 hover:text-white text-sm flex items-center gap-1 mb-6">
              ← Back
            </button>

            <h1 className="text-2xl font-bold text-white mb-2">Create your organization</h1>
            <p className="text-white/40 text-sm mb-8">
              Customize your workspace by creating an organization.
            </p>

            <form onSubmit={handleCreateOrganization} className="space-y-6">
              <div>
                <label className="block text-sm text-white/60 mb-1.5">Organization Name</label>
                <div className="relative">
                  <Building2 size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                  <input
                    type="text"
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    placeholder="Acme Corp"
                    className="input pl-9"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-white/60 mb-1.5">Your Role</label>
                <div className="space-y-2">
                  <label className="flex items-center gap-3 p-3 bg-surface-dark hover:bg-surface-dark/80 border border-white/10 rounded-lg cursor-pointer w-full transition">
                    <input
                      type="radio"
                      value="admin"
                      checked={userRole === 'admin'}
                      onChange={(e) => setUserRole(e.target.value as 'admin')}
                      className="w-4 h-4"
                    />
                    <div className="flex-1">
                      <p className="font-medium text-white">Admin</p>
                      <p className="text-white/40 text-xs">Full control and team management</p>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-3 bg-surface-dark hover:bg-surface-dark/80 border border-white/10 rounded-lg cursor-pointer w-full transition">
                    <input
                      type="radio"
                      value="employee"
                      checked={userRole === 'employee'}
                      onChange={(e) => setUserRole(e.target.value as 'employee')}
                      className="w-4 h-4"
                    />
                    <div className="flex-1">
                      <p className="font-medium text-white">Employee</p>
                      <p className="text-white/40 text-xs">Collaborate on tasks and projects</p>
                    </div>
                  </label>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !orgName.trim()}
                className="btn-primary w-full flex items-center justify-center gap-2 py-2.5"
              >
                {loading && <Loader2 size={15} className="animate-spin" />}
                Create Organization
              </button>
            </form>
          </div>
        )}

        {step === 'join' && orgType === 'team' && (
          <div>
            <button onClick={() => setStep('type')} className="text-white/60 hover:text-white text-sm flex items-center gap-1 mb-6">
              ← Back
            </button>

            <h1 className="text-2xl font-bold text-white mb-2">Join an organization</h1>
            <p className="text-white/40 text-sm mb-8">
              Enter your organization code that was provided by your admin.
            </p>

            <form onSubmit={handleJoinByCode} className="space-y-6">
              <div>
                <label className="block text-sm text-white/60 mb-1.5">Organization Code</label>
                <input
                  type="text"
                  value={orgCode.toUpperCase()}
                  onChange={(e) => setOrgCode(e.target.value.toUpperCase().slice(0, 8))}
                  placeholder="ABC12345"
                  className="input text-center text-lg tracking-widest font-semibold"
                  required
                  maxLength={8}
                />
                <p className="text-white/40 text-xs mt-2">Ask your organization administrator for the code</p>
              </div>

              <button
                type="submit"
                disabled={loading || orgCode.length !== 8}
                className="btn-primary w-full flex items-center justify-center gap-2 py-2.5"
              >
                {loading && <Loader2 size={15} className="animate-spin" />}
                Join Organization
              </button>
            </form>
          </div>
        )}

        {step === 'success' && (
          <div>
            <div className="text-center">
              <div className="w-16 h-16 bg-brand-600 rounded-xl flex items-center justify-center text-4xl mx-auto mb-6">
                ✅
              </div>

              <h1 className="text-2xl font-bold text-white mb-2">Organization Created!</h1>
              <p className="text-white/60 text-sm mb-8">
                Share this code with your team to invite them.
              </p>

              <div className="bg-surface-dark border border-brand-500/30 rounded-lg p-6 mb-8">
                <p className="text-white/60 text-xs mb-2">Organization Code</p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 text-center">
                    <p className="text-3xl font-bold text-brand-400 tracking-widest">{createdOrgCode}</p>
                  </div>
                  <button
                    onClick={() => copyToClipboard(createdOrgCode)}
                    className="p-2 hover:bg-white/10 rounded transition"
                  >
                    {copied ? (
                      <Check size={20} className="text-green-400" />
                    ) : (
                      <Copy size={20} className="text-white/60" />
                    )}
                  </button>
                </div>
              </div>

              <button
                onClick={async () => {
                  await fetchOrganization(user?.id || '')
                  navigate('/')
                }}
                className="btn-primary w-full py-2.5"
              >
                Go to Dashboard
              </button>
            </div>
          </div>
        )}
      </div>
      <ToastContainer />
    </div>
  )
}
