export function LoadingScreen() {
  return (
    <div className="fixed inset-0 bg-surface flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <div className="w-12 h-12 rounded-full border-2 border-brand-600/30 border-t-brand-500 animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-brand-400 text-lg">🪐</span>
          </div>
        </div>
        <p className="text-white/40 text-sm font-mono">PLAN-IT loading...</p>
      </div>
    </div>
  )
}
