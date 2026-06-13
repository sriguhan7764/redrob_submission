import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { roleLabel, roleColor } from '@/lib/utils'

interface HeaderProps {
  title: string
  subtitle?: string
  actions?: React.ReactNode
}

export default function Header({ title, subtitle, actions }: HeaderProps) {
  const { user, logout } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const navigate = useNavigate()

  return (
    <header className="h-14 border-b border-outline-variant bg-surface-bright/80 backdrop-blur-sm sticky top-0 z-30 flex items-center px-6 gap-4">
      <div className="flex-1 min-w-0">
        <h1 className="text-sm font-bold text-primary truncate">{title}</h1>
        {subtitle && <p className="text-xs text-secondary truncate">{subtitle}</p>}
      </div>

      {actions && <div className="flex items-center gap-2">{actions}</div>}

      {/* Notifications */}
      <button className="w-8 h-8 flex items-center justify-center rounded hover:bg-surface-container transition-colors relative">
        <span className="ms text-[20px] text-secondary">notifications</span>
        <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500 border border-surface-bright"></span>
      </button>

      {/* User menu */}
      <div className="relative">
        <button
          onClick={() => setMenuOpen(o => !o)}
          className="flex items-center gap-2 px-2 py-1 rounded hover:bg-surface-container transition-colors"
        >
          <div className="w-7 h-7 rounded-full bg-surface-container-high border border-outline-variant flex items-center justify-center">
            <span className="text-xs font-bold text-secondary">{user?.avatar_initials || user?.full_name[0]}</span>
          </div>
          <div className="hidden sm:block text-left">
            <div className="text-xs font-semibold text-on-surface leading-none">{user?.full_name}</div>
            <div className={`text-[9px] font-bold mt-0.5 px-1 py-px rounded-sm border inline-block ${roleColor(user?.role ?? '')}`}>
              {roleLabel(user?.role ?? '')}
            </div>
          </div>
          <span className="ms text-[16px] text-secondary">expand_more</span>
        </button>

        {menuOpen && (
          <div className="absolute right-0 top-full mt-1 w-44 bg-surface-bright border border-outline-variant rounded-lg shadow-modal z-50">
            <div className="px-3 py-2 border-b border-outline-variant">
              <div className="text-xs font-semibold text-on-surface">{user?.full_name}</div>
              <div className="text-[11px] text-secondary truncate">{user?.email}</div>
            </div>
            <div className="py-1">
              <button onClick={() => { setMenuOpen(false); navigate('/settings') }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-secondary hover:bg-surface-container hover:text-on-surface transition-colors">
                <span className="ms text-[16px]">settings</span> Settings
              </button>
              <button onClick={() => { setMenuOpen(false); logout() }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors">
                <span className="ms text-[16px]">logout</span> Log out
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  )
}
