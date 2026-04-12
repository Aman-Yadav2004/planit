type Priority = 'low' | 'medium' | 'high' | 'urgent'
type Stage = 'lead' | 'contacted' | 'qualified' | 'proposal' | 'converted' | 'lost'

const priorityConfig: Record<Priority, { label: string; className: string }> = {
  low:    { label: 'Low',    className: 'bg-slate-500/20 text-slate-300 border border-slate-500/20' },
  medium: { label: 'Medium', className: 'bg-amber-500/20 text-amber-300 border border-amber-500/20' },
  high:   { label: 'High',   className: 'bg-orange-500/20 text-orange-300 border border-orange-500/20' },
  urgent: { label: 'Urgent', className: 'bg-red-500/20 text-red-300 border border-red-500/20' },
}

const stageConfig: Record<Stage, { label: string; className: string }> = {
  lead:      { label: 'Lead',      className: 'bg-slate-500/20 text-slate-300' },
  contacted: { label: 'Contacted', className: 'bg-blue-500/20 text-blue-300' },
  qualified: { label: 'Qualified', className: 'bg-violet-500/20 text-violet-300' },
  proposal:  { label: 'Proposal',  className: 'bg-amber-500/20 text-amber-300' },
  converted: { label: 'Converted', className: 'bg-emerald-500/20 text-emerald-300' },
  lost:      { label: 'Lost',      className: 'bg-red-500/20 text-red-300' },
}

export function PriorityBadge({ priority }: { priority: Priority }) {
  const config = priorityConfig[priority]
  return <span className={`badge ${config.className}`}>{config.label}</span>
}

export function StageBadge({ stage }: { stage: Stage }) {
  const config = stageConfig[stage]
  return <span className={`badge ${config.className}`}>{config.label}</span>
}

export function StatusDot({ online }: { online: boolean }) {
  return (
    <span className={`inline-block w-2 h-2 rounded-full ${online ? 'bg-emerald-400' : 'bg-white/20'}`} />
  )
}
