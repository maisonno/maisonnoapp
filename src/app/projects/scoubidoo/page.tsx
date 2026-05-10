import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export const metadata = {
  title: 'Scoubidoo',
}

export default async function ScoubidooPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="mb-8">
          <Link href="/" className="text-slate-400 hover:text-slate-200 text-sm transition-colors">
            ← Accueil
          </Link>
        </div>

        <h1 className="text-3xl font-bold mb-2">Scoubidoo</h1>
        <p className="text-slate-400 mb-12">À venir…</p>
      </div>
    </div>
  )
}
