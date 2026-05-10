import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getCaisseById, getTags } from '../lib/queries'
import CaisseFormClient from '../components/CaisseForm/CaisseFormClient'

export const metadata = { title: 'Service — Caisse' }

type Props = { params: Promise<{ id: string }> }

export default async function ServiceDetailPage({ params }: Props) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { id } = await params
  const [caisse, tags] = await Promise.all([getCaisseById(id), getTags()])
  if (!caisse) notFound()

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="mb-6">
          <Link href="/projects/scoubidoo-caisse" className="text-slate-400 hover:text-slate-200 text-sm transition-colors">
            ← Liste des services
          </Link>
          <h1 className="text-2xl font-bold mt-1">
            Service du{' '}
            {new Date(caisse.date).toLocaleDateString('fr-FR', {
              weekday: 'long', day: 'numeric', month: 'long',
            })}
          </h1>
          <div className="mt-1 text-sm text-slate-400">
            Statut :{' '}
            <span className={caisse.statut === 'fermee' ? 'text-emerald-400' : 'text-slate-300'}>
              {caisse.statut === 'fermee' ? 'Fermée' : 'Brouillon'}
            </span>
          </div>
        </div>
        <CaisseFormClient
          tags={tags}
          veille={null}
          defaultDate={caisse.date}
          caisseId={id}
          initialData={caisse}
        />
      </div>
    </div>
  )
}
