import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Header from '@/components/Layout/Header'
import ScoreRing from '@/components/ui/ScoreRing'
import SignalBars from '@/components/ui/SignalBars'
import Badge from '@/components/ui/Badge'
import Modal from '@/components/ui/Modal'
import { candidatesApi, jobsApi } from '@/lib/api'
import { useToast } from '@/contexts/ToastContext'

const TABS = ['Experience', 'Skills', 'Education', 'Platform Signals', 'Notes', 'Interview Kit'] as const
type Tab = typeof TABS[number]

const NOTE_TYPE_ICONS: Record<string, string> = {
  general: 'notes',
  interview: 'groups',
  feedback: 'rate_review',
  offer: 'description',
}

const FIT_VERDICT_STYLE: Record<string, string> = {
  'Strong Match': 'bg-emerald-50 border-emerald-200 text-emerald-700',
  'Good Match': 'bg-blue-50 border-blue-200 text-blue-700',
  'Partial Match': 'bg-amber-50 border-amber-200 text-amber-700',
  'Weak Match': 'bg-red-50 border-red-200 text-red-700',
}

const EMAIL_TYPES = [
  { value: 'outreach', label: 'Outreach', icon: 'send' },
  { value: 'interview_invite', label: 'Interview Invite', icon: 'event' },
  { value: 'rejection', label: 'Rejection', icon: 'cancel' },
  { value: 'offer', label: 'Offer Letter', icon: 'description' },
]

