import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getArticlesWithStock, getModeles, getModelesWithStock, getMouvements, getVentes } from './lib/queries'
import SansChemiseApp from './components/SansChemiseApp'

export const metadata = { title: 'Sans Chemise — Stock & ventes' }

type Props = { searchParams: Promise<{ tab?: string }> }

export default async function SansChemisePage({ searchParams }: Props) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { tab } = await searchParams

  const [modelesStock, modeles, articles, ventes, mouvements] = await Promise.all([
    getModelesWithStock(),
    getModeles(),
    getArticlesWithStock(),
    getVentes(),
    getMouvements(),
  ])

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="max-w-2xl mx-auto px-4 pt-5 pb-28">
        <div className="mb-4">
          <Link href="/" className="text-slate-400 hover:text-slate-200 text-sm transition-colors">
            ← Accueil
          </Link>
          <h1 className="text-2xl font-bold mt-1">Sans Chemise</h1>
          <p className="text-slate-400 text-sm mt-0.5">Stock & ventes</p>
        </div>

        <SansChemiseApp
          initialTab={tab}
          modelesStock={modelesStock}
          modeles={modeles}
          articles={articles}
          ventes={ventes}
          mouvements={mouvements}
        />
      </div>
    </div>
  )
}
