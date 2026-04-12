import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'
import { toast } from '../components/ui/Toast'
import { ToastContainer } from '../components/ui/Toast'
import { Building2, Loader2 } from 'lucide-react'

export function OnboardingPage() {
  const [orgName, setOrgName] = useState('')
  const [loading, setLoading] = useState(false)
  const { user, fetchOrganization } = useAuthStore()
  const navigate = useNavigate()

  const handleCreate = async (e: React.FormEvent) => {
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

      const { error: memberError } = await supabase
        .from('memberships')
        .insert({ organization_id: org.id, user_id: user.id, role: 'admin' })
      if (memberError) throw memberError

      await fetchOrganization(user.id)
      toast.success('Organization created!')
      navigate('/')
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-8">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-3 mb-10">
          <div className="w-10 h-10 bg-brand-600 rounded-xl flex items-center justify-center text-xl">🪐</div>
          <span className="font-bold text-xl">PLAN-IT</span>
        </div>

        <h1 className="text-2xl font-bold text-white mb-2">Set up your workspace</h1>
        <p className="text-white/40 text-sm mb-8">Create an organization to get started with your team.</p>

        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-sm text-white/60 mb-1.5">Organization Name</label>
            <div className="relative">
              <Building2 size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
              <input
                type="text"
                value={orgName}
                onChange={e => setOrgName(e.target.value)}
                placeholder="Acme Corp"
                className="input pl-9"
                required
              />
            </div>
          </div>
          <button type="submit" disabled={loading || !orgName.trim()} className="btn-primary w-full flex items-center justify-center gap-2 py-2.5">
            {loading && <Loader2 size={15} className="animate-spin" />}
            Create Organization
          </button>
        </form>
      </div>
      <ToastContainer />
    </div>
  )
}