export default function CandidateDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const toast = useToast()

  const [tab, setTab] = useState<Tab>('Experience')
  const [shortlistOpen, setShortlistOpen] = useState(false)
  const [selectedJob, setSelectedJob] = useState('')
  const [noteContent, setNoteContent] = useState('')
  const [noteType, setNoteType] = useState('general')
  const [isFav, setIsFav] = useState<boolean | null>(null)
  const [emailOpen, setEmailOpen] = useState(false)
  const [emailType, setEmailType] = useState('outreach')
  const [emailJob, setEmailJob] = useState('')
  const [emailLoading, setEmailLoading] = useState(false)
  const [emailResult, setEmailResult] = useState<{ subject: string; body: string; ai_powered?: boolean } | null>(null)
  const [fitData, setFitData] = useState<Record<string, unknown> | null>(null)
  const [fitLoading, setFitLoading] = useState(false)
  const [notesSummary, setNotesSummary] = useState<Record<string, unknown> | null>(null)
  const [summaryLoading, setSummaryLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['candidate', id],
    queryFn: () => candidatesApi.get(id!),
  })
  const { data: jobsData } = useQuery({ queryKey: ['jobs'], queryFn: () => jobsApi.list() })
  const { data: notesData, refetch: refetchNotes } = useQuery({
    queryKey: ['notes', id],
    queryFn: () => candidatesApi.getNotes(id!),
    enabled: tab === 'Notes',
  })
  const { data: kitData, isLoading: kitLoading } = useQuery({
    queryKey: ['interview-kit', id],
    queryFn: () => candidatesApi.getInterviewKit(id!),
    enabled: tab === 'Interview Kit',
  })

  const jobs = jobsData?.data ?? []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const c: any = data?.data
  const notes: any[] = notesData?.data ?? []
  const kit: any = kitData?.data

  const shortlistMutation = useMutation({
    mutationFn: () => candidatesApi.shortlist(selectedJob, id!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['jobs'] })
      setShortlistOpen(false)
      setFitData(null)
      toast.success('Added to pipeline!')
    },
    onError: () => toast.error('Already shortlisted or error'),
  })

  const addNoteMutation = useMutation({
    mutationFn: () => candidatesApi.addNote(id!, noteContent, noteType),
    onSuccess: () => {
      setNoteContent('')
      refetchNotes()
      toast.success('Note added')
    },
    onError: () => toast.error('Failed to add note'),
  })

  const deleteNoteMutation = useMutation({
    mutationFn: (noteId: string) => candidatesApi.deleteNote(id!, noteId),
    onSuccess: () => { refetchNotes(); toast.success('Note deleted') },
  })

  const favMutation = useMutation({
    mutationFn: () => candidatesApi.toggleFavorite(id!),
    onSuccess: (res) => {
      const newVal = res.data.is_favorite === 1
      setIsFav(newVal)
      toast.success(newVal ? 'Added to favorites' : 'Removed from favorites')
    },
  })

  const handleFitAnalysis = async (jobId: string) => {
    if (!jobId) return
    setFitLoading(true)
    setFitData(null)
    try {
      const res = await candidatesApi.fitAnalysis(id!, jobId)
      setFitData(res.data)
    } catch {
      toast.error('Fit analysis failed')
    } finally {
      setFitLoading(false)
    }
  }

  const handleDraftEmail = async () => {
    setEmailLoading(true)
    setEmailResult(null)
    try {
      const res = await candidatesApi.draftEmail(id!, emailJob || null, emailType)
      setEmailResult(res.data)
    } catch {
      toast.error('Failed to draft email')
    } finally {
      setEmailLoading(false)
    }
  }

  const handleSummarizeNotes = async () => {
    setSummaryLoading(true)
    try {
      const res = await candidatesApi.summarizeNotes(id!)
      setNotesSummary(res.data)
    } catch {
      toast.error('Failed to summarize notes')
    } finally {
      setSummaryLoading(false)
    }
  }

  const copyEmail = () => {
    if (!emailResult) return
    navigator.clipboard.writeText(`Subject: ${emailResult.subject}\n\n${emailResult.body}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    toast.success('Copied to clipboard')
  }

  if (isLoading) return (
    <div className="flex-1 flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  )
  if (!c) return <div className="flex-1 flex items-center justify-center text-secondary">Candidate not found</div>

  const sigs = c.signals_json ?? {}
  const careerHistory = c.career_summary_json ?? []
  const skills = c.skills_json ?? []
  const education = c.education_json ?? []

  const signals = [
    { label: 'Role Match', value: sigs.title_role ?? 0 },
    { label: 'Skills', value: sigs.skills_match ?? 0 },
    { label: 'Experience', value: sigs.experience_fit ?? 0 },
    { label: 'Trajectory', value: sigs.career_trajectory ?? 0 },
    { label: 'Behavioral', value: sigs.behavioral_signals ?? 0 },
    { label: 'Education', value: sigs.education_prestige ?? 0 },
  ]

  const isCurrentlyFav = isFav !== null ? isFav : c.is_favorite === 1

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <Header
        title={c.name ?? 'Candidate'}
        subtitle={`${c.current_title ?? ''} · Rank #${c.rank}`}
        actions={
          <div className="flex items-center gap-2">
            <button onClick={() => { setEmailOpen(true); setEmailResult(null) }}
              className="btn-secondary flex items-center gap-1.5 text-xs">
              <span className="ms text-[16px]">mail</span> Draft Email
            </button>
            <button onClick={() => favMutation.mutate()}
              className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded border transition-colors ${isCurrentlyFav ? 'border-amber-400 bg-amber-50 text-amber-600' : 'btn-secondary'}`}>
              <span className={`ms text-[16px] ${isCurrentlyFav ? 'ms-filled' : ''}`}>star</span>
              {isCurrentlyFav ? 'Favorited' : 'Favorite'}
            </button>
            <button onClick={() => { setShortlistOpen(true); setFitData(null) }}
              className="btn-primary flex items-center gap-1.5 text-xs">
              <span className="ms text-[16px]">bookmark_add</span> Shortlist
            </button>
          </div>
        }
      />

      <main className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto space-y-5">
          {/* Hero card */}
          <div className="card flex items-start gap-6">
            <ScoreRing score={c.score} size={72} strokeWidth={5} label="AI Score" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <h2 className="text-base font-black text-primary">{c.name}</h2>
                {c.open_to_work === 1 && <Badge variant="open">Open to work</Badge>}
              </div>
              <div className="text-sm text-secondary">{c.current_title} at {c.current_company}</div>
              <div className="text-xs text-secondary mt-0.5">{c.years_of_experience?.toFixed(1)} years experience</div>
              {c.location && (
                <div className="text-xs text-secondary mt-0.5 flex items-center gap-1">
                  <span className="ms text-[13px]">location_on</span>{c.location}
                </div>
              )}
              {c.reasoning && (
                <div className="mt-3 p-3 bg-surface-container rounded text-xs text-secondary leading-relaxed border-l-2 border-primary">
                  {c.reasoning}
                </div>
              )}
            </div>
            <div className="shrink-0 w-48">
              <SignalBars signals={signals} />
            </div>
          </div>

          {/* Quick stat pills */}
          <div className="flex flex-wrap gap-2">
            {[
              { icon: 'timer', label: `${c.notice_period_days ?? '?'} day notice` },
              { icon: 'home_work', label: c.preferred_work_mode ?? 'any mode' },
              { icon: 'payments', label: c.expected_salary_min && c.expected_salary_max ? `₹${c.expected_salary_min}–${c.expected_salary_max} LPA` : 'salary TBD' },
              { icon: 'reply', label: `${Math.round((c.recruiter_response_rate ?? 0) * 100)}% response rate` },
            ].map(p => (
              <div key={p.label} className="flex items-center gap-1.5 text-[10px] bg-surface-container border border-outline-variant px-2.5 py-1 rounded-full text-secondary">
                <span className="ms text-[12px]">{p.icon}</span>{p.label}
              </div>
            ))}
          </div>

          {/* Tabs */}
          <div className="border-b border-outline-variant flex gap-0 overflow-x-auto">
            {TABS.map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap ${tab === t ? 'border-primary text-primary' : 'border-transparent text-secondary hover:text-on-surface'}`}>
                {t}
                {t === 'Notes' && notes.length > 0 && (
                  <span className="ml-1.5 text-[10px] bg-primary text-on-primary px-1.5 py-0.5 rounded-full">{notes.length}</span>
                )}
              </button>
            ))}
          </div>

          {/* Tab: Experience */}
          {tab === 'Experience' && (
            <div className="space-y-3">
              {careerHistory.length === 0 && (
                <div className="card text-center text-secondary text-sm py-8">No career history available</div>
              )}
              {careerHistory.map((job: any, i: number) => (
                <div key={i} className="card flex gap-4">
                  <div className="flex flex-col items-center gap-1 pt-0.5">
                    <div className="w-2 h-2 rounded-full bg-primary shrink-0" />
                    {i < careerHistory.length - 1 && <div className="w-px flex-1 bg-outline-variant min-h-[24px]" />}
                  </div>
                  <div className="flex-1 min-w-0 pb-2">
                    <div className="text-sm font-bold text-primary">{job.title}</div>
                    <div className="text-xs text-secondary">{job.company}</div>
                    <div className="text-[10px] text-secondary mt-0.5">
                      {job.start_date} – {job.end_date || 'Present'} {job.duration_months ? `· ${job.duration_months} mo` : ''}
                    </div>
                    {job.description && <p className="text-xs text-secondary mt-2 leading-relaxed">{job.description}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Tab: Skills */}
          {tab === 'Skills' && (
            <div className="card">
              {skills.length === 0 && <div className="text-center text-secondary text-sm py-8">No skills data</div>}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                {skills.map((s: any, i: number) => (
                  <div key={i} className="flex items-center justify-between p-2.5 bg-surface-container rounded border border-outline-variant">
                    <div>
                      <div className="text-xs font-semibold text-on-surface">{s.name}</div>
                      <div className="text-[10px] text-secondary capitalize">
                        {s.proficiency} {s.duration_months ? `· ${Math.round(s.duration_months / 12)}yr` : ''}
                      </div>
                    </div>
                    {s.endorsed && <span className="ms ms-filled text-[14px] text-emerald-500 shrink-0">verified</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tab: Education */}
          {tab === 'Education' && (
            <div className="space-y-3">
              {education.length === 0 && <div className="card text-center text-secondary text-sm py-8">No education data</div>}
              {education.map((e: any, i: number) => (
                <div key={i} className="card flex gap-3">
                  <span className="ms text-[24px] text-secondary shrink-0 mt-0.5">school</span>
                  <div>
                    <div className="text-sm font-bold text-primary">{e.institution}</div>
                    <div className="text-xs text-secondary">{e.degree} {e.field_of_study ? `· ${e.field_of_study}` : ''}</div>
                    {(e.start_year || e.end_year || e.grade) && (
                      <div className="text-[10px] text-secondary mt-0.5">
                        {e.start_year && e.end_year ? `${e.start_year} – ${e.end_year}` : ''} {e.grade ? `· ${e.grade}` : ''}
                      </div>
                    )}
                    {e.tier && <div className="text-[10px] text-secondary">Tier: {e.tier}</div>}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Tab: Platform Signals */}
          {tab === 'Platform Signals' && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                { label: 'Open to Work', value: c.open_to_work === 1 ? 'Yes' : 'No', icon: 'work' },
                { label: 'Response Rate', value: c.recruiter_response_rate != null ? `${Math.round(c.recruiter_response_rate * 100)}%` : '—', icon: 'reply' },
                { label: 'Notice Period', value: c.notice_period_days != null ? `${c.notice_period_days} days` : '—', icon: 'timer' },
                { label: 'GitHub Activity', value: c.github_activity_score != null ? `${c.github_activity_score}` : '—', icon: 'code' },
                { label: 'Work Mode', value: c.preferred_work_mode ?? '—', icon: 'home_work' },
                { label: 'Willing to Relocate', value: c.willing_to_relocate === 1 ? 'Yes' : 'No', icon: 'flight_takeoff' },
                { label: 'Expected Salary', value: c.expected_salary_min && c.expected_salary_max ? `₹${c.expected_salary_min}–${c.expected_salary_max} LPA` : '—', icon: 'payments' },
              ].map(sig => (
                <div key={sig.label} className="card flex items-center gap-3">
                  <div className="w-8 h-8 bg-surface-container rounded flex items-center justify-center shrink-0">
                    <span className="ms text-[18px] text-secondary">{sig.icon}</span>
                  </div>
                  <div>
                    <div className="text-[10px] text-secondary uppercase tracking-wide">{sig.label}</div>
                    <div className="text-sm font-bold text-primary">{sig.value}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Tab: Notes */}
          {tab === 'Notes' && (
            <div className="space-y-4">
              {/* AI Summary Banner */}
              {notes.length > 0 && (
                <div className="card bg-gradient-to-r from-violet-50 to-indigo-50 border-violet-200">
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="ms ms-filled text-[18px] text-violet-600">auto_awesome</span>
                      <span className="text-xs font-bold text-violet-700">AI Notes Summary</span>
                    </div>
                    <button onClick={handleSummarizeNotes} disabled={summaryLoading}
                      className="flex items-center gap-1.5 text-[10px] px-2.5 py-1 rounded border border-violet-300 text-violet-700 hover:bg-violet-100 transition-colors disabled:opacity-50">
                      {summaryLoading
                        ? <div className="w-3 h-3 border border-violet-600 border-t-transparent rounded-full animate-spin" />
                        : <span className="ms text-[13px]">refresh</span>
                      }
                      {summaryLoading ? 'Analysing…' : 'Summarise with Gemini'}
                    </button>
                  </div>
                  {notesSummary ? (
                    <div className="space-y-2">
                      <p className="text-xs text-on-surface leading-relaxed">{notesSummary.summary as string}</p>
                      <div className="flex flex-wrap gap-2 mt-2">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${
                          notesSummary.sentiment === 'positive' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' :
                          notesSummary.sentiment === 'negative' ? 'bg-red-50 border-red-200 text-red-700' :
                          'bg-surface-container border-outline-variant text-secondary'
                        }`}>
                          {notesSummary.sentiment as string} sentiment
                        </span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${
                          notesSummary.hire_signal === 'Strong' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' :
                          notesSummary.hire_signal === 'Moderate' ? 'bg-blue-50 border-blue-200 text-blue-700' :
                          notesSummary.hire_signal === 'Weak' ? 'bg-red-50 border-red-200 text-red-700' :
                          'bg-surface-container border-outline-variant text-secondary'
                        }`}>
                          {notesSummary.hire_signal as string} hire signal
                        </span>
                      </div>
                      {Array.isArray(notesSummary.key_points) && notesSummary.key_points.length > 0 && (
                        <ul className="text-[10px] text-secondary space-y-0.5 mt-2">
                          {(notesSummary.key_points as string[]).map((pt, i) => (
                            <li key={i} className="flex items-start gap-1.5"><span className="text-violet-400 shrink-0 mt-0.5">•</span>{pt}</li>
                          ))}
                        </ul>
                      )}
                      {!!notesSummary.recommended_action && (
                        <div className="mt-2 p-2 bg-violet-100 rounded text-[10px] text-violet-800 flex items-start gap-1.5">
                          <span className="ms text-[13px] shrink-0">lightbulb</span>
                          <span><strong>Next action:</strong> {String(notesSummary.recommended_action)}</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-[10px] text-secondary">Click "Summarise with Gemini" to get an AI analysis of all recruiter notes.</p>
                  )}
                </div>
              )}

              {/* Add Note */}
              <div className="card">
                <div className="text-xs font-bold text-primary mb-3">Add Note</div>
                <div className="flex gap-2 mb-2 flex-wrap">
                  {(['general', 'interview', 'feedback', 'offer'] as const).map(t => (
                    <button key={t} onClick={() => setNoteType(t)}
                      className={`flex items-center gap-1 text-[10px] px-2.5 py-1 rounded-full border transition-colors capitalize ${noteType === t ? 'border-primary bg-primary text-on-primary' : 'border-outline-variant text-secondary hover:border-primary'}`}>
                      <span className="ms text-[13px]">{NOTE_TYPE_ICONS[t]}</span>{t}
                    </button>
                  ))}
                </div>
                <textarea
                  value={noteContent}
                  onChange={e => setNoteContent(e.target.value)}
                  placeholder="Add your notes, observations, or feedback here…"
                  rows={3}
                  className="input-base text-xs resize-none w-full"
                />
                <div className="mt-2 flex justify-end">
                  <button onClick={() => addNoteMutation.mutate()} disabled={!noteContent.trim() || addNoteMutation.isPending}
                    className="btn-primary text-xs flex items-center gap-1.5">
                    {addNoteMutation.isPending
                      ? <div className="w-3 h-3 border border-on-primary border-t-transparent rounded-full animate-spin" />
                      : <span className="ms text-[15px]">add</span>
                    }
                    Add Note
                  </button>
                </div>
              </div>

              {notes.length === 0 ? (
                <div className="text-center text-secondary text-sm py-8">
                  <span className="ms text-[36px] block mb-2">notes</span>
                  No notes yet. Add your first note above.
                </div>
              ) : (
                <div className="space-y-3">
                  {notes.map((note: any) => (
                    <div key={note.id} className="card">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-surface-container flex items-center justify-center shrink-0">
                            <span className="ms text-[15px] text-secondary">{NOTE_TYPE_ICONS[note.note_type] || 'notes'}</span>
                          </div>
                          <div>
                            <div className="text-xs font-semibold text-on-surface">{note.author_name}</div>
                            <div className="text-[10px] text-secondary capitalize">{note.author_role?.replace('_', ' ')} · {note.note_type}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <span className="text-[10px] text-secondary">
                            {new Date(note.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' })}
                          </span>
                          <button onClick={() => deleteNoteMutation.mutate(note.id)}
                            className="w-6 h-6 flex items-center justify-center text-secondary hover:text-red-600 transition-colors rounded">
                            <span className="ms text-[14px]">delete</span>
                          </button>
                        </div>
                      </div>
                      <p className="text-xs text-on-surface leading-relaxed whitespace-pre-wrap">{note.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tab: Interview Kit */}
          {tab === 'Interview Kit' && (
            <div className="space-y-4">
              {kitLoading ? (
                <div className="flex flex-col items-center justify-center py-12 text-secondary">
                  <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mb-3" />
                  <span className="text-xs">Generating with Gemini AI…</span>
                </div>
              ) : !kit ? (
                <div className="card text-center text-secondary py-8">Failed to generate interview kit</div>
              ) : (
                <>
                  <div className="card flex items-start gap-4">
                    <div className="w-10 h-10 bg-primary rounded flex items-center justify-center shrink-0">
                      <span className="ms ms-filled text-on-primary text-[20px]">psychology</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <div className="text-sm font-bold text-primary">Interview Kit — {kit.candidate_name}</div>
                        {kit.ai_powered && (
                          <span className="text-[9px] bg-violet-100 border border-violet-200 text-violet-700 px-1.5 py-0.5 rounded-full font-medium flex items-center gap-0.5">
                            <span className="ms ms-filled text-[10px]">auto_awesome</span> Gemini
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-secondary">
                        {kit.seniority} · {typeof kit.years_experience === 'number' ? kit.years_experience.toFixed(1) : kit.years_experience} years · {kit.sections?.length} sections · {kit.sections?.reduce((acc: number, s: any) => acc + s.questions.length, 0)} questions
                      </div>
                      {kit.top_skills?.length > 0 && (
                        <div className="flex items-center gap-1 flex-wrap mt-2">
                          <span className="text-[10px] text-secondary">Focus:</span>
                          {kit.top_skills.map((s: string) => (
                            <span key={s} className="text-[10px] bg-surface-container border border-outline-variant px-1.5 py-0.5 rounded text-secondary">{s}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  {kit.sections?.map((section: any, si: number) => (
                    <div key={si} className="card">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="ms text-[18px] text-secondary">{section.icon}</span>
                        <div className="text-xs font-bold text-primary">{section.title}</div>
                        <span className="text-[10px] text-secondary ml-auto">{section.questions.length} questions</span>
                      </div>
                      <div className="space-y-2">
                        {section.questions.map((q: string, qi: number) => (
                          <div key={qi} className="flex gap-3 py-2 border-t border-outline-variant first:border-0">
                            <span className="text-[10px] font-bold text-secondary w-5 shrink-0 pt-0.5">Q{qi + 1}</span>
                            <p className="text-xs text-on-surface leading-relaxed">{q}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                  <div className="text-[10px] text-secondary text-center">
                    {kit.ai_powered ? 'Generated by Gemini AI. Personalised for this candidate.' : 'Rule-based kit. Add more context in Notes for AI personalisation.'}
                  </div>
                </>
              )}
            </div>
          )}

          <button onClick={() => navigate(-1)} className="btn-secondary flex items-center gap-1.5 text-xs">
            <span className="ms text-[16px]">arrow_back</span> Back
          </button>
        </div>
      </main>

      {/* ─── Shortlist Modal with AI Fit Analysis ─── */}
      <Modal open={shortlistOpen} onClose={() => { setShortlistOpen(false); setFitData(null) }} title="Shortlist Candidate" size="sm">
        <div className="space-y-4">
          <p className="text-xs text-secondary">Add <strong>{c.name}</strong> to a job requisition pipeline.</p>
          <div>
            <label className="text-xs font-semibold text-secondary mb-1.5 block">Job Requisition</label>
            <select value={selectedJob} onChange={e => { setSelectedJob(e.target.value); setFitData(null) }} className="input-base">
              <option value="">Select a job…</option>
              {jobs.map((j: { id: string; title: string; req_id: string }) => (
                <option key={j.id} value={j.id}>{j.req_id} – {j.title}</option>
              ))}
            </select>
          </div>

          {/* AI Fit Analysis */}
          {selectedJob && (
            <div className="bg-gradient-to-br from-violet-50 to-indigo-50 border border-violet-200 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <span className="ms ms-filled text-[15px] text-violet-600">auto_awesome</span>
                  <span className="text-[10px] font-bold text-violet-700">AI Fit Analysis</span>
                </div>
                {!fitData && !fitLoading && (
                  <button onClick={() => handleFitAnalysis(selectedJob)}
                    className="text-[10px] px-2.5 py-1 rounded border border-violet-300 text-violet-700 hover:bg-violet-100 transition-colors">
                    Analyse with Gemini
                  </button>
                )}
              </div>
              {fitLoading && (
                <div className="flex items-center gap-2 text-[10px] text-secondary py-1">
                  <div className="w-3 h-3 border border-violet-500 border-t-transparent rounded-full animate-spin" />
                  Gemini is analysing fit…
                </div>
              )}
              {fitData && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="text-2xl font-black text-violet-700">{fitData.fit_score as number}%</div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${FIT_VERDICT_STYLE[fitData.verdict as string] ?? 'bg-surface-container border-outline-variant text-secondary'}`}>
                      {fitData.verdict as string}
                    </span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ml-auto ${
                      fitData.interview_priority === 'High' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' :
                      fitData.interview_priority === 'Medium' ? 'bg-amber-50 border-amber-200 text-amber-700' :
                      'bg-red-50 border-red-200 text-red-700'
                    }`}>
                      {fitData.interview_priority as string} priority
                    </span>
                  </div>
                  {Array.isArray(fitData.strengths) && fitData.strengths.length > 0 && (
                    <div>
                      <div className="text-[9px] font-bold text-emerald-700 uppercase mb-1">Strengths</div>
                      <ul className="space-y-0.5">
                        {(fitData.strengths as string[]).map((s, i) => (
                          <li key={i} className="text-[10px] text-on-surface flex items-start gap-1">
                            <span className="text-emerald-500 shrink-0">✓</span>{s}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {Array.isArray(fitData.gaps) && fitData.gaps.length > 0 && (
                    <div>
                      <div className="text-[9px] font-bold text-red-700 uppercase mb-1">Gaps</div>
                      <ul className="space-y-0.5">
                        {(fitData.gaps as string[]).map((g, i) => (
                          <li key={i} className="text-[10px] text-on-surface flex items-start gap-1">
                            <span className="text-red-400 shrink-0">×</span>{g}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {!!fitData.recommendation && (
                    <div className="p-2 bg-white rounded border border-violet-200 text-[10px] text-secondary leading-relaxed">
                      <strong className="text-violet-700">Recommendation:</strong> {String(fitData.recommendation)}
                    </div>
                  )}
                  <button onClick={() => handleFitAnalysis(selectedJob)} className="text-[9px] text-secondary hover:text-violet-600 transition-colors">
                    Re-analyse
                  </button>
                </div>
              )}
              {!fitData && !fitLoading && (
                <p className="text-[10px] text-secondary">Get Gemini's assessment of this candidate's fit for the selected role.</p>
              )}
            </div>
          )}

          <div className="flex gap-2 justify-end">
            <button onClick={() => { setShortlistOpen(false); setFitData(null) }} className="btn-secondary text-xs">Cancel</button>
            <button onClick={() => shortlistMutation.mutate()} disabled={!selectedJob || shortlistMutation.isPending}
              className="btn-primary text-xs flex items-center gap-1.5">
              {shortlistMutation.isPending && <div className="w-3 h-3 border border-on-primary border-t-transparent rounded-full animate-spin" />}
              Add to Pipeline
            </button>
          </div>
        </div>
      </Modal>

      {/* ─── Email Drafter Modal ─── */}
      <Modal open={emailOpen} onClose={() => { setEmailOpen(false); setEmailResult(null) }} title="AI Email Drafter" size="sm">
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-secondary mb-1.5 block">Email Type</label>
            <div className="grid grid-cols-2 gap-2">
              {EMAIL_TYPES.map(et => (
                <button key={et.value} onClick={() => setEmailType(et.value)}
                  className={`flex items-center gap-2 p-2.5 rounded-lg border text-left transition-colors ${emailType === et.value ? 'border-primary bg-primary/5 text-primary' : 'border-outline-variant text-secondary hover:border-primary'}`}>
                  <span className="ms text-[16px]">{et.icon}</span>
                  <span className="text-xs font-medium">{et.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-secondary mb-1.5 block">Job (optional)</label>
            <select value={emailJob} onChange={e => setEmailJob(e.target.value)} className="input-base text-xs">
              <option value="">No specific job</option>
              {jobs.map((j: { id: string; title: string; req_id: string }) => (
                <option key={j.id} value={j.id}>{j.req_id} – {j.title}</option>
              ))}
            </select>
          </div>

          {!emailResult ? (
            <button onClick={handleDraftEmail} disabled={emailLoading}
              className="btn-primary text-xs w-full flex items-center justify-center gap-2">
              {emailLoading
                ? <><div className="w-3 h-3 border border-on-primary border-t-transparent rounded-full animate-spin" />Generating with Gemini…</>
                : <><span className="ms ms-filled text-[15px]">auto_awesome</span>Draft with Gemini</>
              }
            </button>
          ) : (
            <div className="space-y-3">
              <div className="p-3 bg-surface-container rounded-lg border border-outline-variant">
                <div className="text-[9px] font-bold text-secondary uppercase mb-1">Subject</div>
                <div className="text-xs font-semibold text-primary">{emailResult.subject}</div>
              </div>
              <div className="p-3 bg-surface-container rounded-lg border border-outline-variant">
                <div className="text-[9px] font-bold text-secondary uppercase mb-1">Body</div>
                <pre className="text-xs text-on-surface leading-relaxed whitespace-pre-wrap font-sans">{emailResult.body}</pre>
              </div>
              {emailResult.ai_powered && (
                <div className="text-[10px] text-secondary text-center flex items-center justify-center gap-1">
                  <span className="ms ms-filled text-[12px] text-violet-500">auto_awesome</span> Generated by Gemini AI
                </div>
              )}
              <div className="flex gap-2">
                <button onClick={copyEmail}
                  className={`flex-1 flex items-center justify-center gap-1.5 text-xs py-2 rounded border transition-colors ${copied ? 'border-emerald-300 bg-emerald-50 text-emerald-700' : 'btn-secondary'}`}>
                  <span className="ms text-[15px]">{copied ? 'check' : 'content_copy'}</span>
                  {copied ? 'Copied!' : 'Copy to Clipboard'}
                </button>
                <button onClick={() => setEmailResult(null)} className="btn-secondary text-xs px-3">
                  <span className="ms text-[15px]">refresh</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  )
}
