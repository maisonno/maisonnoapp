'use client'

import { useActionState } from 'react'
import { login } from '@/app/actions'

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState<
    { error: string } | null,
    FormData
  >(login, null)

  return (
    <main className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold text-white tracking-tight mb-1">
            maisonno
          </h1>
          <p className="text-slate-400 text-sm">Espace personnel</p>
        </div>

        {/* Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 shadow-2xl">
          {state?.error && (
            <div className="mb-5 px-4 py-3 bg-red-950/60 border border-red-800/50 rounded-lg text-red-400 text-sm">
              {state.error}
            </div>
          )}

          <form action={formAction} className="space-y-4">
            <div>
              <label className="block text-slate-300 text-sm font-medium mb-1.5">
                Email
              </label>
              <input
                type="email"
                name="email"
                required
                autoComplete="email"
                className="input"
                placeholder="toi@example.com"
              />
            </div>

            <div>
              <label className="block text-slate-300 text-sm font-medium mb-1.5">
                Mot de passe
              </label>
              <input
                type="password"
                name="password"
                required
                autoComplete="current-password"
                className="input"
                placeholder="••••••••"
              />
            </div>

            <div className="pt-1">
              <button type="submit" disabled={isPending} className="btn-primary">
                {isPending ? 'Connexion…' : 'Se connecter'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  )
}
