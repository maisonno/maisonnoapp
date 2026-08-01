'use client'

import { useActionState, useEffect, useState } from 'react'
import Link from 'next/link'
import type { Contrat, LaborEmploye, LaborRow, RemunerationPoire } from '../lib/types'
import {
  coutGlobal,
  labelOfYm,
  monthsOfYear,
  poireByMonth,
  prevHeures,
  realiseByMonth,
  ymOf,
} from '../lib/labor'
import { EUR, N1, PCT } from '../lib/format'
import {
  deleteContrat,
  saveContrat,
  saveParam,
  saveRemunerationPoire,
  type ActionState,
} from '../actions'

const PASSCODE = '1932'
const SESSION_KEY = 'ana-detail-unlocked'

type Props = {
  labor: LaborRow[]
  contrats: Contrat[]
  remPoire: RemunerationPoire[]
  employes: LaborEmploye[]
  tauxCharges: number
  annee: string
  anneesDispo: string[]
}

export default function DetailSalaires(props: Props) {
  const [unlocked, setUnlocked] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    setUnlocked(sessionStorage.getItem(SESSION_KEY) === '1')
    setReady(true)
  }, [])

  if (!ready) return null
  if (!unlocked) return <Lock onOk={() => setUnlocked(true)} />
  return <Detail {...props} />
}

function Lock({ onOk }: { onOk: () => void }) {
  const [code, setCode] = useState('')
  const [err, setErr] = useState(false)

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (code === PASSCODE) {
      sessionStorage.setItem(SESSION_KEY, '1')
      onOk()
    } else {
      setErr(true)
      setCode('')
    }
  }

  return (
    <form className="lock" onSubmit={submit}>
      <h3>🔒 Zone protégée</h3>
      <p>Saisis le code d&apos;accès pour consulter les informations salariales.</p>
      <input
        type="password"
        inputMode="numeric"
        value={code}
        autoFocus
        onChange={(e) => {
          setCode(e.target.value)
          setErr(false)
        }}
        placeholder="••••"
      />
      <button className="btn btn-primary" type="submit" style={{ width: '100%' }}>
        Déverrouiller
      </button>
      {err && <div className="err">Code incorrect.</div>}
      <p style={{ marginTop: 16, marginBottom: 0 }}>
        <Link href="/projects/analyse-services?tab=salaires">← Retour aux coûts salariaux</Link>
      </p>
    </form>
  )
}

function Msg({ state }: { state: ActionState }) {
  if (state.error) return <div className="msg-err">{state.error}</div>
  if (state.success) return <div className="msg-ok">{state.success}</div>
  return null
}

