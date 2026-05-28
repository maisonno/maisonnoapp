import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getCaisseList } from './lib/queries'
import ServiceList from './components/ServiceList'
import ExportButton from './components/ExportButton'

export const metadata = { title: 'Scoubidoo — Caisse' }

export default async function ScoubidooCaissePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const services = await getCaisseList(60)

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <Link href="/" className="text-slate-400 hover:text-slate-200 text-sm transition-colors">
              ← Accueil
            </Link>
            <h1 className="text-2xl font-bold mt-1">Caisse — La Pomme</h1>
          </div>
          <div className="flex items-center gap-2">
            <ExportButton />
            <Link
              href="/projects/scoubidoo-caisse/nouveau"
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-3 rounded-xl text-sm transition-colors"
            >
              + Nouveau service
            </Link>
          </div>
        </div>

        <ServiceList services={services} />
      </div>
    </div>
  )
}
