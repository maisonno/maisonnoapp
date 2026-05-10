import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getTags, getVeilleData } from '../lib/queries'
import CaisseFormClient from '../components/CaisseForm/CaisseFormClient'

export const metadata = { title: 'Nouveau service — Caisse' }

export default async function NouveauServicePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const today = new Date().toISOString().split('T')[0]
  const [tags, veille] = await Promise.all([getTags(), getVeilleData(today)])

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="mb-6">
          <Link href="/projects/scoubidoo-caisse" className="text-slate-400 hover:text-slate-200 text-sm transition-colors">
            ← Liste des services
          </Link>
          <h1 className="text-2xl font-bold mt-1">Nouveau service</h1>
        </div>
        <CaisseFormClient
          tags={tags}
          veille={veille}
          defaultDate={today}
          caisseId={null}
          initialData={null}
        />
      </div>
    </div>
  )
}
