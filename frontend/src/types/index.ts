export type UserRole = 'admin' | 'recruiter' | 'hiring_manager'

export interface User {
  id: string
  email: string
  full_name: string
  role: UserRole
  department?: string
  avatar_initials?: string
  is_active: boolean
  created_at: string
  last_login?: string
}

export interface AuthState {
  user: User | null
  access_token: string | null
  refresh_token: string | null
  isAuthenticated: boolean
}

export interface SignalScores {
  title_role: number
  skills_match: number
  experience_fit: number
  career_trajectory: number
  behavioral_signals: number
  education_prestige: number
}

export interface Skill {
  name: string
  proficiency: 'beginner' | 'intermediate' | 'advanced' | 'expert'
  endorsements: number
  duration_months: number
  _name_norm?: string
}

export interface CareerEntry {
  title: string
  company: string
  duration_months: number
  is_current: boolean
  industry: string
  start_date?: string
  end_date?: string
}

export interface EducationEntry {
  institution: string
  degree: string
  field_of_study: string
  start_year: number
  end_year: number
  tier: string
  grade?: string
}

export interface RedrobSignals {
  open_to_work_flag: boolean
  last_active_date: string
  recruiter_response_rate: number
  avg_response_time_hours: number
  notice_period_days: number
  github_activity_score: number
  profile_completeness_score: number
  interview_completion_rate: number
  offer_acceptance_rate: number
  preferred_work_mode: string
  willing_to_relocate: boolean
  profile_views_received_30d: number
  saved_by_recruiters_30d: number
  applications_submitted_30d: number
  connection_count: number
  endorsements_received: number
  expected_salary_range_inr_lpa: { min: number; max: number }
  skill_assessment_scores: Record<string, number>
}

// Matches backend CandidateListItem schema
export interface CandidateListItem {
  id: string
  candidate_id?: string  // alias for frontend nav
  rank: number
  score: number
  final_score?: number   // alias
  reasoning?: string
  name?: string
  current_title?: string
  current_company?: string
  years_of_experience?: number
  location?: string
  current_industry?: string
  open_to_work: number  // 0 or 1
  notice_period_days?: number
  recruiter_response_rate?: number
  github_activity_score?: number
  preferred_work_mode?: string
  willing_to_relocate?: number
  expected_salary_min?: number
  expected_salary_max?: number
  behavioral_multiplier?: number
  honeypot_penalty?: number
  signals_json?: SignalScores
  skills_json?: Array<{ name: string; proficiency?: string; duration_months?: number; endorsed?: boolean }>
  is_shortlisted?: boolean
  // top-level convenience
  top_skills?: string[]
  signal_scores?: SignalScores
}

// Matches backend CandidateDetail schema
export interface CandidateDetail extends CandidateListItem {
  headline?: string
  summary?: string
  profile_json?: Record<string, unknown>
  education_json?: Array<{
    institution: string
    degree?: string
    field?: string
    graduation_year?: number
    gpa?: number
  }>
  career_summary_json?: Array<{
    company: string
    title: string
    start_date?: string
    end_date?: string
    duration_months?: number
    description?: string
  }>
  redrob_signals_json?: Record<string, unknown>
  // Convenience aliases used in UI
  career_history?: Array<{
    company: string
    title: string
    start_date?: string
    end_date?: string
    duration_months?: number
    description?: string
  }>
  skills?: Array<{
    name: string
    proficiency?: string
    duration_months?: number
    endorsed?: boolean
  }>
  education?: Array<{
    institution: string
    degree?: string
    field?: string
    graduation_year?: number
    gpa?: number
  }>
  redrob_signals?: {
    recruiter_response_rate?: number
    last_active_days?: number
    notice_period_days?: number
    github_stars?: number
    preferred_work_mode?: string
  }
}

export interface CandidateListResponse {
  total: number
  page: number
  per_page: number
  results: CandidateListItem[]
}

export interface Job {
  id: string
  req_id: string
  title: string
  description?: string
  department?: string
  location?: string
  work_mode: string
  experience_min?: number
  experience_max?: number
  salary_min?: number
  salary_max?: number
  status: string
  created_at: string
  shortlist_count?: number
}

export type PipelineStage = 'screening' | 'shortlisted' | 'interview' | 'offer' | 'hired' | 'rejected'

export interface PipelineCard {
  shortlist_id: string
  candidate_id: string
  name?: string
  current_title?: string
  current_company?: string
  final_score: number
  score?: number
  rank: number
  open_to_work: number
  notice_period_days?: number
  stage: PipelineStage
  reasoning?: string
  added_at: string
}

export interface AnalyticsOverview {
  total_candidates: number
  avg_score: number
  open_to_work: number
  total_shortlisted: number
  active_jobs: number
  hired: number
  in_interview: number
  avg_years_experience: number
  score_distribution: Array<{ bucket: string; count: number }>
  top_companies: Array<{ company: string; count: number }>
  pipeline_stages: Array<{ stage: string; count: number }>
}
