import Link from 'next/link'
import type { Contrat, HeuresMois, LaborRow, RemunerationPoire } from '../lib/types'
import {
  aggregateFromCombo,
  coutGlobal,
  heuresRealiseesByMonth,
  labelOfYm,
  monthsOfYear,
  poireByMonth,
  prevByMonth,
  prevHeuresByMonth,
  realiseByMonth,
} from '../lib/labor'
import { EUR, N1, PCT } from '../lib/format'

type Props = {
  labor: LaborRow[]
  contrats: Contrat[]
  heures: HeuresMois[]
  remPoire: RemunerationPoire[]
  tauxCharges: number
  annee: string
  anneesDispo: string[]
  caByMonth: Record<string, number>
}

export default function CoutsSalariaux({
  labor,
  contrats,
  heures,
  remPoire,
  tauxCharges,
  annee,
  anneesDispo,
  caByMonth,
}: Props) {
  const months = monthsOfYear(annee)

  // Source privilégiée : ComboHR (plannings synchronisés). Repli sur l'import
  // fichier (ana_labor) pour les mois non couverts par la synchro.
  const combo = aggregateFromCombo(contrats, heures, 'reel')
  const comboPrev = aggregateFromCombo(contrats, heures, 'planifie')
  const fileReal = realiseByMonth(labor)
  const fileRealH = heuresRealiseesByMonth(labor)

  const real: typeof fileReal = { ...fileReal }
  const realH: Record<string, number> = { ...fileRealH }
  for (const ym of combo.months) {
    real[ym] = combo.brut[ym]
    realH[ym] = combo.heures[ym] ?? 0
  }

  // Prévisionnel : planning Combo si disponible, sinon heures hebdo cible
  const prevCible = prevByMonth(contrats, months)
  const prevHCible = prevHeuresByMonth(contrats, months)
  const prev: typeof prevCible = { ...prevCible }
  const prevH: Record<string, number> = { ...prevHCible }
  for (const ym of comboPrev.months) {
    prev[ym] = comboPrev.brut[ym]
    prevH[ym] = comboPrev.heures[ym] ?? 0
  }

  const poire = poireByMonth(remPoire)

  // Totaux annuels
  let tRealBrut = 0
  let tRealCout = 0
  let tRealH = 0
  let tPrevBrut = 0
  let tPrevCout = 0
  let tPrevH = 0
  let tPoire = 0
  let tCa = 0

  const rows = months.map((ym) => {
    const r = real[ym]
    const p = prev[ym]
    const pr = poire[ym] || 0
    const ca = caByMonth[ym] || 0
    const realBrut = r?.brut ?? 0
    const realCout = r ? coutGlobal(realBrut, tauxCharges, pr) : 0
    const prevBrut = p?.brut ?? 0
    // Le complément Poire n'est ajouté au prévisionnel que si le mois n'est pas réalisé
    const prevCout = prevBrut > 0 ? coutGlobal(prevBrut, tauxCharges, r ? 0 : pr) : 0
    if (r) {
      tRealBrut += realBrut
      tRealCout += realCout
      tRealH += realH[ym] || 0
      tPoire += pr
    }
    tPrevBrut += prevBrut
    tPrevCout += prevCout
    tPrevH += prevH[ym] || 0
    tCa += ca
    return { ym, r, realBrut, realCout, realH: realH[ym] || 0, prevBrut, prevCout, prevH: prevH[ym] || 0, pr, ca }
  })

  const pctReal = tCa > 0 ? (100 * tRealCout) / tCa : null

  return (
    <>
      <section>
        <div className="h2">
          Coûts salariaux <span className="tag">{annee}</span>
        </div>

        <div className="controls" style={{ marginBottom: 14 }}>
          <div className="field">
            <label>Année</label>
            <div className="seg">
              {anneesDispo.map((y) => (
                <Link
                  key={y}
                  href={`/projects/analyse-services?tab=salaires&annee=${y}`}
                  className={y === annee ? 'act' : ''}
                  style={{
                    padding: '8px 14px',
                    fontSize: 13,
                    fontWeight: 600,
                    textDecoration: 'none',
                    background: y === annee ? 'var(--ink)' : 'var(--paper)',
                    color: y === annee ? 'var(--white)' : 'var(--ink-soft)',
                  }}
                >
                  {y}
                </Link>
              ))}
            </div>
          </div>
          <div className="field">
            <label>Charges patronales</label>
            <div style={{ padding: '8px 0', fontSize: 14, fontWeight: 600 }}>
              {PCT(tauxCharges * 100)}
            </div>
          </div>
          <div style={{ marginLeft: 'auto', alignSelf: 'center' }}>
            <Link className="btn btn-primary" href="/projects/analyse-services/detail">
              🔒 Détail
            </Link>
          </div>
        </div>

        <div className="kpis">
          <div className="kpi">
            <div className="l">Coût global réalisé</div>
            <div className="v">{EUR(tRealCout)}</div>
            <div className="sub">
              brut {EUR(tRealBrut)} · {N1(tRealH)} h
              {tPoire ? ` · dont ${EUR(tPoire)} de complément Poire` : ''}
            </div>
          </div>
          <div className="kpi">
            <div className="l">Coût global prévisionnel</div>
            <div className="v">{EUR(tPrevCout)}</div>
            <div className="sub">
              brut {EUR(tPrevBrut)} · {N1(tPrevH)} h cible
            </div>
          </div>
          <div className="kpi">
            <div className="l">% masse salariale / CA</div>
            <div className="v">{pctReal != null ? PCT(pctReal) : '—'}</div>
            <div className="sub">réalisé sur CA {EUR(tCa)}</div>
          </div>
          <div className="kpi">
            <div className="l">Écart réalisé / prév.</div>
            <div className="v">
              {tPrevCout > 0 && tRealCout > 0 ? EUR(tRealCout - tPrevCout) : '—'}
            </div>
            <div className="sub">sur les mois réalisés</div>
          </div>
        </div>
      </section>

      <section>
        <div className="h2">Par mois</div>
        <div className="daily">
          <table className="day">
            <thead>
              <tr>
                <th>Mois</th>
                <th>Heures réal.</th>
                <th>Brut réal.</th>
                <th>Coût global réal.</th>
                <th>% CA</th>
                <th>Heures prév.</th>
                <th>Brut prév.</th>
                <th>Coût global prév.</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.ym}>
                  <td>{labelOfYm(row.ym)}</td>
                  <td>{row.r ? N1(row.realH) : '—'}</td>
                  <td>{row.r ? EUR(row.realBrut) : '—'}</td>
                  <td>
                    <b>{row.r ? EUR(row.realCout) : '—'}</b>
                  </td>
                  <td>{row.r && row.ca > 0 ? PCT((100 * row.realCout) / row.ca) : '—'}</td>
                  <td>{row.prevH > 0 ? N1(row.prevH) : '—'}</td>
                  <td>{row.prevBrut > 0 ? EUR(row.prevBrut) : '—'}</td>
                  <td>{row.prevCout > 0 ? EUR(row.prevCout) : '—'}</td>
                </tr>
              ))}
              <tr className="tot">
                <td>Total {annee}</td>
                <td>{N1(tRealH)}</td>
                <td>{EUR(tRealBrut)}</td>
                <td>{EUR(tRealCout)}</td>
                <td>{pctReal != null ? PCT(pctReal) : '—'}</td>
                <td>{N1(tPrevH)}</td>
                <td>{EUR(tPrevBrut)}</td>
                <td>{EUR(tPrevCout)}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="foot">
          <b>Réalisé</b> : heures réellement pointées dans ComboHR, valorisées au salaire du contrat.{' '}
          <b>Prévisionnel</b> : planning ComboHR quand il existe, sinon heures hebdo cible saisies dans la zone
          Détail, au prorata de la période de contrat. Coût global = brut × (1 + {PCT(tauxCharges * 100)} de charges patronales) + complément
          « Poire » (cash, <b>non soumis aux charges</b>). Le brut inclut la majoration des heures supp, les
          fériés, le 6ème jour payé et la provision congés payés. Estimation de gestion, pas un calcul de paie.
          {contrats.length === 0 ? (
            <>
              {' '}
              <b>Aucun contrat saisi</b> : le prévisionnel reste vide tant que les contrats ne sont pas
              renseignés dans la zone Détail.
            </>
          ) : null}
        </div>
      </section>
    </>
  )
}
