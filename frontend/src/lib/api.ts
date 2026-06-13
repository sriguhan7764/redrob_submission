import axios, { AxiosInstance } from 'axios'

const api: AxiosInstance = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config
    if (err.response?.status === 401 && !original._retry) {
      original._retry = true
      const refresh = localStorage.getItem('refresh_token')
      if (refresh) {
        try {
          const { data } = await axios.post('/api/auth/refresh', { refresh_token: refresh })
          localStorage.setItem('access_token', data.access_token)
          localStorage.setItem('refresh_token', data.refresh_token)
          original.headers.Authorization = `Bearer ${data.access_token}`
          return api(original)
        } catch {
          localStorage.clear()
          window.location.href = '/login'
        }
      } else {
        localStorage.clear()
        window.location.href = '/login'
      }
    }
    return Promise.reject(err)
  }
)

export default api

// Auth
export const authApi = {
  login: (email: string, password: string) => api.post('/auth/login', { email, password }),
  me: () => api.get('/auth/me'),
  logout: () => api.post('/auth/logout'),
  refresh: (token: string) => api.post('/auth/refresh', { refresh_token: token }),
}

// Candidates
export const candidatesApi = {
  list: (params?: Record<string, unknown>) => api.get('/candidates', { params }),
  get: (id: string) => api.get(`/candidates/${id}`),
  shortlist: (job_id: string, candidate_id: string) => api.post('/candidates/shortlist', { job_id, candidate_id }),
  updateStage: (shortlist_id: string, stage: string) => api.patch(`/candidates/shortlist/${shortlist_id}`, { stage }),
  removeShortlist: (shortlist_id: string) => api.delete(`/candidates/shortlist/${shortlist_id}`),
  bulkShortlist: (job_id: string, candidate_ids: string[]) => api.post('/candidates/bulk-shortlist', { job_id, candidate_ids }),
  toggleFavorite: (id: string) => api.post(`/candidates/${id}/favorite`),
  export: async (params?: Record<string, string>) => {
    const res = await api.get('/candidates/export', { params, responseType: 'blob' })
    const url = URL.createObjectURL(res.data)
    const a = document.createElement('a')
    a.href = url
    a.download = 'candidates_export.csv'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  },
  getNotes: (id: string) => api.get(`/candidates/${id}/notes`),
  addNote: (id: string, content: string, note_type = 'general') =>
    api.post(`/candidates/${id}/notes`, { content, note_type }),
  deleteNote: (candidateId: string, noteId: string) =>
    api.delete(`/candidates/${candidateId}/notes/${noteId}`),
  summarizeNotes: (id: string) => api.get(`/candidates/${id}/summarize-notes`),
  getInterviewKit: (id: string) => api.get(`/candidates/${id}/interview-kit`),
  aiSearch: (query: string) => api.post('/candidates/ai-search', { query }),
  fitAnalysis: (id: string, job_id: string) =>
    api.post(`/candidates/${id}/fit-analysis`, { job_id }),
  draftEmail: (id: string, job_id: string | null, email_type: string) =>
    api.post(`/candidates/${id}/draft-email`, { job_id, email_type }),
}

// Jobs
export const jobsApi = {
  list: () => api.get('/jobs'),
  get: (id: string) => api.get(`/jobs/${id}`),
  create: (data: Record<string, unknown>) => api.post('/jobs', data),
  update: (id: string, data: Record<string, unknown>) => api.patch(`/jobs/${id}`, data),
  delete: (id: string) => api.delete(`/jobs/${id}`),
  pipeline: (id: string) => api.get(`/jobs/${id}/pipeline`),
  analyzeJd: (id: string, description: string, title: string) =>
    api.post(`/jobs/${id}/analyze-jd`, { description, title }),
}

// Users (admin)
export const usersApi = {
  list: () => api.get('/users'),
  create: (data: Record<string, unknown>) => api.post('/users', data),
  update: (id: string, data: Record<string, unknown>) => api.patch(`/users/${id}`, data),
  delete: (id: string) => api.delete(`/users/${id}`),
}

// Analytics
export const analyticsApi = {
  overview: () => api.get('/analytics/overview'),
  scoreTrend: () => api.get('/analytics/score-trend'),
  skillsFrequency: () => api.get('/analytics/skills-frequency'),
  workMode: () => api.get('/analytics/work-mode'),
  conversion: () => api.get('/analytics/conversion'),
  export: async () => {
    const res = await api.get('/candidates/export', { responseType: 'blob' })
    const url = URL.createObjectURL(res.data)
    const a = document.createElement('a')
    a.href = url
    a.download = 'all_candidates.csv'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  },
}
