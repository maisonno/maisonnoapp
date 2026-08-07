import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import {
  getAllLabor,
  getContrats,
  getHeuresMois,
  getParam,
  getRemunerationPoire,
} from '../lib/queries'
import PageHeader from '../components/PageHeader'
import DetailSalaires from '../components/DetailSalaires'

export const metadata = { title: 'Détail salarial — La Pomme d\'Adam' }

export default async function DetailPage({
  searchParams,
}: {
  searchParams: Promise<{ annee?: string }>
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { annee } = await searchParams
  const [labor, contrats, remPoire, heures, tauxCharges] = await Promise.all([
    getAllLabor(),
    getContrats(),
    getRemunerationPoire(),
    getHeuresMois(),
    getParam('taux_charges_patronales', 0.3),
  ])

  const anneesSet = new Set<string>([
    ...labor.map((l) => l.periode.slice(0, 4)),
    ...contrats.flatMap((c) => (c.date_debut ? [c.date_debut.slice(0, 4)] : [])),
  ])
  const anneesDispo = [...anneesSet].sort()
  if (anneesDispo.length === 0) anneesDispo.push(String(new Date().getFullYear()))
  const anneeActive = annee && anneesDispo.includes(annee) ? annee : anneesDispo[anneesDispo.length - 1]

  return (
    <div className="wrap">
      <PageHeader sub="Zone protégée — saisie des informations salariales complémentaires." />
      <DetailSalaires
        labor={labor}
        contrats={contrats}
        remPoire={remPoire}
        heures={heures}
        tauxCharges={tauxCharges}
        annee={anneeActive}
        anneesDispo={anneesDispo}
      />
    </div>
  )
}
