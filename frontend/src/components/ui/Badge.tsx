import { cn } from '@/lib/utils'

interface BadgeProps {
  children: React.ReactNode
  variant?: 'default' | 'open' | 'closed' | 'success' | 'warning' | 'danger'
  className?: string
}

const variants = {
  default: 'bg-surface-container text-secondary border-outline-variant',
  open: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  closed: 'bg-surface-container text-secondary border-outline-variant',
  success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  warning: 'bg-amber-50 text-amber-700 border-amber-200',
  danger: 'bg-red-50 text-red-700 border-red-200',
}

export default function Badge({ children, variant = 'default', className }: BadgeProps) {
  return (
    <span className={cn('inline-flex items-center px-1.5 py-0.5 rounded border text-[10px] font-semibold', variants[variant], className)}>
      {children}
    </span>
  )
}
