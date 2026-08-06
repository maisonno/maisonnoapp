import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getImportLog } from '../lib/queries'
import ImportClient from '../components/ImportClient'
import ImportPoireScoubidoo from '../components/ImportPoireScoubidoo'
import ComboSync from '../components/ComboSync'
import PageHeader from '../components/PageHeader'

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
      <PageHeader sub="Dépose tes exports L'Addition (.xlsx), ta caisse Scoubidoo (.csv), ton fichier Poire (.xlsx) ou l'export comptable Combo. Le type est détecté automatiquement et l'import est idempotent : ré-importer une période déjà chargée ne crée aucun doublon." />

      <ImportClient />

      <ImportPoireScoubidoo />

      <ComboSync />

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
                  <th>Salariés</th>
                </tr>
              </thead>
              <tbody>
                {log.map((e) => (
                  <tr key={e.id}>
                    <td>{fmtDate(e.created_at)}</td>
                    <td>{e.kind === 'ventes' ? 'Ventes' : e.kind === 'combo' ? 'Masse sal.' : 'Poire'}</td>
                    <td>{e.file_name ?? '—'}</td>
                    <td>{e.rows_in?.toLocaleString('fr-FR') ?? '—'}</td>
                    <td>{e.tickets_upserted?.toLocaleString('fr-FR') ?? '—'}</td>
                    <td>{e.lines_upserted?.toLocaleString('fr-FR') ?? '—'}</td>
                    <td>{e.poire_upserted?.toLocaleString('fr-FR') ?? '—'}</td>
                    <td>{e.labor_upserted?.toLocaleString('fr-FR') ?? '—'}</td>
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
