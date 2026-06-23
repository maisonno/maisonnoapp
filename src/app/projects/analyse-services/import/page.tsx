import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getImportLog } from '../lib/queries'
import ImportClient from '../components/ImportClient'

export const metadata = { title: 'Import — Analyse des services' }

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

export default async function ImportPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const log = await getImportLog(20)

  return (
    <div className="wrap">
      <header>
        <div className="topnav">
          <Link href="/">← Accueil</Link>
          <span className="sep">/</span>
          <Link href="/projects/analyse-services">Analyse des services</Link>
          <span className="sep">/</span>
          <span>Import</span>
        </div>
        <div className="eyebrow">La Pomme d&apos;Adam · Île du Levant</div>
        <h1>
          Importer des <span className="blue">données</span>
        </h1>
        <p className="sub">
          Dépose tes exports L&apos;Addition (.xlsx, une ou plusieurs années) et, si tu veux, ta caisse
          Scoubidoo (.csv) ou ton fichier Poire (.xlsx). Le type est détecté automatiquement et l&apos;import est
          idempotent : ré-importer un export qui chevauche une période déjà chargée ne crée aucun doublon.
        </p>
        <div className="triline">
          <span className="a" />
          <span className="b" />
          <span className="c" />
        </div>
      </header>

      <ImportClient />

      <section>
        <div className="h2">Journal des imports</div>
        {log.length === 0 ? (
          <div className="empty">Aucun import pour l&apos;instant.</div>
        ) : (
          <div className="daily">
            <table className="day">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Fichier</th>
                  <th>Lignes lues</th>
                  <th>Tickets</th>
                  <th>Lignes</th>
                  <th>Poire</th>
                </tr>
              </thead>
              <tbody>
                {log.map((e) => (
                  <tr key={e.id}>
                    <td>{fmtDate(e.created_at)}</td>
                    <td>{e.kind === 'ventes' ? 'Ventes' : 'Poire'}</td>
                    <td>{e.file_name ?? '—'}</td>
                    <td>{e.rows_in?.toLocaleString('fr-FR') ?? '—'}</td>
                    <td>{e.tickets_upserted?.toLocaleString('fr-FR') ?? '—'}</td>
                    <td>{e.lines_upserted?.toLocaleString('fr-FR') ?? '—'}</td>
                    <td>{e.poire_upserted?.toLocaleString('fr-FR') ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
