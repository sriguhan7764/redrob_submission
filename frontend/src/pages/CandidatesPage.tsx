import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useSearchParams } from 'react-router-dom'
import Header from '@/components/Layout/Header'
import ScoreRing from '@/components/ui/ScoreRing'
import SignalBars from '@/components/ui/SignalBars'
import Badge from '@/components/ui/Badge'
import Modal from '@/components/ui/Modal'
import { candidatesApi, jobsApi } from '@/lib/api'
import { useToast } from '@/contexts/ToastContext'
import type { CandidateListItem } from '@/types'

export default function CandidatesPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const qc = useQueryClient()
  const [aiQuery, setAiQuery] = useState('')
  const [aiResults, setAiResults] = useState<CandidateListItem[] | null>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const aiInputRef = useRef<HTMLInputElement>(null)

  const handleAiSearch = async () => {
    if (!aiQuery.trim()) return
    setAiLoading(true)
    try {
      const res = await candidatesApi.aiSearch(aiQuery)
      if (res.data.ai_powered) {
        setAiResults(res.data.results)
        toast.info(`Gemini found ${res.data.results.length} matches for "${aiQuery}"`)
      } else {
        setAiResults([])
        toast.warning('AI search unavailable — using standard search')
      }
    } catch {
      toast.error('AI search failed')
    } finally {
      setAiLoading(false)
    }
  }

  const clearAiSearch = () => { setAiResults(null); setAiQuery('') }
  const [params, setParams] = useSearchParams()
  const [view, setView] = useState<'list' | 'grid'>('list')
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkJobOpen, setBulkJobOpen] = useState(false)
  const [bulkJob, setBulkJob] = useState('')
  const [quickShortlistId, setQuickShortlistId] = useState<string | null>(null)
  const [quickJob, setQuickJob] = useState('')

  const filters = {
    q: params.get('q') || undefined,
    open_to_work: params.get('open_to_work') === 'true' ? true : undefined,
    min_score: params.get('min_score') ? Number(params.get('min_score')) : undefined,
    work_mode: params.get('work_mode') || undefined,
    min_exp: params.get('min_exp') ? Number(params.get('min_exp')) : undefined,
    max_exp: params.get('max_exp') ? Number(params.get('max_exp')) : undefined,
    page,
    per_page: 20,
  }

  const { data, isLoading } = useQuery({
    queryKey: ['candidates', filters],
    queryFn: () => candidatesApi.list(filters),
  })
  const { data: jobsData } = useQuery({ queryKey: ['jobs'], queryFn: () => jobsApi.list() })
  const jobs = jobsData?.data ?? []

  const candidates: CandidateListItem[] = data?.data?.results ?? []
  const total = data?.data?.total ?? 0
  const pages = Math.ceil(total / 20)

  const setFilter = (key: string, val: string) => {
    const next = new URLSearchParams(params)
    if (val) next.set(key, val); else next.delete(key)
    setParams(next)
    setPage(1)
  }

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  const toggleAll = () => {
    if (selected.size === candidates.length) setSelected(new Set())
    else setSelected(new Set(candidates.map(c => c.id)))
  }

  const favMutation = useMutation({
    mutationFn: (id: string) => candidatesApi.toggleFavorite(id),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ['candidates'] })
      toast.success('Candidate updated')
    },
  })

  const bulkShortlistMutation = useMutation({
    mutationFn: () => candidatesApi.bulkShortlist(bulkJob, Array.from(selected)),
    onSuccess: (res) => {
      const { created, skipped } = res.data
      toast.success(`Added ${created} candidate${created !== 1 ? 's' : ''} to pipeline${skipped > 0 ? ` (${skipped} already shortlisted)` : ''}`)
      setBulkJobOpen(false)
      setSelected(new Set())
      setBulkJob('')
    },
    onError: () => toast.error('Failed to shortlist candidates'),
  })

  const quickShortlistMutation = useMutation({
    mutationFn: () => candidatesApi.shortlist(quickJob, quickShortlistId!),
    onSuccess: () => {
      toast.success('Added to pipeline!')
      setQuickShortlistId(null)
      setQuickJob('')
    },
    onError: () => toast.error('Failed to add to pipeline'),
  })

  const handleExport = () => {
    const exportParams: Record<string, string> = {}
    if (selected.size > 0) exportParams.ids = Array.from(selected).join(',')
    else {
      if (params.get('q')) exportParams.q = params.get('q')!
      if (params.get('open_to_work')) exportParams.open_to_work = 'true'
      if (params.get('min_score')) exportParams.min_score = params.get('min_score')!
    }
    candidatesApi.export(exportParams)
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <Header
        title="Candidates"
        subtitle={`${total.toLocaleString()} ranked candidates`}
        actions={
          <div className="flex items-center gap-2">
            <button onClick={handleExport} className="btn-secondary flex items-center gap-1.5 text-xs">
              <span className="ms text-[16px]">download</span>
              {selected.size > 0 ? `Export ${selected.size}` : 'Export'}
            </button>
            <button onClick={() => navigate('/compare')} className="btn-secondary flex items-center gap-1.5 text-xs">
              <span className="ms text-[16px]">compare_arrows</span> Compare
            </button>
            <div className="flex items-center gap-1 border border-outline-variant rounded p-0.5">
              <button onClick={() => setView('list')} className={`p-1.5 rounded transition-colors ${view === 'list' ? 'bg-primary text-on-primary' : 'text-secondary hover:bg-surface-container'}`}>
                <span className="ms text-[16px]">list</span>
              </button>
              <button onClick={() => setView('grid')} className={`p-1.5 rounded transition-colors ${view === 'grid' ? 'bg-primary text-on-primary' : 'text-secondary hover:bg-surface-container'}`}>
                <span className="ms text-[16px]">grid_view</span>
              </button>
            </div>
          </div>
        }
      />

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="bg-primary text-on-primary px-6 py-2.5 flex items-center gap-4 shrink-0">
          <span className="text-xs font-bold">{selected.size} selected</span>
          <button onClick={() => setBulkJobOpen(true)}
            className="flex items-center gap-1.5 text-xs bg-white/15 hover:bg-white/25 px-3 py-1.5 rounded transition-colors">
            <span className="ms text-[15px]">bookmark_add</span> Shortlist to Job
          </button>
          <button onClick={handleExport}
            className="flex items-center gap-1.5 text-xs bg-white/15 hover:bg-white/25 px-3 py-1.5 rounded transition-colors">
            <span className="ms text-[15px]">download</span> Export CSV
          </button>
          {selected.size <= 3 && (
            <button onClick={() => navigate(`/compare?ids=${Array.from(selected).join(',')}`)}
              className="flex items-center gap-1.5 text-xs bg-white/15 hover:bg-white/25 px-3 py-1.5 rounded transition-colors">
              <span className="ms text-[15px]">compare_arrows</span> Compare
            </button>
          )}
          <button onClick={() => setSelected(new Set())} className="ml-auto text-xs opacity-70 hover:opacity-100">
            <span className="ms text-[16px]">close</span>
          </button>
        </div>
      )}

      <div className="flex flex-1 min-h-0">
        {/* Filters sidebar */}
        <aside className="w-52 shrink-0 border-r border-outline-variant bg-surface-bright p-4 overflow-y-auto space-y-5">
          {/* Gemini AI Search */}
          <div className="bg-gradient-to-br from-surface-container to-surface-bright border border-outline-variant rounded-lg p-3">
            <div className="flex items-center gap-1.5 mb-2">
              <span className="ms ms-filled text-[14px] text-primary">auto_awesome</span>
              <span className="text-[10px] font-bold text-primary uppercase tracking-wide">Gemini AI Search</span>
            </div>
            <div className="space-y-2">
              <input
                ref={aiInputRef}
                value={aiQuery}
                onChange={e => setAiQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAiSearch()}
                placeholder="e.g. NLP engineers with RAG experience open to remote…"
                className="input-base text-[10px] py-1.5 w-full resize-none"
              />
              <div className="flex gap-1">
                <button onClick={handleAiSearch} disabled={!aiQuery.trim() || aiLoading}
                  className="flex-1 btn-primary text-[10px] py-1 flex items-center justify-center gap-1 disabled:opacity-50">
                  {aiLoading ? <div className="w-3 h-3 border border-on-primary border-t-transparent rounded-full animate-spin" /> : <span className="ms text-[13px]">send</span>}
                  {aiLoading ? 'Searching…' : 'Ask Gemini'}
                </button>
                {aiResults !== null && (
                  <button onClick={clearAiSearch} className="btn-secondary text-[10px] py-1 px-2">
                    <span className="ms text-[13px]">close</span>
                  </button>
                )}
              </div>
              {aiResults !== null && (
                <div className="text-[10px] text-secondary">
                  {aiResults.length > 0 ? `✦ ${aiResults.length} AI matches` : '✦ No matches found'}
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold text-secondary uppercase tracking-wide">Standard Search</label>
            <div className="relative mt-1.5">
              <input value={params.get('q') || ''} onChange={e => { setFilter('q', e.target.value); clearAiSearch() }}
                placeholder="Name, skill, company…" className="input-base pl-7 text-xs py-1.5" />
              <span className="ms text-[15px] text-secondary absolute left-2 top-1/2 -translate-y-1/2">search</span>
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold text-secondary uppercase tracking-wide">Availability</label>
            <div className="mt-2 space-y-1.5">
              {[['', 'All'], ['true', 'Open to work']].map(([val, lbl]) => (
                <label key={val} className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="otw" value={val} checked={(params.get('open_to_work') || '') === val}
                    onChange={() => setFilter('open_to_work', val)} className="accent-primary" />
                  <span className="text-xs text-secondary">{lbl}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold text-secondary uppercase tracking-wide">Min AI Score</label>
            <div className="mt-2 space-y-1.5">
              {[['', 'Any'], ['0.5', '50+'], ['0.65', '65+'], ['0.8', '80+'], ['0.9', '90+']].map(([val, lbl]) => (
                <label key={val} className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="min_score" value={val} checked={(params.get('min_score') || '') === val}
                    onChange={() => setFilter('min_score', val)} className="accent-primary" />
                  <span className="text-xs text-secondary">{lbl}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold text-secondary uppercase tracking-wide">Work Mode</label>
            <div className="mt-2 space-y-1.5">
              {[['', 'Any'], ['remote', 'Remote'], ['hybrid', 'Hybrid'], ['onsite', 'Onsite'], ['flexible', 'Flexible']].map(([val, lbl]) => (
                <label key={val} className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="work_mode" value={val} checked={(params.get('work_mode') || '') === val}
                    onChange={() => setFilter('work_mode', val)} className="accent-primary" />
                  <span className="text-xs text-secondary">{lbl}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold text-secondary uppercase tracking-wide">Experience</label>
            <div className="mt-2 grid grid-cols-2 gap-1.5">
              <div>
                <div className="text-[10px] text-secondary mb-1">Min yrs</div>
                <input type="number" min={0} max={30} value={params.get('min_exp') || ''} onChange={e => setFilter('min_exp', e.target.value)}
                  placeholder="0" className="input-base text-xs py-1.5 w-full" />
              </div>
              <div>
                <div className="text-[10px] text-secondary mb-1">Max yrs</div>
                <input type="number" min={0} max={30} value={params.get('max_exp') || ''} onChange={e => setFilter('max_exp', e.target.value)}
                  placeholder="30" className="input-base text-xs py-1.5 w-full" />
              </div>
            </div>
          </div>

          <button onClick={() => { setParams({}); setPage(1) }}
            className="w-full text-xs text-secondary hover:text-on-surface flex items-center gap-1.5">
            <span className="ms text-[14px]">filter_alt_off</span> Clear filters
          </button>
        </aside>

        {/* Candidate list */}
        <main className="flex-1 overflow-y-auto">
          {/* AI search results banner */}
          {aiResults !== null && (
            <div className="px-6 pt-4 pb-0">
              <div className="flex items-center gap-2 p-3 bg-gradient-to-r from-surface-container to-surface-bright border border-outline-variant rounded-lg">
                <span className="ms ms-filled text-[18px] text-primary shrink-0">auto_awesome</span>
                <div className="flex-1">
                  <div className="text-xs font-bold text-primary">Gemini AI Results for "{aiQuery}"</div>
                  <div className="text-[10px] text-secondary">{aiResults.length} candidates matched by natural language understanding</div>
                </div>
                <button onClick={clearAiSearch} className="text-secondary hover:text-primary transition-colors">
                  <span className="ms text-[16px]">close</span>
                </button>
              </div>
            </div>
          )}

          {aiLoading ? (
            <div className="p-6 grid gap-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-24 bg-surface-container rounded-lg animate-pulse" />
              ))}
            </div>
          ) : aiResults !== null ? (
            // Show AI search results
            aiResults.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-secondary">
                <span className="ms text-[36px] mb-2">search_off</span>
                <p className="text-sm font-medium">No AI matches</p>
                <p className="text-xs mt-1">Try rephrasing your query</p>
              </div>
            ) : (
              <div className="p-6 space-y-2">
                {aiResults.map((c, idx) => (
                  <CandidateListRow
                    key={c.id}
                    candidate={c}
                    rank={idx + 1}
                    isSelected={selected.has(c.id)}
                    onSelect={() => toggleSelect(c.id)}
                    onClick={() => navigate(`/candidates/${c.id}`)}
                    onFavorite={() => favMutation.mutate(c.id)}
                    onQuickShortlist={() => { setQuickShortlistId(c.id); setQuickJob('') }}
                  />
                ))}
              </div>
            )
          ) : isLoading ? (
            <div className="p-6 grid gap-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-24 bg-surface-container rounded-lg animate-pulse" />
              ))}
            </div>
          ) : candidates.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-secondary">
              <span className="ms text-[48px] mb-2">search_off</span>
              <p className="text-sm font-medium">No candidates found</p>
              <p className="text-xs mt-1">Try adjusting your filters</p>
            </div>
          ) : view === 'list' ? (
            <div className="p-6 space-y-2">
              {/* Select all bar */}
              <div className="flex items-center gap-3 px-1 pb-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={selected.size === candidates.length && candidates.length > 0}
                    onChange={toggleAll} className="accent-primary w-3.5 h-3.5" />
                  <span className="text-[11px] text-secondary">Select all on page</span>
                </label>
                {selected.size > 0 && (
                  <span className="text-[11px] text-primary font-semibold">{selected.size} selected</span>
                )}
              </div>
              {candidates.map((c, idx) => (
                <CandidateListRow
                  key={c.id}
                  candidate={c}
                  rank={(page - 1) * 20 + idx + 1}
                  isSelected={selected.has(c.id)}
                  onSelect={() => toggleSelect(c.id)}
                  onClick={() => navigate(`/candidates/${c.id}`)}
                  onFavorite={() => favMutation.mutate(c.id)}
                  onQuickShortlist={() => { setQuickShortlistId(c.id); setQuickJob('') }}
                />
              ))}
            </div>
          ) : (
            <div className="p-6 grid grid-cols-2 xl:grid-cols-3 gap-3">
              {candidates.map((c, idx) => (
                <CandidateGridCard
                  key={c.id}
                  candidate={c}
                  rank={(page - 1) * 20 + idx + 1}
                  isSelected={selected.has(c.id)}
                  onSelect={() => toggleSelect(c.id)}
                  onClick={() => navigate(`/candidates/${c.id}`)}
                  onFavorite={() => favMutation.mutate(c.id)}
                />
              ))}
            </div>
          )}

          {/* Pagination */}
          {pages > 1 && (
            <div className="flex items-center justify-center gap-2 py-4 border-t border-outline-variant">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="btn-secondary px-3 py-1.5 text-xs disabled:opacity-40">
                <span className="ms text-[16px]">chevron_left</span>
              </button>
              <span className="text-xs text-secondary">Page {page} of {pages}</span>
              <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages}
                className="btn-secondary px-3 py-1.5 text-xs disabled:opacity-40">
                <span className="ms text-[16px]">chevron_right</span>
              </button>
            </div>
          )}
        </main>
      </div>

      {/* Bulk shortlist modal */}
      <Modal open={bulkJobOpen} onClose={() => setBulkJobOpen(false)} title={`Shortlist ${selected.size} Candidates`} size="sm">
        <div className="space-y-4">
          <p className="text-xs text-secondary">Add {selected.size} selected candidates to a job pipeline.</p>
          <div>
            <label className="text-xs font-semibold text-secondary mb-1.5 block">Job Requisition</label>
            <select value={bulkJob} onChange={e => setBulkJob(e.target.value)} className="input-base">
              <option value="">Select a job…</option>
              {jobs.map((j: { id: string; title: string; req_id: string }) => (
                <option key={j.id} value={j.id}>{j.req_id} – {j.title}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setBulkJobOpen(false)} className="btn-secondary text-xs">Cancel</button>
            <button onClick={() => bulkShortlistMutation.mutate()} disabled={!bulkJob || bulkShortlistMutation.isPending}
              className="btn-primary text-xs flex items-center gap-1.5">
              {bulkShortlistMutation.isPending ? <div className="w-3 h-3 border border-on-primary border-t-transparent rounded-full animate-spin" /> : null}
              Shortlist All
            </button>
          </div>
        </div>
      </Modal>

      {/* Quick shortlist modal */}
      <Modal open={!!quickShortlistId} onClose={() => setQuickShortlistId(null)} title="Quick Shortlist" size="sm">
        <div className="space-y-4">
          <p className="text-xs text-secondary">Select a job to shortlist this candidate:</p>
          <select value={quickJob} onChange={e => setQuickJob(e.target.value)} className="input-base">
            <option value="">Select a job…</option>
            {jobs.map((j: { id: string; title: string; req_id: string }) => (
              <option key={j.id} value={j.id}>{j.req_id} – {j.title}</option>
            ))}
          </select>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setQuickShortlistId(null)} className="btn-secondary text-xs">Cancel</button>
            <button onClick={() => quickShortlistMutation.mutate()} disabled={!quickJob || quickShortlistMutation.isPending}
              className="btn-primary text-xs flex items-center gap-1.5">
              {quickShortlistMutation.isPending ? <div className="w-3 h-3 border border-on-primary border-t-transparent rounded-full animate-spin" /> : null}
              Add to Pipeline
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

interface RowProps {
  candidate: CandidateListItem
  rank: number
  isSelected: boolean
  onSelect: () => void
  onClick: () => void
  onFavorite: () => void
  onQuickShortlist: () => void
}

function CandidateListRow({ candidate: c, rank, isSelected, onSelect, onClick, onFavorite, onQuickShortlist }: RowProps) {
  const sigs = c.signals_json
  const signals = [
    { label: 'Skills', value: sigs?.skills_match ?? 0 },
    { label: 'Experience', value: sigs?.experience_fit ?? 0 },
    { label: 'Trajectory', value: sigs?.career_trajectory ?? 0 },
    { label: 'Behavioral', value: sigs?.behavioral_signals ?? 0 },
  ]
  const topSkills = c.skills_json?.slice(0, 3).map(s => s.name) ?? []

  return (
    <div className={`card flex items-center gap-3 transition-all ${isSelected ? 'border-primary ring-1 ring-primary' : 'hover:shadow-card'}`}>
      <input type="checkbox" checked={isSelected} onChange={onSelect}
        onClick={e => e.stopPropagation()}
        className="accent-primary w-3.5 h-3.5 shrink-0 cursor-pointer" />
      <div className="text-[11px] font-bold text-secondary w-6 text-center shrink-0">#{rank}</div>
      <div onClick={onClick} className="flex items-center gap-4 flex-1 min-w-0 cursor-pointer">
        <ScoreRing score={c.score} size={44} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-bold text-primary">{c.name}</span>
            {c.open_to_work === 1 && <Badge variant="open">Open to work</Badge>}
            {(c as CandidateListItem & { is_favorite?: number }).is_favorite === 1 && (
              <span className="ms ms-filled text-[14px] text-amber-500">star</span>
            )}
          </div>
          <div className="text-xs text-secondary truncate mt-0.5">{c.current_title} · {c.current_company}</div>
          <div className="text-[10px] text-secondary mt-0.5">{c.years_of_experience?.toFixed(1)} yrs exp · {c.preferred_work_mode ?? '—'}</div>
        </div>
        <div className="w-48 shrink-0 hidden xl:block">
          <SignalBars signals={signals} compact />
        </div>
        <div className="flex items-center gap-1.5 flex-wrap max-w-[160px] hidden lg:flex shrink-0">
          {topSkills.map((s: string) => (
            <span key={s} className="text-[10px] font-medium bg-surface-container px-1.5 py-0.5 rounded border border-outline-variant text-secondary">{s}</span>
          ))}
        </div>
      </div>
      {/* Quick actions */}
      <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
        <button onClick={onQuickShortlist} title="Quick shortlist"
          className="w-7 h-7 rounded flex items-center justify-center text-secondary hover:text-primary hover:bg-surface-container transition-colors">
          <span className="ms text-[16px]">bookmark_add</span>
        </button>
        <button onClick={onFavorite} title="Toggle favorite"
          className="w-7 h-7 rounded flex items-center justify-center text-secondary hover:text-amber-500 hover:bg-surface-container transition-colors">
          <span className={`ms text-[16px] ${(c as CandidateListItem & { is_favorite?: number }).is_favorite === 1 ? 'ms-filled text-amber-500' : ''}`}>star</span>
        </button>
        <button onClick={onClick} title="View profile"
          className="w-7 h-7 rounded flex items-center justify-center text-secondary hover:text-primary hover:bg-surface-container transition-colors">
          <span className="ms text-[16px]">chevron_right</span>
        </button>
      </div>
    </div>
  )
}

interface GridProps {
  candidate: CandidateListItem
  rank: number
  isSelected: boolean
  onSelect: () => void
  onClick: () => void
  onFavorite: () => void
}

function CandidateGridCard({ candidate: c, rank, isSelected, onSelect, onClick, onFavorite }: GridProps) {
  const topSkills = c.skills_json?.slice(0, 4).map(s => s.name) ?? []
  return (
    <div className={`card cursor-pointer transition-all group flex flex-col gap-3 relative ${isSelected ? 'border-primary ring-1 ring-primary' : 'hover:shadow-card'}`}>
      <div className="absolute top-3 left-3" onClick={e => { e.stopPropagation(); onSelect() }}>
        <input type="checkbox" checked={isSelected} onChange={onSelect} className="accent-primary w-3.5 h-3.5 cursor-pointer" />
      </div>
      <button onClick={e => { e.stopPropagation(); onFavorite() }}
        className="absolute top-3 right-3 w-6 h-6 flex items-center justify-center text-secondary hover:text-amber-500 transition-colors">
        <span className={`ms text-[16px] ${(c as CandidateListItem & { is_favorite?: number }).is_favorite === 1 ? 'ms-filled text-amber-500' : ''}`}>star</span>
      </button>
      <div className="flex items-start justify-between pt-2 pl-6" onClick={onClick}>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="text-[10px] font-bold text-secondary">#{rank}</span>
          </div>
          <div className="text-sm font-bold text-primary truncate">{c.name}</div>
          <div className="text-[11px] text-secondary truncate">{c.current_title}</div>
          <div className="text-[10px] text-secondary truncate">{c.current_company}</div>
        </div>
        <ScoreRing score={c.score} size={48} />
      </div>
      <div onClick={onClick} className="flex flex-col gap-1.5">
        {c.open_to_work === 1 && <Badge variant="open">Open to work</Badge>}
        <div className="flex flex-wrap gap-1">
          {topSkills.map((s: string) => (
            <span key={s} className="text-[10px] bg-surface-container px-1.5 py-0.5 rounded border border-outline-variant text-secondary">{s}</span>
          ))}
        </div>
      </div>
    </div>
  )
}
