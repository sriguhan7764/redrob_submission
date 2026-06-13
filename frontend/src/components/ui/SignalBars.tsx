interface SignalBarsProps {
  signals: { label: string; value: number; max?: number }[]
  compact?: boolean
}

function barColor(v: number) {
  if (v >= 0.75) return 'bg-emerald-500'
  if (v >= 0.5) return 'bg-amber-400'
  return 'bg-red-400'
}

export default function SignalBars({ signals, compact = false }: SignalBarsProps) {
  return (
    <div className={`grid gap-1.5 ${compact ? 'grid-cols-2' : 'grid-cols-1'}`}>
      {signals.map(s => {
        const pct = Math.round((s.value / (s.max ?? 1)) * 100)
        return (
          <div key={s.label}>
            <div className="flex justify-between items-center mb-0.5">
              <span className="text-[10px] text-secondary truncate">{s.label}</span>
              <span className="text-[10px] font-bold text-on-surface ml-2 shrink-0">{pct}%</span>
            </div>
            <div className="h-1 rounded-full bg-surface-container overflow-hidden">
              <div className={`h-full rounded-full transition-all ${barColor(s.value)}`} style={{ width: `${pct}%` }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}
