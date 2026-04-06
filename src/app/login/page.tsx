'use client'

import { useActionState } from 'react'
import { login } from '@/app/actions'
import TikiFace from '@/components/TikiFace'

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState<
    { error: string } | null,
    FormData
  >(login, null)

  return (
    <main className="min-h-screen bg-tiki-bark flex items-center justify-center p-4 relative overflow-hidden">
      {/* Ambient glow */}
      <div className="absolute inset-0 bg-gradient-radial from-tiki-wood/20 via-transparent to-transparent pointer-events-none" />

      {/* Torches */}
      <div
        className="absolute left-8 top-1/2 -translate-y-1/2 text-5xl animate-flicker select-none hidden md:block"
        style={{ animationDelay: '0s' }}
      >
        🔥
      </div>
      <div
        className="absolute right-8 top-1/2 -translate-y-1/2 text-5xl animate-flicker select-none hidden md:block"
        style={{ animationDelay: '0.9s' }}
      >
        🔥
      </div>

      <div className="relative w-full max-w-sm">
        {/* Tiki face */}
        <div className="flex justify-center mb-5">
          <TikiFace className="w-24 h-28 drop-shadow-[0_0_12px_rgba(245,166,35,0.4)]" />
        </div>

        {/* Card */}
        <div className="bg-tiki-wood border border-tiki-bamboo/30 rounded-xl p-8 shadow-2xl shadow-black/60">
          <h1 className="font-tiki text-tiki-gold text-4xl text-center tracking-widest mb-1">
            maisonno
          </h1>
          <p className="text-tiki-mist/70 text-center text-xs font-body uppercase tracking-widest mb-8">
            le lounge privé
          </p>

          {state?.error && (
            <div className="mb-5 px-4 py-3 bg-red-950/50 border border-red-700/40 rounded-lg text-red-300 text-sm text-center font-body">
              {state.error}
            </div>
          )}

          <form action={formAction} className="space-y-4">
            <div>
              <label className="block text-tiki-mist text-xs font-body uppercase tracking-wider mb-2">
                Email
              </label>
              <input
                type="email"
                name="email"
                required
                autoComplete="email"
                className="tiki-input"
                placeholder="toi@example.com"
              />
            </div>

            <div>
              <label className="block text-tiki-mist text-xs font-body uppercase tracking-wider mb-2">
                Mot de passe
              </label>
              <input
                type="password"
                name="password"
                required
                autoComplete="current-password"
                className="tiki-input"
                placeholder="••••••••"
              />
            </div>

            <div className="pt-2">
              <button type="submit" disabled={isPending} className="tiki-btn-primary">
                {isPending ? 'Connexion…' : 'Entrer dans le lounge'}
              </button>
            </div>
          </form>
        </div>

        {/* Bottom decoration */}
        <div className="text-center mt-6">
          <span className="text-tiki-bamboo/30 text-xs font-body tracking-widest">
            ✦ ✦ ✦
          </span>
        </div>
      </div>
    </main>
  )
}
