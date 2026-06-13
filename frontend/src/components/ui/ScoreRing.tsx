import { scoreColor } from '@/lib/utils'

interface ScoreRingProps {
  score: number
  size?: number
  strokeWidth?: number
  label?: string
  showPercent?: boolean
}

export default function ScoreRing({ score, size = 52, strokeWidth = 4, label, showPercent = true }: ScoreRingProps) {
  const r = (size - strokeWidth) / 2
  const circ = 2 * Math.PI * r
  const pct = Math.max(0, Math.min(1, score))
  const dash = pct * circ
  const color = scoreColor(score)

  return (
    <div className="flex flex-col items-center gap-0.5">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e8e0e1" strokeWidth={strokeWidth} />
          <circle
            cx={size / 2} cy={size / 2} r={r}
            fill="none" stroke={color} strokeWidth={strokeWidth}
            strokeDasharray={`${dash} ${circ - dash}`}
            strokeLinecap="round"
          />
        </svg>
        {showPercent && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-[11px] font-bold" style={{ color }}>{Math.round(pct * 100)}</span>
          </div>
        )}
      </div>
      {label && <span className="text-[9px] text-secondary uppercase tracking-wide">{label}</span>}
    </div>
  )
}
