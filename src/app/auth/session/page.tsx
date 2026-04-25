'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function AuthSessionPage() {
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()
    let handled = false

    // Supabase implicit flow sends tokens as hash fragments (#access_token=...&type=recovery)
    // The browser client detects these and fires onAuthStateChange
    const hashParams = new URLSearchParams(window.location.hash.slice(1))
    const hashType = hashParams.get('type')

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (handled) return

      if (event === 'PASSWORD_RECOVERY') {
        handled = true
        router.push('/auth/update-password')
      } else if (event === 'SIGNED_IN' && session) {
        handled = true
        // Invite flow: redirect to set initial password
        router.push(hashType === 'invite' ? '/auth/update-password' : '/')
      } else if (event === 'INITIAL_SESSION' && !session) {
        // No tokens in hash — wait briefly then show error
        setTimeout(() => {
          if (!handled) {
            handled = true
            router.push('/login?error=lien_invalide_ou_expire')
          }
        }, 2000)
      }
    })

    return () => subscription.unsubscribe()
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-slate-400 text-sm">Connexion en cours…</p>
    </div>
  )
}
