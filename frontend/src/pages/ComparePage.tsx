import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import Header from '@/components/Layout/Header'
import ScoreRing from '@/components/ui/ScoreRing'
import { candidatesApi } from '@/lib/api'
import { scoreColor } from '@/lib/utils'
import type { CandidateListItem } from '@/types'

const SIGNAL_LABELS: Record<string, string> = {
  title_role: 'Role Match',
  skills_match: 'Skills',
  experience_fit: 'Experience',
  career_trajectory: 'Trajectory',
  behavioral_signals: 'Behavioral',
  education_prestige: 'Education',
}

function SignalRow({ label, values }: { label: string; values: number[] }) {
  const max = Math.max(...values)
  return (
    <div className="grid gap-x-4" style={{ gridTemplateColumns: `120px repeat(${values.length}, 1fr)` }}>
      <div className="text-[11px] text-secondary py-2 self-center">{label}</div>
      {values.map((v, i) => (
        <div key={i} className="py-2 self-center">
          <div className="flex items-center gap-2">
            <div className="flex-1 h-2 bg-surface-container rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${v === max && values.length > 1 ? 'bg-primary' : 'bg-outline-variant'}`}
                style={{ width: `${Math.round(v * 100)}%` }}
              />
            </div>
            <span className={`text-[11px] font-bold w-8 text-right shrink-0 ${v === max && values.length > 1 ? 'text-primary' : 'text-secondary'}`}>
              {Math.round(v * 100)}
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}

function MetricRow({ label, values, format }: { label: string; values: (string | number | null)[]; format?: (v: string | number | null) => string }) {
  const fmt = format ?? (v => v == null ? '—' : String(v))
  const strVals = values.map(fmt)
  return (
    <div className="grid border-t border-outline-variant gap-x-4 py-2"
      style={{ gridTemplateColumns: `120px repeat(${values.length}, 1fr)` }}>
      <div className="text-[11px] text-secondary self-center">{label}</div>
      {strVals.map((v, i) => (
        <div key={i} className="text-xs font-semibold text-on-surface self-center">{v}</div>
      ))}
    </div>
  )
}

export default function ComparePage() {
  const navigate = useNavigate()
  const [searchQ, setSearchQ] = useState('')
  const [selected, setSelected] = useState<CandidateListItem[]>([])

  const { data, isLoading } = useQuery({
    queryKey: ['compare-search', searchQ],
    queryFn: () => candidatesApi.list({ q: searchQ || undefined, per_page: 8 }),
    staleTime: 30000,
  })
  const candidates: CandidateListItem[] = data?.data?.results ?? []

  const addCandidate = (c: CandidateListItem) => {
    if (selected.find(s => s.id === c.id)) return
    if (selected.length >= 3) return
    setSelected(prev => [...prev, c])
  }

  const removeCandidate = (id: string) => setSelected(prev => prev.filter(s => s.id !== id))

  const cols = selected.length

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <Header
        title="Compare Candidates"
        subtitle="Side-by-side analysis of up to 3 candidates"
        actions={
          <button onClick={() => navigate('/candidates')} className="btn-secondary flex items-center gap-1.5 text-xs">
            <span className="ms text-[16px]">arrow_back</span> Back to Candidates
          </button>
        }
      />

      <main className="flex-1 overflow-y-auto p-6">
        <div className="max-w-5xl mx-auto space-y-5">

          {/* Search & Add */}
          <div className="card">
            <div className="text-xs font-bold text-primary mb-3">
              Add candidates to compare ({selected.length}/3)
            </div>
            <div className="relative mb-3">
              <input
                value={searchQ}
                onChange={e => setSearchQ(e.target.value)}
                placeholder="Search by name, title, or company…"
                className="input-base pl-8 text-xs"
              />
              <span className="ms text-[16px] text-secondary absolute left-2 top-1/2 -translate-y-1/2">search</span>
            </div>
            {isLoading ? (
              <div className="flex gap-2">
                {[1,2,3].map(i => <div key={i} className="h-12 flex-1 bg-surface-container rounded animate-pulse" />)}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                {candidates.map(c => {
                  const isAdded = selected.find(s => s.id === c.id)
                  const isFull = selected.length >= 3
                  return (
                    <button
                      key={c.id}
                      onClick={() => addCandidate(c)}
                      disabled={!!isAdded || (isFull && !isAdded)}
                      className={`flex items-center gap-2 p-2 rounded border text-left transition-colors
                        ${isAdded ? 'border-primary bg-surface-container cursor-default' : isFull ? 'border-outline-variant opacity-40 cursor-not-allowed' : 'border-outline-variant hover:border-primary hover:bg-surface-container/60 cursor-pointer'}`}>
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${scoreColor(c.score)}`}>
                        {Math.round(c.score * 100)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[11px] font-semibold text-on-surface truncate">{c.name}</div>
                        <div className="text-[10px] text-secondary truncate">{c.current_title}</div>
                      </div>
                      {isAdded && <span className="ms ms-filled text-[14px] text-primary shrink-0">check_circle</span>}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Comparison table */}
          {cols === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-secondary">
              <span className="ms text-[48px] mb-2">compare_arrows</span>
              <p className="text-sm font-medium">Select candidates above to compare</p>
              <p className="text-xs mt-1 text-secondary">Choose up to 3 candidates for side-by-side analysis</p>
            </div>
          ) : (
            <>
              {/* Header row */}
              <div className="card">
                <div className="grid gap-x-4" style={{ gridTemplateColumns: `120px repeat(${cols}, 1fr)` }}>
                  <div />
                  {selected.map(c => (
                    <div key={c.id} className="flex flex-col items-center gap-2 py-3 relative">
                      <button onClick={() => removeCandidate(c.id)}
                        className="absolute top-0 right-0 w-5 h-5 rounded-full bg-surface-container text-secondary hover:bg-red-100 hover:text-red-600 flex items-center justify-center transition-colors">
                        <span className="ms text-[12px]">close</span>
                      </button>
                      <ScoreRing score={c.score} size={56} strokeWidth={4} />
                      <div className="text-center min-w-0 w-full px-2">
                        <div className="text-sm font-bold text-primary truncate">{c.name}</div>
                        <div className="text-[11px] text-secondary truncate">{c.current_title}</div>
                        <div className="text-[10px] text-secondary truncate">{c.current_company}</div>
                      </div>
                      <button onClick={() => navigate(`/candidates/${c.id}`)}
                        className="text-[10px] text-secondary hover:text-primary flex items-center gap-0.5">
                        <span className="ms text-[12px]">open_in_new</span> View profile
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Signal scores */}
              <div className="card">
                <div className="text-xs font-bold text-primary mb-3">AI Signal Scores</div>
                {Object.entries(SIGNAL_LABELS).map(([key, label]) => (
                  <SignalRow
                    key={key}
                    label={label}
                    values={selected.map(c => ((c.signals_json as unknown as Record<string,number>)?.[key] ?? 0))}
                  />
                ))}
              </div>

              {/* Key metrics */}
              <div className="card">
                <div className="text-xs font-bold text-primary mb-2">Key Metrics</div>
                <MetricRow label="Years Exp" values={selected.map(c => c.years_of_experience ?? null)} format={v => v == null ? '—' : `${Number(v).toFixed(1)} yrs`} />
                <MetricRow label="Notice Period" values={selected.map(c => c.notice_period_days ?? null)} format={v => v == null ? '—' : `${v} days`} />
                <MetricRow label="Work Mode" values={selected.map(c => c.preferred_work_mode ?? null)} />
                <MetricRow label="Open to Work" values={selected.map(c => c.open_to_work === 1 ? 'Yes' : 'No')} />
                <MetricRow label="Salary (LPA)" values={selected.map(c => c.expected_salary_min && c.expected_salary_max ? `₹${c.expected_salary_min}–${c.expected_salary_max}` : null)} />
                <MetricRow label="GitHub Score" values={selected.map(c => c.github_activity_score ?? null)} format={v => v == null ? '—' : String(v)} />
                <MetricRow label="Location" values={selected.map(c => c.location ?? null)} />
              </div>

              {/* Skills overlap */}
              <div className="card">
                <div className="text-xs font-bold text-primary mb-3">Skills</div>
                {selected.length > 1 ? (() => {
                  const skillSets = selected.map(c => new Set((c.skills_json || []).map((s: { name: string }) => s.name)))
                  const allSkills = Array.from(new Set(selected.flatMap(c => (c.skills_json || []).map((s: { name: string }) => s.name))))
                  const common = allSkills.filter(s => skillSets.every(set => set.has(s)))
                  const unique = selected.map(c => (c.skills_json || []).map((s: { name: string }) => s.name).filter(s => !common.includes(s)).slice(0, 5))
                  return (
                    <div className="space-y-4">
                      {common.length > 0 && (
                        <div>
                          <div className="text-[11px] text-secondary mb-2">Common Skills ({common.length})</div>
                          <div className="flex flex-wrap gap-1.5">
                            {common.slice(0, 12).map(s => (
                              <span key={s} className="text-[10px] bg-emerald-50 border border-emerald-200 text-emerald-700 px-2 py-0.5 rounded">{s}</span>
                            ))}
                          </div>
                        </div>
                      )}
                      <div className="grid gap-x-4" style={{ gridTemplateColumns: `120px repeat(${cols}, 1fr)` }}>
                        <div className="text-[11px] text-secondary self-start pt-1">Unique Skills</div>
                        {unique.map((skills, i) => (
                          <div key={i} className="flex flex-wrap gap-1">
                            {skills.map(s => (
                              <span key={s} className="text-[10px] bg-surface-container border border-outline-variant text-secondary px-1.5 py-0.5 rounded">{s}</span>
                            ))}
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })() : (
                  <div className="text-xs text-secondary">Add another candidate to see skills overlap</div>
                )}
              </div>

              {/* AI Verdict */}
              {cols >= 2 && (() => {
                const winner = selected.reduce((a, b) => a.score > b.score ? a : b)
                const runnerUp = selected.filter(c => c.id !== winner.id)[0]
                return (
                  <div className="card border-l-4 border-l-primary">
                    <div className="flex items-start gap-3">
                      <span className="ms ms-filled text-[28px] text-primary shrink-0">psychology</span>
                      <div>
                        <div className="text-xs font-bold text-primary mb-1">AI Recommendation</div>
                        <p className="text-sm text-on-surface leading-relaxed">
                          <strong>{winner.name}</strong> leads with an AI score of <strong>{Math.round(winner.score * 100)}</strong>,
                          {winner.signals_json?.skills_match && winner.signals_json.skills_match > 0.8
                            ? ' exceptional skills alignment,'
                            : ''}
                          {winner.open_to_work === 1 ? ' and is immediately available.' : ` with a ${winner.notice_period_days ?? 30}-day notice period.`}
                          {runnerUp && ` ${runnerUp.name} (${Math.round(runnerUp.score * 100)}) is a strong alternative${runnerUp.notice_period_days != null && winner.notice_period_days != null && runnerUp.notice_period_days < winner.notice_period_days ? ' with a shorter notice period' : ''}.`}
                        </p>
                      </div>
                    </div>
                  </div>
                )
              })()}
            </>
          )}
        </div>
      </main>
    </div>
  )
}
