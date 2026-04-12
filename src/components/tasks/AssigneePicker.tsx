import { useMemo, useState } from 'react'
import { Check, ChevronDown, Clock3, Search, UserRound } from 'lucide-react'

export interface AssigneeOption {
  id: string
  value: string
  label: string
  secondary: string
  status: 'member' | 'invited'
  disabled?: boolean
}

interface AssigneePickerProps {
  options: AssigneeOption[]
  selectedValue: string | null
  onChange: (value: string | null) => void
}

export function AssigneePicker({ options, selectedValue, onChange }: AssigneePickerProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')

  const selected = options.find(option => option.value === selectedValue) || null

  const filteredOptions = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return options

    return options.filter(option =>
      option.label.toLowerCase().includes(query) ||
      option.secondary.toLowerCase().includes(query)
    )
  }, [options, search])

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(prev => !prev)}
        className="input w-full flex items-center justify-between gap-3 text-left"
      >
        <div className="min-w-0">
          {selected ? (
            <>
              <div className="text-sm text-white truncate">{selected.label}</div>
              <div className="text-xs text-white/40 truncate">{selected.secondary}</div>
            </>
          ) : (
            <div className="text-sm text-white/40">Search and assign a teammate</div>
          )}
        </div>
        <ChevronDown size={16} className={`text-white/30 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute z-30 mt-2 w-full rounded-2xl border border-white/10 bg-surface-1 shadow-2xl overflow-hidden">
          <div className="p-3 border-b border-white/5">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by name or email"
                className="input pl-9"
                autoFocus
              />
            </div>
          </div>

          <div className="max-h-64 overflow-y-auto p-2 space-y-1">
            <button
              type="button"
              onClick={() => {
                onChange(null)
                setOpen(false)
                setSearch('')
              }}
              className="w-full rounded-xl px-3 py-2 text-left hover:bg-white/5 transition-colors"
            >
              <div className="text-sm text-white">Unassigned</div>
              <div className="text-xs text-white/40">No assignee selected</div>
            </button>

            {filteredOptions.length === 0 ? (
              <div className="px-3 py-5 text-center text-sm text-white/30">No matching people found</div>
            ) : (
              filteredOptions.map(option => (
                <button
                  key={option.id}
                  type="button"
                  disabled={option.disabled}
                  onClick={() => {
                    if (option.disabled) return
                    onChange(option.value)
                    setOpen(false)
                    setSearch('')
                  }}
                  className={`w-full rounded-xl px-3 py-2 text-left transition-colors ${
                    option.disabled ? 'opacity-55 cursor-not-allowed' : 'hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`mt-0.5 rounded-lg p-1.5 ${
                      option.status === 'member' ? 'bg-brand-500/15 text-brand-300' : 'bg-amber-500/15 text-amber-300'
                    }`}>
                      {option.status === 'member' ? <UserRound size={13} /> : <Clock3 size={13} />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-white truncate">{option.label}</span>
                        {selectedValue === option.value && <Check size={13} className="text-emerald-400 flex-shrink-0" />}
                      </div>
                      <div className="text-xs text-white/40 truncate">{option.secondary}</div>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
