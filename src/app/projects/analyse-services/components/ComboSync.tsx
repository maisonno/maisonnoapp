'use client'

import { useActionState, useEffect, useState } from 'react'
import {
  loadComboLocations,
  syncComboAction,
  type ComboLocationsState,
  type ComboSyncState,
} from '../actions'

export default function ComboSync() {
  const [locs, setLocs] = useState<ComboLocationsState>({})
  const [loading, setLoading] = useState(true)
  const [state, action, pending] = useActionState(syncComboAction, {} as ComboSyncState)

  const now = new Date()
  const years = [now.getFullYear(), now.getFullYear() - 1, now.getFullYear() - 2].map(String)

  useEffect(() => {
    loadComboLocations()
      .then(setLocs)
      .finally(() => setLoading(false))
  }, [])

  const options = locs.locations ?? []
  const r = state.report

  return (
    <section>
      <div className="h2">
        Synchronisation ComboHR <span className="tag">contrats · plannings</span>
      </div>

      {loading && <div className="foot">Connexion à ComboHR…</div>}
      {locs.error && <div className="msg-err">{locs.error}</div>}

      {options.length > 0 && (
        <form action={action} className="frm">
          <div>
            <label>Établissement</label>
            <select name="location_id" defaultValue={locs.selected ?? options[0]?.id} required>
              {options.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label>Année</label>
            <select name="annee" defaultValue={years[0]}>
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
          <div>
            <button className="btn btn-primary" type="submit" disabled={pending}>
              {pending ? 'Synchronisation…' : 'Synchroniser'}
            </button>
          </div>
        </form>
      )}

      {state.error && <div className="msg-err">{state.error}</div>}

      {r && (
        <>
          <div className="msg-ok">
            ✅ {r.locationName} · {r.annee} — {r.contrats} contrat(s), {r.shifts.toLocaleString('fr-FR')} shift(s)
            sur {r.moisAvecHeures} mois.
          </div>
          <div className="kpis">
            <div className="kpi">
              <div className="l">Contrats synchronisés</div>
              <div className="v">{r.contrats}</div>
              <div className="sub">
                {r.contratsSansSalaire > 0
                  ? `${r.contratsSansSalaire} sans salaire brut → à compléter dans Détail`
                  : 'salaires bruts récupérés'}
              </div>
            </div>
            <div className="kpi">
              <div className="l">Heures réelles</div>
              <div className="v">{r.heuresReelles.toLocaleString('fr-FR')}</div>
              <div className="sub">pointages Combo</div>
            </div>
            <div className="kpi">
              <div className="l">Heures planifiées</div>
              <div className="v">{r.heuresPlanifiees.toLocaleString('fr-FR')}</div>
              <div className="sub">planning Combo</div>
            </div>
          </div>
        </>
      )}

      <div className="foot">
        Récupère les <b>contrats</b> (nom, fonction, dates, heures hebdo, <b>salaire brut mensuel</b>) et les{' '}
        <b>plannings</b> (heures planifiées et heures réellement pointées) depuis la Partner API ComboHR. Idempotent :
        relancer la synchro met à jour, ne duplique pas. Les champs saisis à la main dans la zone Détail (heures
        hebdo cible, compléments Poire) sont préservés. La majoration des heures supp est calculée semaine par
        semaine au barème CHR (≤39 h ×1,10 · 39-43 h ×1,20 · &gt;43 h ×1,50).
      </div>
    </section>
  )
}
