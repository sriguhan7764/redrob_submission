import { createContext, useContext, useState, useCallback, useRef } from 'react'

type ToastType = 'success' | 'error' | 'info' | 'warning'

interface Toast {
  id: string
  type: ToastType
  message: string
  duration?: number
}

interface ToastContextValue {
  toasts: Toast[]
  toast: {
    success: (msg: string, dur?: number) => void
    error: (msg: string, dur?: number) => void
    info: (msg: string, dur?: number) => void
    warning: (msg: string, dur?: number) => void
  }
  dismiss: (id: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const counter = useRef(0)

  const add = useCallback((type: ToastType, message: string, duration = 3500) => {
    const id = `toast-${++counter.current}`
    setToasts(prev => [...prev, { id, type, message, duration }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), duration)
  }, [])

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const toast = {
    success: (msg: string, dur?: number) => add('success', msg, dur),
    error: (msg: string, dur?: number) => add('error', msg, dur),
    info: (msg: string, dur?: number) => add('info', msg, dur),
    warning: (msg: string, dur?: number) => add('warning', msg, dur),
  }

  return (
    <ToastContext.Provider value={{ toasts, toast, dismiss }}>
      {children}
      <ToastContainer toasts={toasts} dismiss={dismiss} />
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx.toast
}

const ICONS: Record<ToastType, string> = {
  success: 'check_circle',
  error: 'error',
  info: 'info',
  warning: 'warning',
}
const COLORS: Record<ToastType, string> = {
  success: 'border-l-emerald-500 bg-emerald-50 text-emerald-800',
  error: 'border-l-red-500 bg-red-50 text-red-800',
  info: 'border-l-blue-500 bg-blue-50 text-blue-800',
  warning: 'border-l-amber-500 bg-amber-50 text-amber-800',
}
const ICON_COLORS: Record<ToastType, string> = {
  success: 'text-emerald-500',
  error: 'text-red-500',
  info: 'text-blue-500',
  warning: 'text-amber-500',
}

function ToastContainer({ toasts, dismiss }: { toasts: Toast[]; dismiss: (id: string) => void }) {
  if (!toasts.length) return null
  return (
    <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 min-w-[300px] max-w-[380px]">
      {toasts.map(t => (
        <div key={t.id}
          className={`flex items-start gap-3 px-4 py-3 rounded-lg shadow-modal border-l-4 ${COLORS[t.type]} animate-in slide-in-from-right-5 fade-in`}>
          <span className={`ms ms-filled text-[20px] mt-0.5 shrink-0 ${ICON_COLORS[t.type]}`}>{ICONS[t.type]}</span>
          <span className="flex-1 text-sm font-medium leading-snug">{t.message}</span>
          <button onClick={() => dismiss(t.id)} className="shrink-0 opacity-50 hover:opacity-100 transition-opacity ml-1">
            <span className="ms text-[16px]">close</span>
          </button>
        </div>
      ))}
    </div>
  )
}
