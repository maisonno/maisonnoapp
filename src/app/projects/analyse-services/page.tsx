import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import {
  getAllLabor,
  getAllPoire,
  getAllTicketMetrics,
  getContrats,
  getHeuresMois,
  getParam,
  getPinsaMonthly,
  getRemunerationPoire,
} from './lib/queries'
import Dashboard from './components/Dashboard'
import CoutsSalariaux from './components/CoutsSalariaux'
import PageHeader from './components/PageHeader'

export const metadata = { title: 'Analyse des services — La Pomme d\'Adam' }

const SUB_REVENUS =
  'Restaurant, desserts seuls et bar, midi et soir, Poire intégrée et comparaison des années — le tout à partir des données stockées.'

export default async function AnalyseServicesPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; annee?: string }>
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { tab = 'revenus', annee } = await searchParams

  // ─── Onglet Coûts salariaux ───
  if (tab === 'salaires') {
    const [tickets, labor, contrats, heures, remPoire, tauxCharges] = await Promise.all([
      getAllTicketMetrics(),
      getAllLabor(),
      getContrats(),
      getHeuresMois(),
      getRemunerationPoire(),
      getParam('taux_charges_patronales', 0.3),
    ])

    // CA TTC par mois (pour le % masse salariale / CA)
    const caByMonth: Record<string, number> = {}
    for (const t of tickets) {
      const ym = t.jour.slice(0, 7)
      caByMonth[ym] = (caByMonth[ym] || 0) + t.ttc
    }

    const anneesSet = new Set<string>([
      ...labor.map((l) => l.periode.slice(0, 4)),
      ...tickets.map((t) => t.jour.slice(0, 4)),
      ...contrats.flatMap((c) => (c.date_debut ? [c.date_debut.slice(0, 4)] : [])),
    ])
    const anneesDispo = [...anneesSet].sort()
    if (anneesDispo.length === 0) anneesDispo.push(String(new Date().getFullYear()))
    const anneeActive = annee && anneesDispo.includes(annee) ? annee : anneesDispo[anneesDispo.length - 1]

    return (
      <div className="wrap">
        <PageHeader sub="Masse salariale agrégée par mois : réalisé (import Combo) et prévisionnel (contrats)." />
        <CoutsSalariaux
          labor={labor}
          contrats={contrats}
          heures={heures}
          remPoire={remPoire}
          tauxCharges={tauxCharges}
          annee={anneeActive}
          anneesDispo={anneesDispo}
          caByMonth={caByMonth}
        />
      </div>
    )
  }

  // ─── Onglets à venir ───
  if (tab === 'appro' || tab === 'autres' || tab === 'synthese') {
    const titres: Record<string, string> = {
      appro: 'Coûts appro',
      autres: 'Autres coûts',
      synthese: 'Synthèse',
    }
    return (
      <div className="wrap">
        <PageHeader />
        <section>
          <div className="h2">{titres[tab]}</div>
          <div className="empty">
            <p>Cette section n&apos;est pas encore disponible.</p>
          </div>
        </section>
      </div>
    )
  }

  // ─── Onglet Revenus caisse (par défaut) ───
  const [tickets, poire, labor, pinsaByMonth] = await Promise.all([
    getAllTicketMetrics(),
    getAllPoire(),
    getAllLabor(),
    getPinsaMonthly(),
  ])

  if (tickets.length === 0) {
    return (
      <div className="wrap">
        <PageHeader />
        <div className="empty">
          <p>Aucune donnée pour l&apos;instant.</p>
          <p style={{ marginTop: 12 }}>
            <Link className="btn btn-primary" href="/projects/analyse-services/import">
              ↑ Importer des exports L&apos;Addition
            </Link>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="wrap">
      <PageHeader sub={SUB_REVENUS} />
      <Dashboard tickets={tickets} poire={poire} labor={labor} pinsaByMonth={pinsaByMonth} />
    </div>
  )
}
