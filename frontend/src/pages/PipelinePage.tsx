import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSearchParams, useNavigate } from 'react-router-dom'
import {
  DndContext, DragEndEvent, PointerSensor, useSensor, useSensors,
  DragOverlay, DragStartEvent, DragOverEvent, closestCenter, useDroppable,
} from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import Header from '@/components/Layout/Header'
import ScoreRing from '@/components/ui/ScoreRing'
import Badge from '@/components/ui/Badge'
import { candidatesApi, jobsApi } from '@/lib/api'
import { stageBadgeClass, stageLabel, scoreColor } from '@/lib/utils'
import { useToast } from '@/contexts/ToastContext'
import type { PipelineCard } from '@/types'

const STAGES = ['screening', 'shortlisted', 'interview', 'offer', 'hired', 'rejected'] as const
type Stage = typeof STAGES[number]

const STAGE_ICONS: Record<Stage, string> = {
  screening: 'manage_search',
  shortlisted: 'bookmark',
  interview: 'groups',
  offer: 'description',
  hired: 'check_circle',
  rejected: 'cancel',
}

const STAGE_COLORS: Record<Stage, string> = {
  screening: 'border-outline-variant bg-surface-container/30',
  shortlisted: 'border-blue-200 bg-blue-50/30',
  interview: 'border-purple-200 bg-purple-50/30',
  offer: 'border-amber-200 bg-amber-50/30',
  hired: 'border-emerald-200 bg-emerald-50/40',
  rejected: 'border-red-200 bg-red-50/30',
}

const STAGE_HEADER_COLORS: Record<Stage, string> = {
  screening: 'border-outline-variant text-secondary',
  shortlisted: 'border-blue-200 text-blue-700',
  interview: 'border-purple-200 text-purple-700',
  offer: 'border-amber-200 text-amber-700',
  hired: 'border-emerald-200 text-emerald-700',
  rejected: 'border-red-200 text-red-600',
}

const COUNT_BG: Record<Stage, string> = {
  screening: 'bg-surface-container text-secondary',
  shortlisted: 'bg-blue-100 text-blue-700',
  interview: 'bg-purple-100 text-purple-700',
  offer: 'bg-amber-100 text-amber-700',
  hired: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-red-100 text-red-700',
}

// ─── Sortable Card ────────────────────────────────────────────────────────────

function KanbanCard({ card, onClick, isDragActive }: { card: PipelineCard; onClick: () => void; isDragActive?: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: card.shortlist_id })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    cursor: isDragging ? 'grabbing' : 'grab',
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="bg-surface-bright border border-outline-variant rounded-lg p-2.5 shadow-sm hover:shadow-card transition-shadow group select-none"
      onClick={e => { if (!isDragActive) onClick() }}
    >
      <div className="flex items-start gap-2">
        <ScoreRing score={card.final_score ?? card.score ?? 0} size={32} strokeWidth={3} />
        <div className="flex-1 min-w-0">
          <div className="text-[11px] font-bold text-primary truncate leading-tight">{card.name}</div>
          <div className="text-[9px] text-secondary truncate mt-0.5">{card.current_title}</div>
          <div className="text-[9px] text-secondary truncate">{card.current_company}</div>
        </div>
      </div>
      <div className="flex items-center gap-2 mt-2">
        {card.open_to_work === 1 && (
          <span className="text-[8px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded-full font-medium">Available</span>
        )}
        {card.notice_period_days != null && (
          <span className="text-[8px] text-secondary flex items-center gap-0.5">
            <span className="ms text-[10px]">timer</span>{card.notice_period_days}d
          </span>
        )}
      </div>
      {card.reasoning && (
        <p className="text-[8px] text-secondary mt-1.5 line-clamp-2 leading-relaxed border-t border-outline-variant pt-1.5">{card.reasoning}</p>
      )}
    </div>
  )
}

// ─── Droppable Column ─────────────────────────────────────────────────────────

