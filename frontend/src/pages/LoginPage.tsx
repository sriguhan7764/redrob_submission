import { useState, FormEvent } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'

export default function LoginPage() {
  const { login, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPwd, setShowPwd] = useState(false)

  if (isAuthenticated) return <Navigate to="/dashboard" replace />

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
      navigate('/dashboard', { replace: true })
    } catch {
      setError('Invalid email or password. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const fillDemo = (role: 'admin' | 'recruiter' | 'manager') => {
    const creds = {
      admin: ['admin@redrob.ai', 'Admin@123'],
      recruiter: ['recruiter@redrob.ai', 'Recruiter@123'],
      manager: ['manager@redrob.ai', 'Manager@123'],
    }
    setEmail(creds[role][0])
    setPassword(creds[role][1])
    setError('')
  }

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-primary rounded-xl mb-3">
            <span className="ms ms-filled text-on-primary text-[24px]">psychology</span>
          </div>
          <h1 className="text-xl font-black text-primary tracking-tight">TalentAI</h1>
          <p className="text-xs text-secondary mt-1">Intelligent Candidate Discovery Platform</p>
        </div>

        <div className="card">
          <h2 className="text-sm font-bold text-primary mb-4">Sign in to your account</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-secondary mb-1.5">Email address</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@company.com"
                required
                className="input-base"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-secondary mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPwd ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="input-base pr-10"
                />
                <button type="button" onClick={() => setShowPwd(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary hover:text-on-surface">
                  <span className="ms text-[18px]">{showPwd ? 'visibility_off' : 'visibility'}</span>
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                <span className="ms text-[16px] shrink-0">error</span>
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
              {loading ? (
                <><div className="w-4 h-4 border-2 border-on-primary border-t-transparent rounded-full animate-spin" /> Signing in…</>
              ) : (
                <><span className="ms text-[18px]">login</span> Sign in</>
              )}
            </button>
          </form>

          {/* Demo credentials */}
          <div className="mt-5 pt-4 border-t border-outline-variant">
            <p className="text-[10px] text-secondary text-center mb-2 font-medium uppercase tracking-wide">Demo accounts</p>
            <div className="grid grid-cols-3 gap-2">
              {(['admin', 'recruiter', 'manager'] as const).map(role => (
                <button key={role} onClick={() => fillDemo(role)}
                  className="text-[10px] font-semibold py-1.5 px-2 rounded border border-outline-variant text-secondary hover:border-primary hover:text-primary transition-colors capitalize">
                  {role}
                </button>
              ))}
            </div>
          </div>
        </div>

        <p className="text-center text-[10px] text-secondary mt-4">
          Redrob Intelligent Candidate Discovery Challenge
        </p>
      </div>
    </div>
  )
}
