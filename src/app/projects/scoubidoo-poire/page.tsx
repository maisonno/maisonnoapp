import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getMouvements, getSoldeSaison, getStatsMois, getTypesOperation } from './lib/queries'
import PoireDashboard from './components/PoireDashboard'

export const metadata = { title: 'La Poire — Trésorerie' }

type Props = { searchParams: Promise<{ mois?: string }> }

export default async function PoirePage({ searchParams }: Props) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { mois } = await searchParams
  const moisCourant = mois ?? new Date().toISOString().substring(0, 7)

  const [solde, stats, mouvements, types] = await Promise.all([
    getSoldeSaison(),
    getStatsMois(),
    getMouvements(moisCourant),
    getTypesOperation(),
  ])

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="mb-6">
          <Link href="/" className="text-slate-400 hover:text-slate-200 text-sm transition-colors">
            ← Accueil
          </Link>
          <h1 className="text-2xl font-bold mt-1">La Poire</h1>
          <p className="text-slate-400 text-sm mt-0.5">Trésorerie cash hors registre</p>
        </div>

        <PoireDashboard
          solde={solde}
          stats={stats}
          mouvements={mouvements}
          types={types}
          moisCourant={moisCourant}
        />
      </div>
    </div>
  )
}
