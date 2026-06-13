import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import Header from '@/components/Layout/Header'
import Modal from '@/components/ui/Modal'
import Badge from '@/components/ui/Badge'
import { jobsApi } from '@/lib/api'
import { formatDate } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'

interface JobForm {
  title: string
  department: string
  location: string
  work_mode: string
  experience_min: number
  experience_max: number
  description: string
}

const STATUS_BADGE: Record<string, 'default' | 'open' | 'warning' | 'danger'> = {
  open: 'open',
  active: 'open',
  closed: 'danger',
  on_hold: 'warning',
  draft: 'default',
}

export default function JobsPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const toast = useToast()
  const [createOpen, setCreateOpen] = useState(false)
  const [jdAnalysis, setJdAnalysis] = useState<Record<string, unknown> | null>(null)
  const [jdLoading, setJdLoading] = useState(false)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  const { data, isLoading } = useQuery({ queryKey: ['jobs'], queryFn: () => jobsApi.list() })
  const jobs = data?.data ?? []

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<JobForm>({
    defaultValues: { work_mode: 'remote', experience_min: 2, experience_max: 6 },
  })

  const createMutation = useMutation({
    mutationFn: (d: JobForm) => jobsApi.create(d as unknown as Record<string, unknown>),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['jobs'] })
      setCreateOpen(false)
      setJdAnalysis(null)
      reset()
      toast.success('Job requisition created!')
    },
    onError: () => toast.error('Failed to create job'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => jobsApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['jobs'] })
      setDeleteConfirmId(null)
      toast.success('Job deleted')
    },
    onError: () => toast.error('Failed to delete job'),
  })

  const descriptionValue = watch('description')
  const titleValue = watch('title')

  const handleAnalyzeJd = async () => {
    if (!descriptionValue?.trim()) {
      toast.warning('Enter a job description first')
      return
    }
    setJdLoading(true)
    try {
      const res = await jobsApi.analyzeJd('new', descriptionValue, titleValue || 'New Role')
      setJdAnalysis(res.data)
      toast.success('JD analysed by Gemini!')
    } catch {
      toast.error('JD analysis failed')
    } finally {
      setJdLoading(false)
    }
  }

  const canCreate = user?.role === 'admin' || user?.role === 'recruiter'
  const canDelete = user?.role === 'admin'

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <Header
        title="Job Requisitions"
        subtitle={`${jobs.length} requisitions`}
        actions={canCreate ? (
          <button onClick={() => { setCreateOpen(true); setJdAnalysis(null) }} className="btn-primary flex items-center gap-1.5 text-xs">
            <span className="ms text-[16px]">add</span> New Requisition
          </button>
        ) : undefined}
      />

      <main className="flex-1 overflow-y-auto p-6">
        {isLoading ? (
          <div className="grid gap-3">
            {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-24 bg-surface-container rounded-lg animate-pulse" />)}
          </div>
        ) : jobs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-secondary">
            <span className="ms text-[48px] mb-2">work_off</span>
            <p className="text-sm font-medium">No job requisitions yet</p>
            {canCreate && <button onClick={() => setCreateOpen(true)} className="btn-primary mt-3 text-xs">Create first requisition</button>}
          </div>
        ) : (
          <div className="grid gap-3 max-w-3xl">
            {jobs.map((j: { id: string; req_id: string; title: string; department?: string; location?: string; work_mode?: string; status: string; shortlist_count?: number; created_at?: string; experience_min?: number; experience_max?: number }) => (
              <div key={j.id} className="card group">
                <div className="flex items-start gap-4 cursor-pointer" onClick={() => navigate(`/pipeline?job_id=${j.id}`)}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-xs font-bold text-secondary font-mono">{j.req_id}</span>
                      <Badge variant={STATUS_BADGE[j.status] ?? 'default'}>
                        {j.status.replace('_', ' ')}
                      </Badge>
                      {j.experience_min != null && (
                        <span className="text-[10px] bg-surface-container border border-outline-variant px-1.5 py-0.5 rounded text-secondary">
                          {j.experience_min}–{j.experience_max}yr exp
                        </span>
                      )}
                    </div>
                    <div className="text-sm font-bold text-primary">{j.title}</div>
                    <div className="text-xs text-secondary mt-0.5">
                      {[j.department, j.location, j.work_mode].filter(Boolean).join(' · ')}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-lg font-black text-primary">{j.shortlist_count ?? 0}</div>
                    <div className="text-[10px] text-secondary">candidates</div>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-outline-variant">
                  <span className="text-[10px] text-secondary">{j.created_at ? `Created ${formatDate(j.created_at)}` : ''}</span>
                  <div className="flex items-center gap-2">
                    {canDelete && (
                      <button onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(j.id) }}
                        className="flex items-center gap-1 text-[10px] text-secondary hover:text-red-600 transition-colors px-2 py-1 rounded hover:bg-red-50">
                        <span className="ms text-[14px]">delete</span> Delete
                      </button>
                    )}
                    <button onClick={() => navigate(`/pipeline?job_id=${j.id}`)}
                      className="flex items-center gap-1 text-xs text-secondary group-hover:text-primary transition-colors">
                      View Pipeline <span className="ms text-[16px]">chevron_right</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Create Modal */}
      <Modal open={createOpen} onClose={() => { setCreateOpen(false); setJdAnalysis(null); reset() }} title="Create Job Requisition" size="sm">
        <form onSubmit={handleSubmit(d => createMutation.mutate(d))} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-xs font-semibold text-secondary mb-1.5 block">Job Title *</label>
              <input {...register('title', { required: true })} placeholder="e.g. Senior ML Engineer" className="input-base" />
              {errors.title && <span className="text-[10px] text-red-600">Required</span>}
            </div>
            <div>
              <label className="text-xs font-semibold text-secondary mb-1.5 block">Department</label>
              <input {...register('department')} placeholder="Engineering" className="input-base" />
            </div>
            <div>
              <label className="text-xs font-semibold text-secondary mb-1.5 block">Location</label>
              <input {...register('location')} placeholder="Remote / City" className="input-base" />
            </div>
            <div>
              <label className="text-xs font-semibold text-secondary mb-1.5 block">Work Mode</label>
              <select {...register('work_mode')} className="input-base">
                <option value="remote">Remote</option>
                <option value="hybrid">Hybrid</option>
                <option value="onsite">On-site</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-secondary mb-1.5 block">Experience (years)</label>
              <div className="flex items-center gap-2">
                <input {...register('experience_min', { valueAsNumber: true })} type="number" min={0} max={20} placeholder="Min" className="input-base" />
                <span className="text-secondary text-xs">–</span>
                <input {...register('experience_max', { valueAsNumber: true })} type="number" min={0} max={30} placeholder="Max" className="input-base" />
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-secondary">Job Description</label>
              <button type="button" onClick={handleAnalyzeJd} disabled={jdLoading}
                className="flex items-center gap-1.5 text-[10px] px-2.5 py-1 rounded border border-violet-300 text-violet-700 hover:bg-violet-100 transition-colors disabled:opacity-50">
                {jdLoading
                  ? <><div className="w-2.5 h-2.5 border border-violet-600 border-t-transparent rounded-full animate-spin" />Analysing…</>
                  : <><span className="ms ms-filled text-[12px]">auto_awesome</span>Analyse JD with Gemini</>
                }
              </button>
            </div>
            <textarea {...register('description')} rows={4} placeholder="Paste job description here…" className="input-base resize-none" />
          </div>

          {/* JD Analysis Panel */}
          {jdAnalysis && (
            <div className="bg-gradient-to-br from-violet-50 to-indigo-50 border border-violet-200 rounded-lg p-3 space-y-3">
              <div className="flex items-center gap-1.5">
                <span className="ms ms-filled text-[15px] text-violet-600">auto_awesome</span>
                <span className="text-[10px] font-bold text-violet-700">Gemini JD Analysis</span>
              </div>
              {Array.isArray(jdAnalysis.required_skills) && (
                <div>
                  <div className="text-[9px] font-bold text-secondary uppercase mb-1">Required Skills</div>
                  <div className="flex flex-wrap gap-1">
                    {(jdAnalysis.required_skills as string[]).map(s => (
                      <span key={s} className="text-[10px] bg-primary/10 border border-primary/20 text-primary px-1.5 py-0.5 rounded">{s}</span>
                    ))}
                  </div>
                </div>
              )}
              {Array.isArray(jdAnalysis.nice_to_have_skills) && jdAnalysis.nice_to_have_skills.length > 0 && (
                <div>
                  <div className="text-[9px] font-bold text-secondary uppercase mb-1">Nice to Have</div>
                  <div className="flex flex-wrap gap-1">
                    {(jdAnalysis.nice_to_have_skills as string[]).map(s => (
                      <span key={s} className="text-[10px] bg-surface-container border border-outline-variant text-secondary px-1.5 py-0.5 rounded">{s}</span>
                    ))}
                  </div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-2">
                <div className="text-[10px]">
                  <span className="text-secondary">Experience: </span>
                  <span className="font-semibold text-on-surface">{jdAnalysis.min_experience_years as number}–{jdAnalysis.max_experience_years as number} years</span>
                </div>
                <div className="text-[10px]">
                  <span className="text-secondary">Seniority: </span>
                  <span className="font-semibold text-on-surface">{jdAnalysis.seniority_level as string}</span>
                </div>
              </div>
              {!!jdAnalysis.candidate_profile && (
                <p className="text-[10px] text-secondary leading-relaxed">{String(jdAnalysis.candidate_profile)}</p>
              )}
              {Array.isArray(jdAnalysis.interview_focus_areas) && (
                <div>
                  <div className="text-[9px] font-bold text-secondary uppercase mb-1">Interview Focus</div>
                  <div className="flex flex-wrap gap-1">
                    {(jdAnalysis.interview_focus_areas as string[]).map(a => (
                      <span key={a} className="text-[10px] bg-amber-50 border border-amber-200 text-amber-700 px-1.5 py-0.5 rounded">{a}</span>
                    ))}
                  </div>
                </div>
              )}
              {!!jdAnalysis.market_notes && (
                <p className="text-[10px] text-secondary italic">{String(jdAnalysis.market_notes)}</p>
              )}
            </div>
          )}

          <div className="flex gap-2 justify-end pt-1">
            <button type="button" onClick={() => { setCreateOpen(false); setJdAnalysis(null); reset() }} className="btn-secondary text-xs">Cancel</button>
            <button type="submit" disabled={createMutation.isPending} className="btn-primary text-xs flex items-center gap-1.5">
              {createMutation.isPending && <div className="w-3 h-3 border border-on-primary border-t-transparent rounded-full animate-spin" />}
              Create Requisition
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirm Modal */}
      <Modal open={!!deleteConfirmId} onClose={() => setDeleteConfirmId(null)} title="Delete Job?" size="sm">
        <div className="space-y-4">
          <p className="text-xs text-secondary">This will permanently delete the job requisition. Candidates in the pipeline will be removed from this job.</p>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setDeleteConfirmId(null)} className="btn-secondary text-xs">Cancel</button>
            <button onClick={() => deleteConfirmId && deleteMutation.mutate(deleteConfirmId)}
              disabled={deleteMutation.isPending}
              className="text-xs px-3 py-1.5 rounded bg-red-600 text-white hover:bg-red-700 transition-colors flex items-center gap-1.5">
              {deleteMutation.isPending && <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />}
              Delete
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
