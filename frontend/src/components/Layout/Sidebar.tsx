import { NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { cn } from '@/lib/utils'

const NAV = [
  { to: '/dashboard', icon: 'dashboard', label: 'Dashboard', roles: ['admin', 'recruiter', 'hiring_manager'] },
  { to: '/candidates', icon: 'person_search', label: 'Candidates', roles: ['admin', 'recruiter', 'hiring_manager'] },
  { to: '/compare', icon: 'compare_arrows', label: 'Compare', roles: ['admin', 'recruiter', 'hiring_manager'] },
  { to: '/pipeline', icon: 'view_kanban', label: 'Pipeline', roles: ['admin', 'recruiter', 'hiring_manager'] },
  { to: '/jobs', icon: 'work', label: 'Job Requisitions', roles: ['admin', 'recruiter', 'hiring_manager'] },
  { to: '/analytics', icon: 'bar_chart', label: 'Analytics', roles: ['admin', 'recruiter', 'hiring_manager'] },
  { to: '/admin', icon: 'admin_panel_settings', label: 'Admin', roles: ['admin'] },
]

interface SidebarProps {
  onOpenCommandPalette: () => void
}

export default function Sidebar({ onOpenCommandPalette }: SidebarProps) {
  const { user, logout } = useAuth()
  const location = useLocation()

  const visible = NAV.filter(n => user && n.roles.includes(user.role))

  return (
    <aside className="w-56 shrink-0 bg-surface-bright border-r border-outline-variant flex flex-col h-screen sticky top-0">
      {/* Logo */}
      <div className="h-14 px-4 flex items-center gap-2.5 border-b border-outline-variant shrink-0">
        <div className="w-7 h-7 bg-primary rounded-sm flex items-center justify-center shrink-0">
          <span className="ms ms-filled text-on-primary text-[15px]">psychology</span>
        </div>
        <div>
          <div className="text-sm font-black tracking-tight text-primary leading-none">TalentAI</div>
          <div className="text-[10px] text-secondary font-medium leading-none mt-0.5">by Redrob</div>
        </div>
      </div>

      {/* Command palette button */}
      <div className="px-2 pt-3 pb-1">
        <button
          onClick={onOpenCommandPalette}
          className="w-full flex items-center gap-2 px-3 py-2 rounded border border-outline-variant bg-surface-container text-secondary hover:border-primary hover:text-on-surface transition-colors text-xs">
          <span className="ms text-[15px]">search</span>
          <span className="flex-1 text-left">Search…</span>
          <kbd className="text-[10px] font-mono border border-outline-variant/60 rounded px-1 bg-surface-bright shrink-0">⌘K</kbd>
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-2 px-2 space-y-0.5 overflow-y-auto">
        {visible.map(item => {
          const active = location.pathname.startsWith(item.to)
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={cn(
                'flex items-center gap-2.5 px-3 py-2 rounded text-sm font-medium transition-colors',
                active
                  ? 'bg-primary text-on-primary'
                  : 'text-secondary hover:text-on-surface hover:bg-surface-container'
              )}
            >
              <span className={cn('ms text-[18px]', active ? 'ms-filled' : '')}>{item.icon}</span>
              {item.label}
            </NavLink>
          )
        })}
      </nav>

      {/* User footer */}
      {user && (
        <div className="border-t border-outline-variant px-3 py-3 space-y-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-surface-container-high border border-outline-variant flex items-center justify-center shrink-0">
              <span className="text-xs font-bold text-secondary">{user.avatar_initials || user.full_name[0]}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-on-surface truncate">{user.full_name}</div>
              <div className="text-[10px] text-secondary capitalize truncate">{user.role.replace('_', ' ')}</div>
            </div>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs text-secondary hover:text-red-600 hover:bg-red-50 transition-colors">
            <span className="ms text-[16px]">logout</span>
            Sign out
          </button>
        </div>
      )}
    </aside>
  )
}