function KanbanColumn({
  stage, cards, onCardClick, isOver: isOverProp,
}: {
  stage: Stage; cards: PipelineCard[]; onCardClick: (id: string) => void; isOver: boolean;
}) {
  const { setNodeRef } = useDroppable({ id: stage })

  return (
    <div
      className={`flex flex-col rounded-xl border min-w-[200px] w-[210px] shrink-0 transition-colors ${STAGE_COLORS[stage]} ${isOverProp ? 'ring-2 ring-primary ring-offset-1' : ''}`}
    >
      {/* Column header */}
      <div className={`px-3 py-2.5 border-b flex items-center gap-2 ${STAGE_COLORS[stage].split(' ')[0]}`}>
        <span className={`ms ms-filled text-[16px] ${STAGE_HEADER_COLORS[stage].split(' ')[1]}`}>{STAGE_ICONS[stage]}</span>
        <span className={`text-[11px] font-bold flex-1 ${STAGE_HEADER_COLORS[stage].split(' ')[1]}`}>{stageLabel(stage)}</span>
        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${COUNT_BG[stage]}`}>{cards.length}</span>
      </div>

      {/* Drop area */}
      <div ref={setNodeRef} className="flex-1 p-2 space-y-2 overflow-y-auto max-h-[calc(100vh-220px)] min-h-[80px]">
        <SortableContext items={cards.map(c => c.shortlist_id)} strategy={verticalListSortingStrategy}>
          {cards.length === 0 ? (
            <div className={`flex flex-col items-center justify-center h-20 rounded-lg border-2 border-dashed transition-colors ${isOverProp ? 'border-primary bg-primary/5' : 'border-outline-variant opacity-50'}`}>
              <span className="ms text-[20px] text-secondary">inbox</span>
              <span className="text-[9px] mt-0.5 text-secondary">Drop here</span>
            </div>
          ) : (
            cards.map(c => (
              <KanbanCard key={c.shortlist_id} card={c} onClick={() => onCardClick(c.candidate_id)} />
            ))
          )}
        </SortableContext>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function PipelinePage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const jobId = searchParams.get('job_id') || ''
  const qc = useQueryClient()
  const toast = useToast()
  const [activeCard, setActiveCard] = useState<PipelineCard | null>(null)
  const [overId, setOverId] = useState<string | null>(null)

  const { data: jobsData } = useQuery({ queryKey: ['jobs'], queryFn: () => jobsApi.list() })
  const jobs = jobsData?.data ?? []
  const [selectedJob, setSelectedJob] = useState(jobId || (jobs[0]?.id ?? ''))

  // Auto-select first job if none selected
  useEffect(() => {
    if (!selectedJob && jobs.length > 0) setSelectedJob(jobs[0].id)
  }, [jobs, selectedJob])

  useEffect(() => { if (jobId) setSelectedJob(jobId) }, [jobId])

  const { data: pipelineData, isLoading } = useQuery({
    queryKey: ['pipeline', selectedJob],
    queryFn: () => jobsApi.pipeline(selectedJob),
    enabled: !!selectedJob,
    refetchInterval: 30000,
  })

  // pipeline keyed by stage
  const pipelineByStage: Record<Stage, PipelineCard[]> = pipelineData?.data?.pipeline ?? {}

  const updateStage = useMutation({
    mutationFn: ({ shortlist_id, stage }: { shortlist_id: string; stage: string }) =>
      candidatesApi.updateStage(shortlist_id, stage),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['pipeline', selectedJob] })
      toast.success(`Moved to ${stageLabel(vars.stage as Stage)}`)
    },
    onError: () => toast.error('Failed to update stage'),
  })

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  const allCards = STAGES.flatMap(s => pipelineByStage[s] ?? [])

  const handleDragStart = (e: DragStartEvent) => {
    const card = allCards.find(c => c.shortlist_id === e.active.id)
    setActiveCard(card ?? null)
  }

  const handleDragOver = (e: DragOverEvent) => {
    setOverId(e.over?.id?.toString() ?? null)
  }

  const handleDragEnd = (e: DragEndEvent) => {
    setActiveCard(null)
    setOverId(null)
    const { active, over } = e
    if (!over) return

    const card = allCards.find(c => c.shortlist_id === active.id)
    if (!card) return

    // Determine target stage: over could be a stage ID (column droppable) or a card ID
    let targetStage: Stage | undefined

    if (STAGES.includes(over.id as Stage)) {
      // Dropped directly on a column
      targetStage = over.id as Stage
    } else {
      // Dropped on a card — find which stage that card belongs to
      targetStage = STAGES.find(s =>
        (pipelineByStage[s] ?? []).some(c => c.shortlist_id === over.id)
      )
    }

    if (targetStage && targetStage !== card.stage) {
      updateStage.mutate({ shortlist_id: card.shortlist_id, stage: targetStage })
    }
  }

  const handleJobChange = (jobId: string) => {
    setSelectedJob(jobId)
    setSearchParams({ job_id: jobId })
  }

  const selectedJobData = jobs.find((j: { id: string }) => j.id === selectedJob)

  // For isOver highlighting: determine which stage the drag is currently over
  const getIsOver = (stage: Stage): boolean => {
    if (!overId) return false
    if (overId === stage) return true
    // Check if hovering over a card in this stage
    return (pipelineByStage[stage] ?? []).some(c => c.shortlist_id === overId)
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <Header
        title="Hiring Pipeline"
        subtitle={selectedJobData ? `${selectedJobData.req_id} — ${selectedJobData.title}` : 'Select a job to view pipeline'}
        actions={
          <div className="flex items-center gap-2">
            <select value={selectedJob} onChange={e => handleJobChange(e.target.value)}
              className="input-base text-xs py-1.5 min-w-[220px]">
              <option value="">Select job requisition…</option>
              {jobs.map((j: { id: string; req_id: string; title: string }) => (
                <option key={j.id} value={j.id}>{j.req_id} – {j.title}</option>
              ))}
            </select>
            {updateStage.isPending && (
              <div className="flex items-center gap-1.5 text-xs text-secondary">
                <div className="w-3.5 h-3.5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                Saving…
              </div>
            )}
          </div>
        }
      />

      <main className="flex-1 overflow-auto p-4">
        {!selectedJob ? (
          <div className="flex flex-col items-center justify-center h-64 text-secondary">
            <span className="ms text-[48px] mb-2">view_kanban</span>
            <p className="text-sm font-medium">Select a job requisition</p>
            <p className="text-xs mt-1">Choose a role from the dropdown above</p>
          </div>
        ) : isLoading ? (
          <div className="flex gap-3">
            {STAGES.map(s => (
              <div key={s} className="w-[210px] h-72 bg-surface-container rounded-xl animate-pulse shrink-0" />
            ))}
          </div>
        ) : (
          <>
            {/* Stage summary bar */}
            <div className="flex gap-2 mb-3 flex-wrap">
              {STAGES.map(s => {
                const cnt = (pipelineByStage[s] ?? []).length
                if (cnt === 0) return null
                return (
                  <div key={s} className={`flex items-center gap-1 text-[10px] font-medium px-2.5 py-1 rounded-full border ${COUNT_BG[s]} ${STAGE_COLORS[s].split(' ')[0]}`}>
                    <span className="ms ms-filled text-[12px]">{STAGE_ICONS[s]}</span>
                    {stageLabel(s)}: <strong>{cnt}</strong>
                  </div>
                )
              })}
            </div>

            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDragEnd={handleDragEnd}
            >
              <div className="flex gap-3 pb-4">
                {STAGES.map(stage => (
                  <KanbanColumn
                    key={stage}
                    stage={stage}
                    cards={pipelineByStage[stage] ?? []}
                    onCardClick={id => navigate(`/candidates/${id}`)}
                    isOver={getIsOver(stage)}
                  />
                ))}
              </div>

              <DragOverlay dropAnimation={{ duration: 150, easing: 'ease-out' }}>
                {activeCard ? (
                  <div className="bg-surface-bright border-2 border-primary rounded-lg p-2.5 shadow-modal w-[200px] rotate-1">
                    <div className="flex items-center gap-2">
                      <ScoreRing score={activeCard.final_score ?? activeCard.score ?? 0} size={32} strokeWidth={3} />
                      <div>
                        <div className="text-[11px] font-bold text-primary truncate">{activeCard.name}</div>
                        <div className="text-[9px] text-secondary">{activeCard.current_title}</div>
                      </div>
                    </div>
                  </div>
                ) : null}
              </DragOverlay>
            </DndContext>
          </>
        )}
      </main>
    </div>
  )
}
