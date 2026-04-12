interface AvatarProps {
  name?: string | null
  url?: string | null
  size?: 'xs' | 'sm' | 'md' | 'lg'
  className?: string
}

const sizes = { xs: 'w-5 h-5 text-[10px]', sm: 'w-7 h-7 text-xs', md: 'w-9 h-9 text-sm', lg: 'w-12 h-12 text-base' }

const colors = [
  'bg-violet-600', 'bg-blue-600', 'bg-emerald-600', 'bg-amber-600',
  'bg-rose-600', 'bg-cyan-600', 'bg-pink-600', 'bg-indigo-600',
]

function getColor(name: string) {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return colors[Math.abs(hash) % colors.length]
}

export function Avatar({ name, url, size = 'md', className = '' }: AvatarProps) {
  const initials = name ? name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : '?'
  const bgColor = name ? getColor(name) : 'bg-surface-3'

  if (url) {
    return <img src={url} alt={name ?? ''} className={`${sizes[size]} rounded-full object-cover flex-shrink-0 ${className}`} />
  }

  return (
    <div className={`${sizes[size]} ${bgColor} rounded-full flex items-center justify-center font-semibold text-white flex-shrink-0 ${className}`}>
      {initials}
    </div>
  )
}
