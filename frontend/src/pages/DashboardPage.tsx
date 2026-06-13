import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import Header from '@/components/Layout/Header'
import ScoreRing from '@/components/ui/ScoreRing'
import Badge from '@/components/ui/Badge'
import { analyticsApi, candidatesApi } from '@/lib/api'

import { useAuth } from '@/contexts/AuthContext'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import type { CandidateListItem } from '@/types'

function StatCard({ icon, label, value, sub, delta, onClick }: {
  icon: string; label: string; value: string | number; sub?: string; delta?: string; onClick?: () => void
}) {
  return (
    <div onClick={onClick} className={`card gap-3 ${onClick ? 'cursor-pointer hover:shadow-card transition-shadow' : ''}`}>
      <div className="flex items-start gap-2.5">
        <div className="w-8 h-8 bg-surface-container rounded flex items-center justify-center shrink-0 mt-0.5">
          <span className="ms text-[18px] text-secondary">{icon}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[11px] text-secondary font-medium uppercase tracking-wide truncate">{label}</div>
          <div className="text-2xl font-black text-primary leading-none mt-0.5">{value}</div>
          {sub && <div className="text-[10px] text-secondary mt-0.5">{sub}</div>}
        </div>
        {delta && (
          <div className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded shrink-0">{delta}</div>
        )}
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { data, isLoading } = useQuery({ queryKey: ['analytics-overview'], queryFn: () => analyticsApi.overview() })
  const { data: topData } = useQuery({
    queryKey: ['top-candidates'],
    queryFn: () => candidatesApi.list({ per_page: 5, open_to_work: true, min_score: 0.9 }),
  })

  const stats = data?.data
  const topCandidates: CandidateListItem[] = topData?.data?.results ?? []
  const dist = stats?.score_distribution ?? []
  const pipeline = stats?.pipeline_stages ?? []

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <Header
        title="Dashboard"
        subtitle={`${greeting}, ${user?.full_name?.split(' ')[0]}!`}
        actions={
          <button onClick={() => navigate('/candidates')} className="btn-primary flex items-center gap-1.5 text-xs">
            <span className="ms text-[16px]">person_search</span> Find Candidates
          </button>
        }
      />
      <main className="flex-1 overflow-y-auto p-6 space-y-5">

        {/* Stats row */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard icon="person_search" label="Total Candidates" value={isLoading ? '…' : stats?.total_candidates ?? 0}
            sub="AI-ranked pool" onClick={() => navigate('/candidates')} />
          <StatCard icon="work" label="Active Requisitions" value={isLoading ? '…' : stats?.active_jobs ?? 0}
            sub="Open roles" onClick={() => navigate('/jobs')} />
          <StatCard icon="check_circle" label="Available Now" value={isLoading ? '…' : stats?.open_to_work ?? 0}
            sub="Open to work" onClick={() => navigate('/candidates?open_to_work=true')} />
          <StatCard icon="trending_up" label="Avg AI Score"
            value={isLoading ? '…' : `${Math.round((stats?.avg_score ?? 0) * 100)}`}
            sub="Out of 100" delta="↑ Elite pool" />
        </div>

        {/* Secondary stats */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
          {[
            { icon: 'groups', label: 'In Interview', value: stats?.in_interview ?? 0, sub: 'Active interviews' },
            { icon: 'task_alt', label: 'Hired', value: stats?.hired ?? 0, sub: 'This pipeline' },
            { icon: 'bookmark', label: 'Shortlisted', value: stats?.total_shortlisted ?? 0, sub: 'Across all jobs' },
            { icon: 'workspace_premium', label: 'Avg Experience', value: isLoading ? '…' : `${stats?.avg_years_experience ?? 0}y`, sub: 'Pool average' },
          ].map(s => (
            <div key={s.label} className="card flex items-center gap-3">
              <div className="w-8 h-8 bg-surface-container rounded flex items-center justify-center shrink-0">
                <span className="ms text-[18px] text-secondary">{s.icon}</span>
              </div>
              <div>
                <div className="text-[10px] text-secondary uppercase tracking-wide">{s.label}</div>
                <div className="text-lg font-black text-primary leading-none">{s.value}</div>
                <div className="text-[10px] text-secondary">{s.sub}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Main content grid */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          {/* Score distribution */}
          <div className="card xl:col-span-2">
            <div className="mb-4">
              <div className="text-xs font-bold text-primary">Score Distribution</div>
              <div className="text-[11px] text-secondary">Candidate quality across the ranked pool</div>
            </div>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={dist} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <XAxis dataKey="bucket" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 6 }} />
                <Bar dataKey="count" fill="#000000" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Pipeline funnel */}
          <div className="card">
            <div className="mb-3">
              <div className="text-xs font-bold text-primary">Pipeline</div>
              <div className="text-[11px] text-secondary">By stage</div>
            </div>
            <div className="space-y-2">
              {pipeline.map((s: { stage: string; count: number }) => {
                const max = Math.max(...pipeline.map((p: { count: number }) => p.count), 1)
                return (
                  <div key={s.stage} className="flex items-center gap-2">
                    <div className="w-16 text-[11px] text-secondary capitalize shrink-0">{s.stage}</div>
                    <div className="flex-1 h-4 bg-surface-container rounded-sm overflow-hidden">
                      <div className="h-full bg-primary rounded-sm transition-all" style={{ width: `${Math.max((s.count / max) * 100, 2)}%` }} />
                    </div>
                    <div className="w-6 text-[11px] font-bold text-primary text-right shrink-0">{s.count}</div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Top candidates spotlight */}
        {topCandidates.length > 0 && (
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-xs font-bold text-primary">Top Available Candidates</div>
                <div className="text-[11px] text-secondary">Score 90+ · Open to work right now</div>
              </div>
              <button onClick={() => navigate('/candidates?min_score=0.9&open_to_work=true')}
                className="text-xs text-secondary hover:text-primary flex items-center gap-1 transition-colors">
                View all <span className="ms text-[14px]">chevron_right</span>
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
              {topCandidates.map(c => (
                <div key={c.id} onClick={() => navigate(`/candidates/${c.id}`)}
                  className="flex flex-col items-center gap-2 p-3 rounded-lg border border-outline-variant hover:border-primary hover:bg-surface-container/40 cursor-pointer transition-all group">
                  <ScoreRing score={c.score} size={48} />
                  <div className="text-center min-w-0 w-full">
                    <div className="text-xs font-bold text-on-surface truncate">{c.name}</div>
                    <div className="text-[10px] text-secondary truncate">{c.current_title}</div>
                  </div>
                  <Badge variant="open">Open to work</Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick actions */}
        <div className="card">
          <div className="text-xs font-bold text-primary mb-3">Quick Actions</div>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
            {[
              { icon: 'search', label: 'All Candidates', to: '/candidates' },
              { icon: 'check_circle', label: 'Open to Work', to: '/candidates?open_to_work=true' },
              { icon: 'compare_arrows', label: 'Compare', to: '/compare' },
              { icon: 'view_kanban', label: 'Pipeline', to: '/pipeline' },
              { icon: 'add_circle', label: 'New Job Req', to: '/jobs' },
              { icon: 'bar_chart', label: 'Analytics', to: '/analytics' },
              { icon: 'download', label: 'Export CSV', action: () => candidatesApi.export() },
            ].map(a => (
              <button key={a.label} onClick={a.action ?? (() => navigate(a.to!))}
                className="flex flex-col items-center gap-2 p-3 rounded-lg border border-outline-variant hover:border-primary hover:bg-surface-container transition-colors">
                <span className="ms text-[22px] text-secondary">{a.icon}</span>
                <span className="text-[10px] font-semibold text-secondary text-center leading-tight">{a.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Top companies */}
        {stats?.top_companies && stats.top_companies.length > 0 && (
          <div className="card">
            <div className="text-xs font-bold text-primary mb-3">Candidates by Company</div>
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-2">
              {stats.top_companies.slice(0, 10).map((c: { company: string; count: number }) => (
                <button key={c.company}
                  onClick={() => navigate(`/candidates?q=${encodeURIComponent(c.company)}`)}
                  className="flex items-center justify-between px-3 py-2 bg-surface-container rounded text-xs hover:bg-surface-container-high transition-colors">
                  <span className="text-secondary truncate">{c.company}</span>
                  <span className="font-bold text-primary ml-2 shrink-0">{c.count}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
