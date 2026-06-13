import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import Header from '@/components/Layout/Header'
import Modal from '@/components/ui/Modal'
import Badge from '@/components/ui/Badge'
import { usersApi } from '@/lib/api'
import { roleLabel, roleColor, formatDate } from '@/lib/utils'
import type { User } from '@/types'

interface UserForm {
  full_name: string
  email: string
  password?: string
  role: 'admin' | 'recruiter' | 'hiring_manager'
}

export default function AdminPage() {
  const qc = useQueryClient()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<User | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null)

  const { data, isLoading } = useQuery({ queryKey: ['users'], queryFn: () => usersApi.list() })
  const users: User[] = data?.data ?? []

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<UserForm>()

  const openCreate = () => { setEditing(null); reset({ role: 'recruiter' }); setModalOpen(true) }
  const openEdit = (u: User) => {
    setEditing(u)
    setValue('full_name', u.full_name)
    setValue('email', u.email)
    setValue('role', u.role as UserForm['role'])
    setModalOpen(true)
  }

  const saveMutation = useMutation({
    mutationFn: (d: UserForm) => editing ? usersApi.update(editing.id, d as unknown as Record<string, unknown>) : usersApi.create(d as unknown as Record<string, unknown>),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); setModalOpen(false); setEditing(null) },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => usersApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); setDeleteTarget(null) },
  })

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <Header
        title="User Management"
        subtitle="Admin-only — manage platform access"
        actions={
          <button onClick={openCreate} className="btn-primary flex items-center gap-1.5 text-xs">
            <span className="ms text-[16px]">person_add</span> Add User
          </button>
        }
      />

      <main className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl">
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-16 bg-surface-container rounded-lg animate-pulse" />)}
            </div>
          ) : (
            <div className="card p-0 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-outline-variant">
                    {['User', 'Role', 'Last Login', 'Actions'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-[10px] font-bold text-secondary uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {users.map((u, i) => (
                    <tr key={u.id} className={`border-b border-outline-variant last:border-0 hover:bg-surface-container/50 transition-colors ${i % 2 === 0 ? '' : 'bg-surface-container/20'}`}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center border border-outline-variant">
                            <span className="text-xs font-bold text-secondary">{u.avatar_initials || u.full_name[0]}</span>
                          </div>
                          <div>
                            <div className="text-xs font-semibold text-on-surface">{u.full_name}</div>
                            <div className="text-[11px] text-secondary">{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${roleColor(u.role)}`}>
                          {roleLabel(u.role)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-secondary">
                        {u.last_login ? formatDate(u.last_login) : 'Never'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button onClick={() => openEdit(u)}
                            className="p-1.5 rounded hover:bg-surface-container transition-colors text-secondary hover:text-on-surface">
                            <span className="ms text-[16px]">edit</span>
                          </button>
                          <button onClick={() => setDeleteTarget(u)}
                            className="p-1.5 rounded hover:bg-red-50 transition-colors text-secondary hover:text-red-600">
                            <span className="ms text-[16px]">delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Create/Edit modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit User' : 'Create User'} size="sm">
        <form onSubmit={handleSubmit(d => saveMutation.mutate(d))} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-secondary mb-1.5 block">Full Name *</label>
            <input {...register('full_name', { required: true })} placeholder="Jane Smith" className="input-base" />
            {errors.full_name && <span className="text-[10px] text-red-600">Required</span>}
          </div>
          <div>
            <label className="text-xs font-semibold text-secondary mb-1.5 block">Email *</label>
            <input {...register('email', { required: true })} type="email" placeholder="jane@company.com" className="input-base" />
            {errors.email && <span className="text-[10px] text-red-600">Required</span>}
          </div>
          <div>
            <label className="text-xs font-semibold text-secondary mb-1.5 block">{editing ? 'Password (leave blank to keep)' : 'Password *'}</label>
            <input {...register('password', { required: !editing })} type="password" placeholder="••••••••" className="input-base" />
            {errors.password && <span className="text-[10px] text-red-600">Required</span>}
          </div>
          <div>
            <label className="text-xs font-semibold text-secondary mb-1.5 block">Role *</label>
            <select {...register('role', { required: true })} className="input-base">
              <option value="recruiter">Recruiter</option>
              <option value="hiring_manager">Hiring Manager</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div className="flex gap-2 justify-end pt-1">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary text-xs">Cancel</button>
            <button type="submit" disabled={saveMutation.isPending} className="btn-primary text-xs flex items-center gap-1.5">
              {saveMutation.isPending ? <div className="w-3 h-3 border border-on-primary border-t-transparent rounded-full animate-spin" /> : null}
              {editing ? 'Save Changes' : 'Create User'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete confirm */}
      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete User" size="sm">
        <p className="text-xs text-secondary mb-4">
          Are you sure you want to delete <strong>{deleteTarget?.full_name}</strong>? This action cannot be undone.
        </p>
        <div className="flex gap-2 justify-end">
          <button onClick={() => setDeleteTarget(null)} className="btn-secondary text-xs">Cancel</button>
          <button onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
            disabled={deleteMutation.isPending}
            className="text-xs font-semibold px-3 py-1.5 rounded bg-red-600 text-white hover:bg-red-700 transition-colors flex items-center gap-1.5">
            {deleteMutation.isPending ? <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" /> : null}
            Delete User
          </button>
        </div>
      </Modal>
    </div>
  )
}
