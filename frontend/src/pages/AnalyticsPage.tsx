import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import Header from '@/components/Layout/Header'
import { analyticsApi, candidatesApi } from '@/lib/api'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid, PieChart, Pie, Cell,
  FunnelChart, Funnel, LabelList,
} from 'recharts'

const PIE_COLORS = ['#000000', '#5e5e5e', '#aaaaaa', '#d0d0d0', '#e8e8e8', '#cccccc']
const FUNNEL_COLORS = ['#000000', '#1a1a1a', '#444', '#777', '#aaa']

function ChartCard({ title, sub, children, action }: { title: string; sub?: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="card">
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="text-xs font-bold text-primary">{title}</div>
          {sub && <div className="text-[11px] text-secondary">{sub}</div>}
        </div>
        {action}
      </div>
      {children}
    </div>
  )
}

export default function AnalyticsPage() {
  const navigate = useNavigate()
  const { data: overviewData, isLoading } = useQuery({ queryKey: ['analytics-overview'], queryFn: () => analyticsApi.overview() })
  const { data: trendData } = useQuery({ queryKey: ['analytics-trend'], queryFn: () => analyticsApi.scoreTrend() })
  const { data: skillsData } = useQuery({ queryKey: ['analytics-skills'], queryFn: () => analyticsApi.skillsFrequency() })
  const { data: workModeData } = useQuery({ queryKey: ['analytics-workmode'], queryFn: () => analyticsApi.workMode() })
  const { data: convData } = useQuery({ queryKey: ['analytics-conversion'], queryFn: () => analyticsApi.conversion() })

  const stats = overviewData?.data
  const trend = trendData?.data ?? []
  const skills: Array<{ skill: string; count: number }> = skillsData?.data ?? []
  const workMode: Array<{ mode: string; count: number }> = workModeData?.data ?? []
  const convStages: Array<{ stage: string; count: number; rate: number }> = convData?.data ?? []

  const dist = stats?.score_distribution ?? []
  const companies = stats?.top_companies?.slice(0, 8) ?? []
  const pipeline = stats?.pipeline_stages ?? []

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <Header
        title="Analytics"
        subtitle="Candidate intelligence & pipeline insights"
        actions={
          <button onClick={() => candidatesApi.export()}
            className="btn-secondary flex items-center gap-1.5 text-xs">
            <span className="ms text-[16px]">download</span> Export CSV
          </button>
        }
      />
      <main className="flex-1 overflow-y-auto p-6 space-y-5">

        {/* KPI row */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          {[
            { label: 'Total Candidates', value: isLoading ? '…' : stats?.total_candidates ?? '—', icon: 'person_search', sub: 'AI-ranked' },
            { label: 'Avg AI Score', value: isLoading ? '…' : (stats ? `${Math.round(stats.avg_score * 100)}` : '—'), icon: 'auto_awesome', sub: 'Out of 100' },
            { label: 'Open to Work', value: isLoading ? '…' : stats?.open_to_work ?? '—', icon: 'work', sub: `${stats ? Math.round((stats.open_to_work / stats.total_candidates) * 100) : 0}% of pool` },
            { label: 'Avg Experience', value: isLoading ? '…' : `${stats?.avg_years_experience ?? '—'}y`, icon: 'workspace_premium', sub: 'Years average' },
          ].map(k => (
            <div key={k.label} className={`card ${isLoading ? 'animate-pulse' : ''}`}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-surface-container rounded-lg flex items-center justify-center shrink-0">
                  <span className="ms text-[20px] text-secondary">{k.icon}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[10px] text-secondary uppercase tracking-wide truncate">{k.label}</div>
                  <div className="text-2xl font-black text-primary leading-none">{k.value}</div>
                  {k.sub && <div className="text-[10px] text-secondary">{k.sub}</div>}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Charts row 1: Score dist + Pipeline funnel */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          <ChartCard title="Score Distribution" sub="Candidate quality spread across the ranked pool">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={dist} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e8e0e1" vertical={false} />
                <XAxis dataKey="bucket" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                <Bar dataKey="count" fill="#000000" radius={[4, 4, 0, 0]} name="Candidates" />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Hiring Funnel Conversion" sub="Stage-to-stage conversion rates">
            <div className="space-y-3 pt-2">
              {convStages.map((s, i) => {
                const max = convStages[0]?.count || 1
                return (
                  <div key={s.stage} className="flex items-center gap-3">
                    <div className="w-20 text-[11px] text-secondary capitalize shrink-0">{s.stage}</div>
                    <div className="flex-1 h-6 bg-surface-container rounded overflow-hidden">
                      <div
                        className="h-full flex items-center justify-end pr-2 rounded transition-all"
                        style={{ width: `${Math.max((s.count / max) * 100, 3)}%`, background: `hsl(${220 - i * 30}, ${i === 0 ? 0 : 10}%, ${15 + i * 14}%)` }}>
                        <span className="text-[10px] text-white font-bold">{s.count}</span>
                      </div>
                    </div>
                    {i > 0 && (
                      <div className={`text-[11px] font-bold shrink-0 w-12 text-right ${s.rate > 50 ? 'text-emerald-600' : s.rate > 20 ? 'text-amber-600' : 'text-red-500'}`}>
                        {s.rate}%
                      </div>
                    )}
                    {i === 0 && <div className="text-[11px] text-secondary shrink-0 w-12 text-right">—</div>}
                  </div>
                )
              })}
            </div>
          </ChartCard>
        </div>

        {/* Charts row 2: Top skills + Work mode */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          <ChartCard title="Top Skills in Pool" sub="Most common skills across all ranked candidates"
            action={
              <button onClick={() => navigate('/candidates')} className="text-[10px] text-secondary hover:text-primary transition-colors">
                Search →
              </button>
            }>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={skills.slice(0, 10)} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
                <XAxis type="number" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="skill" tick={{ fontSize: 9 }} axisLine={false} tickLine={false} width={130} />
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                <Bar dataKey="count" fill="#000000" radius={[0, 4, 4, 0]} name="Candidates" />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Work Mode Preference" sub="How candidates prefer to work">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={workMode}
                  dataKey="count"
                  nameKey="mode"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  innerRadius={40}
                  label={({ mode, count }) => `${mode} (${count})`}
                  labelLine={true}>
                  {workMode.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        {/* Charts row 3: Trend + Companies */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          {trend.length > 0 && (
            <ChartCard title="Score by Rank Cohort" sub="Average AI score across rank groups">
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={trend} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e8e0e1" />
                  <XAxis dataKey="date" tick={{ fontSize: 8 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} domain={[0.7, 1]} />
                  <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} formatter={(v: number) => [`${Math.round(v * 100)}`, 'Avg Score']} />
                  <Line type="monotone" dataKey="avg_score" stroke="#000000" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>
          )}

          <ChartCard title="Top Source Companies" sub="Most represented companies in the candidate pool">
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={companies} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
                <XAxis type="number" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="company" tick={{ fontSize: 9 }} axisLine={false} tickLine={false} width={100} />
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                <Bar dataKey="count" fill="#5e5e5e" radius={[0, 4, 4, 0]} name="Candidates" />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        {/* Stage breakdown table */}
        <div className="card">
          <div className="text-xs font-bold text-primary mb-3">Pipeline Stage Breakdown</div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-outline-variant">
                  {['Stage', 'Candidates', 'Conversion from Previous', 'Status'].map(h => (
                    <th key={h} className="text-left text-[10px] font-bold text-secondary pb-2 pr-4">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(pipeline as Array<{ stage: string; count: number }>).map((s, i) => {
                  const convStage = convStages[i]
                  return (
                    <tr key={s.stage} className="border-b border-outline-variant/50 last:border-0">
                      <td className="py-2 pr-4 font-medium capitalize text-on-surface">{s.stage}</td>
                      <td className="py-2 pr-4 font-bold text-primary">{s.count}</td>
                      <td className="py-2 pr-4">
                        {convStage && i > 0 ? (
                          <span className={`font-bold ${convStage.rate > 50 ? 'text-emerald-600' : convStage.rate > 20 ? 'text-amber-600' : 'text-red-500'}`}>
                            {convStage.rate}%
                          </span>
                        ) : '—'}
                      </td>
                      <td className="py-2 pr-4">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                          s.stage === 'hired' ? 'bg-emerald-100 text-emerald-700' :
                          s.stage === 'rejected' ? 'bg-red-100 text-red-700' :
                          'bg-surface-container text-secondary'
                        }`}>
                          {s.stage === 'hired' ? 'Completed' : s.stage === 'rejected' ? 'Declined' : 'In Progress'}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

      </main>
    </div>
  )
}
