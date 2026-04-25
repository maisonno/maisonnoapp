'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createUser, updateProfile, sendPasswordReset } from '../actions'

type Profile = {
  first_name: string | null
  last_name: string | null
  role: 'user' | 'admin'
  app_access: string[]
}

type UserEntry = {
  id: string
  email: string
  created_at: string
  last_sign_in_at: string | null
  profile: Profile | null
}

type ProjectOption = { slug: string; title: string }

function displayName(user: UserEntry) {
  const { first_name, last_name } = user.profile ?? {}
  const full = `${first_name ?? ''} ${last_name ?? ''}`.trim()
  return full || user.email
}

function Avatar({ name }: { name: string }) {
  return (
    <div className="w-8 h-8 rounded-full bg-blue-700 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0 select-none">
      {name.charAt(0).toUpperCase()}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function UserManagementClient({
  users,
  projects,
  currentUserId,
}: {
  users: UserEntry[]
  projects: ProjectOption[]
  currentUserId: string
}) {
  const router = useRouter()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)

  const selected = users.find((u) => u.id === selectedId) ?? null
  const refresh = () => router.refresh()

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-white">Utilisateurs</h1>
          <p className="text-slate-400 text-sm mt-0.5">
            {users.length} compte{users.length > 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="text-sm bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
        >
          + Créer un utilisateur
        </button>
      </div>

      {/* Split layout */}
      <div className="flex gap-5">
        {/* User list */}
        <div className="w-72 flex-shrink-0 space-y-1">
          {users.map((user) => (
            <button
              key={user.id}
              onClick={() => setSelectedId(user.id)}
              className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors border ${
                selectedId === user.id
                  ? 'bg-slate-800 border-slate-600'
                  : 'border-transparent hover:bg-slate-900'
              }`}
            >
              <div className="flex items-center gap-3">
                <Avatar name={displayName(user)} />
                <div className="min-w-0 flex-1">
                  <p className="text-white text-sm font-medium truncate">
                    {displayName(user)}
                  </p>
                  <p className="text-slate-400 text-xs truncate">{user.email}</p>
                </div>
                {user.profile?.role === 'admin' && (
                  <span className="text-xs px-1.5 py-0.5 rounded bg-purple-950 text-purple-400 border border-purple-900 flex-shrink-0">
                    admin
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>

        {/* Detail panel */}
        <div className="flex-1 min-w-0">
          {selected ? (
            <UserDetailPanel
              key={selected.id}
              user={selected}
              projects={projects}
              isCurrentUser={selected.id === currentUserId}
              onSaved={refresh}
            />
          ) : (
            <div className="flex items-center justify-center h-48 text-slate-500 text-sm card">
              Sélectionne un utilisateur
            </div>
          )}
        </div>
      </div>

      {showCreate && (
        <CreateUserModal
          projects={projects}
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); refresh() }}
        />
      )}
    </div>
  )
}

// ─── Detail panel ─────────────────────────────────────────────────────────────

function UserDetailPanel({
  user,
  projects,
  isCurrentUser,
  onSaved,
}: {
  user: UserEntry
  projects: ProjectOption[]
  isCurrentUser: boolean
  onSaved: () => void
}) {
  const [isPending, startTransition] = useTransition()
  const [resetSent, setResetSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const [form, setForm] = useState({
    first_name: user.profile?.first_name ?? '',
    last_name: user.profile?.last_name ?? '',
    role: (user.profile?.role ?? 'user') as 'user' | 'admin',
    app_access: user.profile?.app_access ?? [],
  })

  const toggleApp = (slug: string) =>
    setForm((prev) => ({
      ...prev,
      app_access: prev.app_access.includes(slug)
        ? prev.app_access.filter((s) => s !== slug)
        : [...prev.app_access, slug],
    }))

  const handleSave = () => {
    setError(null)
    setSaved(false)
    startTransition(async () => {
      const result = await updateProfile(user.id, form)
      if (result.error) {
        setError(result.error)
      } else {
        setSaved(true)
        onSaved()
        setTimeout(() => setSaved(false), 2500)
      }
    })
  }

  const handleReset = () => {
    startTransition(async () => {
      const result = await sendPasswordReset(user.email)
      if (!result.error) setResetSent(true)
    })
  }

  return (
    <div className="card p-6">
      {/* User header */}
      <div className="flex items-center gap-4 pb-5 mb-5 border-b border-slate-800">
        <div className="w-11 h-11 rounded-full bg-blue-700 flex items-center justify-center text-white font-semibold">
          {displayName(user).charAt(0).toUpperCase()}
        </div>
        <div>
          <p className="text-white font-medium">{displayName(user)}</p>
          <p className="text-slate-400 text-sm">{user.email}</p>
        </div>
        <button
          onClick={handleReset}
          disabled={isPending || resetSent}
          className="ml-auto text-xs text-slate-400 hover:text-slate-200 border border-slate-700 hover:border-slate-600 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
        >
          {resetSent ? '✓ Email envoyé' : 'Envoyer email de réinit.'}
        </button>
      </div>

      {/* Form */}
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-slate-300 text-sm font-medium mb-1.5">Prénom</label>
            <input
              type="text"
              value={form.first_name}
              onChange={(e) => setForm((p) => ({ ...p, first_name: e.target.value }))}
              className="input"
              placeholder="Prénom"
            />
          </div>
          <div>
            <label className="block text-slate-300 text-sm font-medium mb-1.5">Nom</label>
            <input
              type="text"
              value={form.last_name}
              onChange={(e) => setForm((p) => ({ ...p, last_name: e.target.value }))}
              className="input"
              placeholder="Nom"
            />
          </div>
        </div>

        <div>
          <label className="block text-slate-300 text-sm font-medium mb-1.5">Rôle</label>
          <select
            value={form.role}
            onChange={(e) => setForm((p) => ({ ...p, role: e.target.value as 'user' | 'admin' }))}
            className="input"
            disabled={isCurrentUser}
          >
            <option value="user">Utilisateur</option>
            <option value="admin">Administrateur</option>
          </select>
          {isCurrentUser && (
            <p className="text-slate-500 text-xs mt-1">Tu ne peux pas modifier ton propre rôle.</p>
          )}
        </div>

        <div>
          <label className="block text-slate-300 text-sm font-medium mb-2">
            Accès aux applications
          </label>
          {form.role === 'admin' ? (
            <p className="text-slate-500 text-sm">Les admins ont accès à toutes les applications.</p>
          ) : (
            <div className="space-y-2">
              {projects.map((project) => (
                <label key={project.slug} className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={form.app_access.includes(project.slug)}
                    onChange={() => toggleApp(project.slug)}
                    className="w-4 h-4 rounded border-slate-600 bg-slate-800 accent-blue-600"
                  />
                  <span className="text-slate-300 text-sm group-hover:text-white transition-colors">
                    {project.title}
                  </span>
                </label>
              ))}
              {projects.length === 0 && (
                <p className="text-slate-500 text-sm">Aucun projet disponible.</p>
              )}
            </div>
          )}
        </div>

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <div className="pt-1">
          <button
            onClick={handleSave}
            disabled={isPending}
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors disabled:opacity-50"
          >
            {isPending ? 'Enregistrement…' : saved ? '✓ Enregistré' : 'Sauvegarder'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Create modal ─────────────────────────────────────────────────────────────

function CreateUserModal({
  projects,
  onClose,
  onCreated,
}: {
  projects: ProjectOption[]
  onClose: () => void
  onCreated: () => void
}) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    email: '',
    first_name: '',
    last_name: '',
    role: 'user' as 'user' | 'admin',
    app_access: [] as string[],
  })

  const toggleApp = (slug: string) =>
    setForm((prev) => ({
      ...prev,
      app_access: prev.app_access.includes(slug)
        ? prev.app_access.filter((s) => s !== slug)
        : [...prev.app_access, slug],
    }))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.email) return
    setError(null)
    startTransition(async () => {
      const result = await createUser(form)
      if (result.error) setError(result.error)
      else onCreated()
    })
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <h2 className="text-white font-semibold">Créer un utilisateur</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors text-2xl leading-none"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-slate-300 text-sm font-medium mb-1.5">
              Email <span className="text-red-400">*</span>
            </label>
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
              className="input"
              placeholder="email@example.com"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 text-sm font-medium mb-1.5">Prénom</label>
              <input
                type="text"
                value={form.first_name}
                onChange={(e) => setForm((p) => ({ ...p, first_name: e.target.value }))}
                className="input"
                placeholder="Prénom"
              />
            </div>
            <div>
              <label className="block text-slate-300 text-sm font-medium mb-1.5">Nom</label>
              <input
                type="text"
                value={form.last_name}
                onChange={(e) => setForm((p) => ({ ...p, last_name: e.target.value }))}
                className="input"
                placeholder="Nom"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-300 text-sm font-medium mb-1.5">Rôle</label>
            <select
              value={form.role}
              onChange={(e) => setForm((p) => ({ ...p, role: e.target.value as 'user' | 'admin' }))}
              className="input"
            >
              <option value="user">Utilisateur</option>
              <option value="admin">Administrateur</option>
            </select>
          </div>

          {form.role === 'user' && projects.length > 0 && (
            <div>
              <label className="block text-slate-300 text-sm font-medium mb-2">
                Accès applications
              </label>
              <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                {projects.map((project) => (
                  <label key={project.slug} className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.app_access.includes(project.slug)}
                      onChange={() => toggleApp(project.slug)}
                      className="w-4 h-4 rounded border-slate-600 bg-slate-800 accent-blue-600"
                    />
                    <span className="text-slate-300 text-sm">{project.title}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 text-sm text-slate-400 hover:text-slate-200 border border-slate-700 hover:border-slate-600 py-2 rounded-lg transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isPending || !form.email}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 rounded-lg transition-colors disabled:opacity-50"
            >
              {isPending ? 'Création…' : 'Créer & inviter'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
