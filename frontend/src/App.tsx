import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import { ToastProvider } from '@/contexts/ToastContext'
import AppLayout from '@/components/Layout/AppLayout'
import LoginPage from '@/pages/LoginPage'
import DashboardPage from '@/pages/DashboardPage'
import CandidatesPage from '@/pages/CandidatesPage'
import CandidateDetailPage from '@/pages/CandidateDetailPage'
import JobsPage from '@/pages/JobsPage'
import PipelinePage from '@/pages/PipelinePage'
import AnalyticsPage from '@/pages/AnalyticsPage'
import AdminPage from '@/pages/AdminPage'
import ComparePage from '@/pages/ComparePage'

const qc = new QueryClient({ defaultOptions: { queries: { staleTime: 30000, retry: 1 } } })

function AdminGuard({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  return user?.role === 'admin' ? <>{children}</> : <Navigate to="/dashboard" replace />
}

export default function App() {
  return (
    <QueryClientProvider client={qc}>
      <AuthProvider>
        <ToastProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route element={<AppLayout />}>
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/candidates" element={<CandidatesPage />} />
                <Route path="/candidates/:id" element={<CandidateDetailPage />} />
                <Route path="/compare" element={<ComparePage />} />
                <Route path="/pipeline" element={<PipelinePage />} />
                <Route path="/jobs" element={<JobsPage />} />
                <Route path="/analytics" element={<AnalyticsPage />} />
                <Route path="/admin" element={<AdminGuard><AdminPage /></AdminGuard>} />
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </ToastProvider>
      </AuthProvider>
    </QueryClientProvider>
  )
}
