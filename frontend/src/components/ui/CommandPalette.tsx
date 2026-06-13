import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { candidatesApi } from '@/lib/api'

import { scoreColor } from '@/lib/utils'
import type { CandidateListItem } from '@/types'

interface Action {
  id: string
  label: string
  description?: string
  icon: string
  action: () => void
  group: string
}

interface CommandPaletteProps {
  open: boolean
  onClose: () => void
}

export default function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [selectedIdx, setSelectedIdx] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const navActions: Action[] = [
    { id: 'nav-dash', label: 'Go to Dashboard', icon: 'dashboard', group: 'Navigate', action: () => { navigate('/dashboard'); onClose() } },
    { id: 'nav-candidates', label: 'Go to Candidates', icon: 'person_search', group: 'Navigate', action: () => { navigate('/candidates'); onClose() } },
    { id: 'nav-pipeline', label: 'Go to Pipeline', icon: 'view_kanban', group: 'Navigate', action: () => { navigate('/pipeline'); onClose() } },
    { id: 'nav-jobs', label: 'Go to Job Requisitions', icon: 'work', group: 'Navigate', action: () => { navigate('/jobs'); onClose() } },
    { id: 'nav-analytics', label: 'Go to Analytics', icon: 'bar_chart', group: 'Navigate', action: () => { navigate('/analytics'); onClose() } },
    { id: 'nav-compare', label: 'Compare Candidates', icon: 'compare_arrows', group: 'Navigate', action: () => { navigate('/compare'); onClose() } },
    { id: 'nav-admin', label: 'Admin — User Management', icon: 'admin_panel_settings', group: 'Navigate', action: () => { navigate('/admin'); onClose() } },
  ]

  const quickActions: Action[] = [
    { id: 'act-open', label: 'Show Open to Work', description: 'Filter candidates available now', icon: 'work_history', group: 'Quick Actions', action: () => { navigate('/candidates?open_to_work=true'); onClose() } },
    { id: 'act-top', label: 'Show Top Ranked Candidates', description: 'Score above 90%', icon: 'star', group: 'Quick Actions', action: () => { navigate('/candidates?min_score=0.9'); onClose() } },
    { id: 'act-export', label: 'Export All Candidates (CSV)', icon: 'download', group: 'Quick Actions', action: () => { candidatesApi.export(); onClose() } },
  ]

  const allActions = [...navActions, ...quickActions]

  const q = query.trim()
  const { data: searchData } = useQuery({
    queryKey: ['cmd-search', q],
    queryFn: () => candidatesApi.list({ q, per_page: 5 }),
    enabled: q.length >= 2,
    staleTime: 10000,
  })
  const searchResults: CandidateListItem[] = searchData?.data?.results ?? []

  const filteredActions = q.length < 2
    ? allActions
    : allActions.filter(a =>
        a.label.toLowerCase().includes(q.toLowerCase()) ||
        (a.description || '').toLowerCase().includes(q.toLowerCase())
      )

  type HeaderItem = { type: 'header'; label: string; data?: undefined }
  type CandidateItem = { type: 'candidate'; data: CandidateListItem; label?: undefined }
  type ActionItem = { type: 'action'; data: Action; label?: undefined }
  type ListItem = HeaderItem | CandidateItem | ActionItem

  const allItems: ListItem[] = [
    ...(searchResults.length > 0 ? [{ type: 'header' as const, label: 'Candidates' }] : []),
    ...searchResults.map(c => ({ type: 'candidate' as const, data: c })),
    ...(filteredActions.length > 0 ? [{ type: 'header' as const, label: filteredActions[0]?.group || 'Actions' }] : []),
    ...filteredActions.map(a => ({ type: 'action' as const, data: a })),
  ]

  const selectableItems = allItems.filter((i): i is CandidateItem | ActionItem => i.type !== 'header')

  useEffect(() => {
    if (open) {
      setQuery('')
      setSelectedIdx(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  useEffect(() => { setSelectedIdx(0) }, [query])

  const handleKey = useCallback((e: KeyboardEvent) => {
    if (!open) return
    if (e.key === 'Escape') { onClose(); return }
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIdx(i => Math.min(i + 1, selectableItems.length - 1)) }
    if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIdx(i => Math.max(i - 1, 0)) }
    if (e.key === 'Enter') {
      e.preventDefault()
      const item = selectableItems[selectedIdx]
      if (!item) return
      if (item.type === 'action') (item.data as Action).action()
      if (item.type === 'candidate') { navigate(`/candidates/${(item.data as CandidateListItem).id}`); onClose() }
    }
  }, [open, selectableItems, selectedIdx, navigate, onClose])

  useEffect(() => {
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [handleKey])

  if (!open) return null

  let selectableCount = 0

  return (
    <div className="fixed inset-0 z-[9998] flex items-start justify-center pt-[12vh] bg-black/40 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-surface-bright rounded-xl shadow-modal border border-outline-variant w-full max-w-lg overflow-hidden">
        {/* Search bar */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-outline-variant">
          <span className="ms text-[20px] text-secondary shrink-0">search</span>
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search candidates, navigate, run actions…"
            className="flex-1 bg-transparent text-sm text-on-surface outline-none placeholder:text-secondary"
          />
          <kbd className="text-[10px] text-secondary border border-outline-variant rounded px-1.5 py-0.5 font-mono shrink-0">Esc</kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-[400px] overflow-y-auto py-2">
          {allItems.length === 0 && (
            <div className="px-4 py-8 text-center text-secondary text-sm">
              No results for "{q}"
            </div>
          )}
          {allItems.map((item, i) => {
            if (item.type === 'header') {
              return (
                <div key={`h-${i}`} className="px-4 py-1.5 text-[10px] font-bold text-secondary uppercase tracking-wider">
                  {item.label}
                </div>
              )
            }
            const idx = selectableCount++
            const isSelected = idx === selectedIdx

            if (item.type === 'candidate') {
              const c = item.data
              return (
                <div key={c.id}
                  className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors ${isSelected ? 'bg-surface-container' : 'hover:bg-surface-container/60'}`}
                  onClick={() => { navigate(`/candidates/${c.id}`); onClose() }}
                  onMouseEnter={() => setSelectedIdx(idx)}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 ${scoreColor(c.score)}`}>
                    {Math.round(c.score * 100)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-on-surface truncate">{c.name}</div>
                    <div className="text-[11px] text-secondary truncate">{c.current_title} · {c.current_company}</div>
                  </div>
                  <span className="ms text-[16px] text-secondary shrink-0">open_in_new</span>
                </div>
              )
            }

            const a = item.data
            return (
              <div key={a.id}
                className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors ${isSelected ? 'bg-surface-container' : 'hover:bg-surface-container/60'}`}
                onClick={a.action}
                onMouseEnter={() => setSelectedIdx(idx)}>
                <div className="w-8 h-8 bg-surface-container rounded flex items-center justify-center shrink-0">
                  <span className="ms text-[18px] text-secondary">{a.icon}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-on-surface">{a.label}</div>
                  {a.description && <div className="text-[11px] text-secondary">{a.description}</div>}
                </div>
                {isSelected && <span className="ms text-[16px] text-secondary shrink-0">keyboard_return</span>}
              </div>
            )
          })}
        </div>

        <div className="border-t border-outline-variant px-4 py-2 flex items-center gap-4 text-[10px] text-secondary">
          <span><kbd className="font-mono border border-outline-variant rounded px-1">↑↓</kbd> Navigate</span>
          <span><kbd className="font-mono border border-outline-variant rounded px-1">↵</kbd> Select</span>
          <span><kbd className="font-mono border border-outline-variant rounded px-1">Esc</kbd> Close</span>
        </div>
      </div>
    </div>
  )
}
