import { useState, useEffect, useCallback } from 'react'
import { Outlet, Navigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import Sidebar from './Sidebar'
import CommandPalette from '@/components/ui/CommandPalette'

export default function AppLayout() {
  const { isAuthenticated, isLoading } = useAuth()
  const [cmdOpen, setCmdOpen] = useState(false)

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault()
      setCmdOpen(prev => !prev)
    }
  }, [])

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm text-secondary">Loading…</span>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />

  return (
    <div className="flex min-h-screen bg-surface">
      <Sidebar onOpenCommandPalette={() => setCmdOpen(true)} />
      <div className="flex-1 flex flex-col min-w-0">
        <Outlet />
      </div>
      <CommandPalette open={cmdOpen} onClose={() => setCmdOpen(false)} />
    </div>
  )
}
