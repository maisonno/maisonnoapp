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

  // Si on est entre minuit et 5h du matin (heure de Paris), on utilise la date de la veille
  const now = new Date()
  const hourParis = parseInt(
    now.toLocaleString('fr-FR', { timeZone: 'Europe/Paris', hour: 'numeric', hour12: false }),
    10,
  )
  const defaultDate = new Date(
    now.toLocaleString('en-CA', { timeZone: 'Europe/Paris' }).split(',')[0]
  )
  if (hourParis < 5) defaultDate.setDate(defaultDate.getDate() - 1)
  const dateStr = defaultDate.toISOString().split('T')[0]

  const [tags, veille] = await Promise.all([getTags(), getVeilleData(dateStr)])

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
          defaultDate={dateStr}
          caisseId={null}
          initialData={null}
        />
      </div>
    </div>
  )
}
