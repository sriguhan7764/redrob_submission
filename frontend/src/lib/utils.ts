import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function scoreColor(score: number): string {
  if (score >= 0.90) return '#166534'
  if (score >= 0.80) return '#1e40af'
  if (score >= 0.70) return '#92400e'
  return '#7f1d1d'
}

export function scoreBgClass(score: number): string {
  if (score >= 0.90) return 'bg-green-50 text-green-800 border-green-200'
  if (score >= 0.80) return 'bg-blue-50 text-blue-800 border-blue-200'
  if (score >= 0.70) return 'bg-amber-50 text-amber-800 border-amber-200'
  return 'bg-red-50 text-red-800 border-red-200'
}

export function stageBadgeClass(stage: string): string {
  const map: Record<string, string> = {
    screening: 'bg-surface-container text-secondary border-outline-variant',
    shortlisted: 'bg-blue-50 text-blue-800 border-blue-200',
    interview: 'bg-amber-50 text-amber-800 border-amber-200',
    offer: 'bg-purple-50 text-purple-800 border-purple-200',
    hired: 'bg-green-50 text-green-800 border-green-200',
    rejected: 'bg-red-50 text-red-800 border-red-200',
  }
  return map[stage] ?? 'bg-surface-container text-secondary border-outline-variant'
}

export function stageLabel(stage: string): string {
  const map: Record<string, string> = {
    screening: 'Screening',
    shortlisted: 'Shortlisted',
    interview: 'Interview',
    offer: 'Offer',
    hired: 'Hired',
    rejected: 'Rejected',
  }
  return map[stage] ?? stage
}

export function formatDate(d?: string | null): string {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' })
}

export function daysAgo(d?: string | null): number {
  if (!d) return 9999
  return Math.floor((Date.now() - new Date(d).getTime()) / 86400000)
}

export function roleLabel(role: string): string {
  const map: Record<string, string> = {
    admin: 'Admin',
    recruiter: 'Recruiter',
    hiring_manager: 'Hiring Manager',
  }
  return map[role] ?? role
}

export function roleColor(role: string): string {
  const map: Record<string, string> = {
    admin: 'bg-red-50 text-red-800 border-red-200',
    recruiter: 'bg-blue-50 text-blue-800 border-blue-200',
    hiring_manager: 'bg-purple-50 text-purple-800 border-purple-200',
  }
  return map[role] ?? 'bg-surface-container text-secondary border-outline-variant'
}
