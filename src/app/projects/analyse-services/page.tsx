import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getAllPoire, getAllTicketMetrics } from './lib/queries'
import Dashboard from './components/Dashboard'

export const metadata = { title: 'Analyse des services — La Pomme d\'Adam' }

export default async function AnalyseServicesPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [tickets, poire] = await Promise.all([getAllTicketMetrics(), getAllPoire()])

  if (tickets.length === 0) {
    return (
      <div className="wrap">
        <header>
          <div className="topnav">
            <Link href="/">← Accueil</Link>
            <span className="sep">/</span>
            <span>Analyse des services</span>
          </div>
          <div className="eyebrow">La Pomme d&apos;Adam · Île du Levant</div>
          <h1>
            Analyse des <span className="blue">services</span>
          </h1>
          <div className="triline">
            <span className="a" />
            <span className="b" />
            <span className="c" />
          </div>
        </header>
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

  return <Dashboard tickets={tickets} poire={poire} />
}