function Detail({ labor, contrats, remPoire, employes, tauxCharges, annee, anneesDispo }: Props) {
  const months = monthsOfYear(annee)
  const [edit, setEdit] = useState<Contrat | null>(null)
  const [poireCell, setPoireCell] = useState<{ contrat_id: string; mois: string } | null>(null)

  const [contratState, contratAction] = useActionState(saveContrat, {} as ActionState)
  const [delState, delAction] = useActionState(deleteContrat, {} as ActionState)
  const [poireState, poireAction] = useActionState(saveRemunerationPoire, {} as ActionState)
  const [paramState, paramAction] = useActionState(saveParam, {} as ActionState)

  const poireMap = new Map<string, number>()
  for (const r of remPoire) poireMap.set(`${r.contrat_id}|${ymOf(r.mois)}`, r.montant)

  // Heures réalisées par contrat × mois (rattachement via employe_hash)
  const contratByHash = new Map<string, string>()
  for (const c of contrats) if (c.employe_hash) contratByHash.set(c.employe_hash, c.id)
  const heuresReal = new Map<string, number>()
  for (const l of labor) {
    if (!l.heures_travaillees || !l.employe_hash) continue
    const cid = contratByHash.get(l.employe_hash)
    if (!cid) continue
    const k = `${cid}|${ymOf(l.periode)}`
    heuresReal.set(k, (heuresReal.get(k) || 0) + l.heures_travaillees)
  }

  const real = realiseByMonth(labor.filter((l) => l.periode.startsWith(annee)))
  const poireParMois = poireByMonth(remPoire.filter((r) => r.mois.startsWith(annee)))

  return (
    <>
      {/* Barre année + retour */}
      <div className="controls" style={{ marginBottom: 14 }}>
        <div className="field">
          <label>Année</label>
          <div className="seg">
            {anneesDispo.map((y) => (
              <Link
                key={y}
                href={`/projects/analyse-services/detail?annee=${y}`}
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
        <form action={paramAction} className="field">
          <label>Coefficient charges patronales (%)</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input type="hidden" name="cle" value="taux_charges_patronales" />
            <input
              type="number"
              name="valeur"
              step="0.01"
              min="0"
              max="1"
              defaultValue={tauxCharges}
              style={{ width: 100 }}
            />
            <button className="btn btn-ghost" type="submit">
              Enregistrer
            </button>
          </div>
        </form>
        <div style={{ marginLeft: 'auto', alignSelf: 'center' }}>
          <Link className="btn btn-ghost" href="/projects/analyse-services?tab=salaires">
            ← Coûts salariaux
          </Link>
        </div>
      </div>
      <Msg state={paramState} />

      {/* 1. Contrats */}
      <section>
        <div className="h2">
          Contrats <span className="tag">{contrats.length} salarié(s)</span>
        </div>
        <Msg state={contratState} />
        <Msg state={delState} />

        <form action={contratAction} className="frm">
          <input type="hidden" name="id" value={edit?.id ?? ''} />
          <div>
            <label>Salarié *</label>
            <input name="nom_affichage" defaultValue={edit?.nom_affichage ?? ''} key={`n${edit?.id ?? 'new'}`} required />
          </div>
          <div>
            <label>Poste</label>
            <input name="poste" defaultValue={edit?.poste ?? ''} key={`p${edit?.id ?? 'new'}`} />
          </div>
          <div>
            <label>Type contrat</label>
            <input name="contrat" defaultValue={edit?.contrat ?? ''} key={`c${edit?.id ?? 'new'}`} />
          </div>
          <div>
            <label>Début</label>
            <input type="date" name="date_debut" defaultValue={edit?.date_debut ?? ''} key={`d${edit?.id ?? 'new'}`} />
          </div>
          <div>
            <label>Fin</label>
            <input type="date" name="date_fin" defaultValue={edit?.date_fin ?? ''} key={`f${edit?.id ?? 'new'}`} />
          </div>
          <div>
            <label>H. hebdo contrat</label>
            <input type="number" step="0.5" name="heures_hebdo_contrat" defaultValue={edit?.heures_hebdo_contrat ?? ''} key={`hc${edit?.id ?? 'new'}`} />
          </div>
          <div>
            <label>Salaire brut mensuel (€)</label>
            <input type="number" step="0.01" name="salaire_brut_mensuel" defaultValue={edit?.salaire_brut_mensuel ?? ''} key={`s${edit?.id ?? 'new'}`} />
          </div>
          <div>
            <label>H. hebdo cible</label>
            <input type="number" step="0.5" name="heures_hebdo_cible" defaultValue={edit?.heures_hebdo_cible ?? ''} key={`hb${edit?.id ?? 'new'}`} />
          </div>
          <div>
            <label>Lien import Combo</label>
            <select name="employe_hash" defaultValue={edit?.employe_hash ?? ''} key={`h${edit?.id ?? 'new'}`}>
              <option value="">— aucun —</option>
              {employes.map((e) => (
                <option key={e.employe_hash} value={e.employe_hash}>
                  {e.poste ?? '?'} · {e.contrat ?? '?'} · {EUR(e.salaire_base)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label>Actif</label>
            <select name="actif" defaultValue={edit ? String(edit.actif) : 'true'} key={`a${edit?.id ?? 'new'}`}>
              <option value="true">Oui</option>
              <option value="false">Non</option>
            </select>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-primary" type="submit">
              {edit ? 'Mettre à jour' : 'Ajouter'}
            </button>
            {edit && (
              <button className="btn btn-ghost" type="button" onClick={() => setEdit(null)}>
                Annuler
              </button>
            )}
          </div>
        </form>

        <div className="daily">
          <table className="day">
            <thead>
              <tr>
                <th>Salarié</th>
                <th>Poste</th>
                <th>Période</th>
                <th>H. hebdo</th>
                <th>Brut mensuel</th>
                <th>H. cible</th>
                <th>Combo</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {contrats.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ color: 'var(--ink-soft)' }}>
                    Aucun contrat saisi.
                  </td>
                </tr>
              ) : (
                contrats.map((c) => (
                  <tr key={c.id} style={{ opacity: c.actif ? 1 : 0.5 }}>
                    <td>
                      <b>{c.nom_affichage}</b>
                      {c.contrat ? <div className="partial">{c.contrat}</div> : null}
                    </td>
                    <td>{c.poste ?? '—'}</td>
                    <td>
                      {c.date_debut ?? '?'} → {c.date_fin ?? '…'}
                    </td>
                    <td>{c.heures_hebdo_contrat != null ? N1(c.heures_hebdo_contrat) : '—'}</td>
                    <td>{c.salaire_brut_mensuel != null ? EUR(c.salaire_brut_mensuel) : '⚠️ à saisir'}</td>
                    <td>{c.heures_hebdo_cible != null ? N1(c.heures_hebdo_cible) : '—'}</td>
                    <td>{c.employe_hash ? '✓' : '—'}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <button className="ghost" type="button" onClick={() => setEdit(c)}>
                        Modifier
                      </button>
                      <form action={delAction} style={{ display: 'inline' }}>
                        <input type="hidden" name="id" value={c.id} />
                        <button className="ghost" type="submit" style={{ color: 'var(--resto)', marginLeft: 8 }}>
                          Suppr.
                        </button>
                      </form>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="foot">
          Le <b>salaire brut</b> n&apos;est pas fourni par l&apos;export Combo actuel : saisis-le ici (il sera
          repris automatiquement si l&apos;API Combo l&apos;expose un jour). Les <b>heures hebdo cible</b>{' '}
          alimentent le prévisionnel pour les semaines sans planning Combo. Le lien « Combo » rattache le contrat
          aux lignes importées (anonymes) pour récupérer les heures réalisées.
        </div>
      </section>

      {/* 2. Complément de rémunération Poire */}
      <section>
        <div className="h2">
          Complément de rémunération « Poire » <span className="tag">cash · hors charges</span>
        </div>
        <Msg state={poireState} />
        <form action={poireAction} className="frm">
          <div>
            <label>Salarié</label>
            <select name="contrat_id" defaultValue={poireCell?.contrat_id ?? ''} key={`pc${poireCell?.contrat_id ?? ''}`} required>
              <option value="">— choisir —</option>
              {contrats.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nom_affichage}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label>Mois</label>
            <select name="mois" defaultValue={poireCell?.mois ?? months[0]} key={`pm${poireCell?.mois ?? ''}`} required>
              {months.map((m) => (
                <option key={m} value={m}>
                  {labelOfYm(m)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label>Montant (€)</label>
            <input
              type="number"
              step="0.01"
              name="montant"
              defaultValue={
                poireCell ? (poireMap.get(`${poireCell.contrat_id}|${poireCell.mois}`) ?? '') : ''
              }
              key={`pv${poireCell?.contrat_id ?? ''}${poireCell?.mois ?? ''}`}
            />
          </div>
          <div>
            <button className="btn btn-primary" type="submit">
              Enregistrer
            </button>
          </div>
        </form>

        <div className="daily">
          <table className="day">
            <thead>
              <tr>
                <th>Salarié</th>
                {months.map((m) => (
                  <th key={m}>{m.slice(5)}</th>
                ))}
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {contrats.map((c) => {
                let tot = 0
                return (
                  <tr key={c.id}>
                    <td>{c.nom_affichage}</td>
                    {months.map((m) => {
                      const v = poireMap.get(`${c.id}|${m}`) ?? 0
                      tot += v
                      return (
                        <td
                          key={m}
                          onClick={() => setPoireCell({ contrat_id: c.id, mois: m })}
                          style={{ cursor: 'pointer' }}
                          title="Cliquer pour modifier"
                        >
                          {v ? EUR(v) : '—'}
                        </td>
                      )
                    })}
                    <td>
                      <b>{EUR(tot)}</b>
                    </td>
                  </tr>
                )
              })}
              <tr className="tot">
                <td>Total</td>
                {months.map((m) => (
                  <td key={m}>{poireParMois[m] ? EUR(poireParMois[m]) : '—'}</td>
                ))}
                <td>{EUR(Object.values(poireParMois).reduce((a, b) => a + b, 0))}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="foot">
          Versé en <b>cash</b>, ce complément <b>n&apos;est pas soumis aux charges sociales</b> : il est ajouté au
          coût global <b>après</b> application du coefficient de charges. Clique une cellule pour la modifier
          (montant 0 = suppression).
        </div>
      </section>

      {/* 3. Heures réalisées / prévisionnelles */}
      <section>
        <div className="h2">Heures par salarié</div>
        <div className="daily">
          <table className="day">
            <thead>
              <tr>
                <th>Salarié</th>
                {months.map((m) => (
                  <th key={m}>{m.slice(5)}</th>
                ))}
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {contrats.map((c) => {
                let tot = 0
                return (
                  <tr key={c.id}>
                    <td>{c.nom_affichage}</td>
                    {months.map((m) => {
                      const r = heuresReal.get(`${c.id}|${m}`)
                      const p = prevHeures(c, m)
                      const v = r ?? p
                      tot += v
                      return (
                        <td key={m} style={{ color: r == null && p > 0 ? 'var(--ink-soft)' : undefined }}>
                          {v > 0 ? N1(v) : '—'}
                          {r == null && p > 0 ? <span title="prévisionnel"> ·p</span> : null}
                        </td>
                      )
                    })}
                    <td>
                      <b>{N1(tot)}</b>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <div className="foot">
          Heures <b>réalisées</b> issues de l&apos;import Combo (contrats rattachés). Quand le mois n&apos;a pas
          de données Combo, on affiche le <b>prévisionnel</b> (suffixe « ·p ») calculé depuis les heures hebdo
          cible, au prorata de la période de contrat.
        </div>
      </section>

      {/* 4. Détail du calcul du coût global */}
      <section>
        <div className="h2">
          Détail du calcul du coût global <span className="tag">réalisé {annee}</span>
        </div>
        <div className="daily">
          <table className="day">
            <thead>
              <tr>
                <th>Mois</th>
                <th>Salaire de base</th>
                <th>Maj. h. supp</th>
                <th>Fériés / 1er mai</th>
                <th>6ème jour</th>
                <th>CP (10 %)</th>
                <th>Brut</th>
                <th>Charges ({PCT(tauxCharges * 100)})</th>
                <th>Compl. Poire</th>
                <th>Coût global</th>
              </tr>
            </thead>
            <tbody>
              {months.map((m) => {
                const d = real[m]
                if (!d) return null
                const charges = d.brut * tauxCharges
                const pr = poireParMois[m] || 0
                return (
                  <tr key={m}>
                    <td>{labelOfYm(m)}</td>
                    <td>{EUR(d.base)}</td>
                    <td>{EUR(d.supp)}</td>
                    <td>{EUR(d.ferie)}</td>
                    <td>{EUR(d.sixieme)}</td>
                    <td>{EUR(d.cp)}</td>
                    <td>
                      <b>{EUR(d.brut)}</b>
                    </td>
                    <td>{EUR(charges)}</td>
                    <td className="poire">{pr ? EUR(pr) : '—'}</td>
                    <td>
                      <b>{EUR(coutGlobal(d.brut, tauxCharges, pr))}</b>
                    </td>
                  </tr>
                )
              })}
              {(() => {
                const tot = months.reduce(
                  (a, m) => {
                    const d = real[m]
                    if (!d) return a
                    const pr = poireParMois[m] || 0
                    return {
                      base: a.base + d.base,
                      supp: a.supp + d.supp,
                      ferie: a.ferie + d.ferie,
                      sixieme: a.sixieme + d.sixieme,
                      cp: a.cp + d.cp,
                      brut: a.brut + d.brut,
                      poire: a.poire + pr,
                    }
                  },
                  { base: 0, supp: 0, ferie: 0, sixieme: 0, cp: 0, brut: 0, poire: 0 },
                )
                return (
                  <tr className="tot">
                    <td>Total {annee}</td>
                    <td>{EUR(tot.base)}</td>
                    <td>{EUR(tot.supp)}</td>
                    <td>{EUR(tot.ferie)}</td>
                    <td>{EUR(tot.sixieme)}</td>
                    <td>{EUR(tot.cp)}</td>
                    <td>{EUR(tot.brut)}</td>
                    <td>{EUR(tot.brut * tauxCharges)}</td>
                    <td>{EUR(tot.poire)}</td>
                    <td>{EUR(coutGlobal(tot.brut, tauxCharges, tot.poire))}</td>
                  </tr>
                )
              })()}
            </tbody>
          </table>
        </div>
        <div className="foot">
          Brut = salaire de base + majoration des heures supp hors contrat (×1,10 / ×1,20 / ×1,50 au taux horaire
          contractuel) + fériés et 1er mai (+100 %) + 6ème jour (base ÷ 6, « 6 jours payés 7 »), le tout majoré
          de la provision congés payés (+10 %). Pas de majoration de nuit (convention CHR). Coût global = brut ×
          (1 + charges patronales) + complément Poire (non chargé).
        </div>
      </section>
    </>
  )
}
