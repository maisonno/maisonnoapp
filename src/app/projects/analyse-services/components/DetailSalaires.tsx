'use client'

import { useActionState, useEffect, useState, useTransition } from 'react'
import Link from 'next/link'
import type { Contrat, HeuresMois, LaborRow, RemunerationPoire } from '../lib/types'
import {
  aggregateFromCombo,
  coutGlobal,
  estimateUnplannedWeeks,
  labelOfYm,
  monthsOfYear,
  poireByMonth,
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
  heures: HeuresMois[]
  semainesPlan: Set<string>
  tauxCharges: number
  annee: string
  anneesDispo: string[]
}

// Un contrat concerne l'année si sa période la chevauche
function concerneAnnee(c: Contrat, annee: string): boolean {
  const debutAnnee = `${annee}-01-01`
  const finAnnee = `${annee}-12-31`
  if (c.date_debut && c.date_debut > finAnnee) return false
  if (c.date_fin && c.date_fin < debutAnnee) return false
  return true
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

// Cellule éditable du tableau « Complément Poire » : enregistre à la sortie du
// champ (ou sur Entrée) via la Server Action, sans bouton.
function PoireCell({
  contratId,
  mois,
  montant,
}: {
  contratId: string
  mois: string
  montant: number
}) {
  const [pending, startTransition] = useTransition()
  const [value, setValue] = useState(montant ? String(montant) : '')

  const commit = () => {
    const next = value.trim()
    const before = montant ? String(montant) : ''
    if (next === before) return
    const fd = new FormData()
    fd.set('contrat_id', contratId)
    fd.set('mois', mois)
    fd.set('montant', next || '0')
    startTransition(async () => {
      await saveRemunerationPoire({} as ActionState, fd)
    })
  }

  return (
    <input
      type="number"
      step="0.01"
      inputMode="decimal"
      value={value}
      placeholder="—"
      disabled={pending}
      onChange={(e) => setValue(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
      }}
      style={{ opacity: pending ? 0.5 : 1 }}
    />
  )
}

function Msg({ state }: { state: ActionState }) {
  if (state.error) return <div className="msg-err">{state.error}</div>
  if (state.success) return <div className="msg-ok">{state.success}</div>
  return null
}

function Detail({
  labor,
  contrats,
  remPoire,
  heures,
  semainesPlan,
  tauxCharges,
  annee,
  anneesDispo,
}: Props) {
  const months = monthsOfYear(annee)
  const [edit, setEdit] = useState<Contrat | null>(null)

  const [contratState, contratAction] = useActionState(saveContrat, {} as ActionState)
  const [delState, delAction] = useActionState(deleteContrat, {} as ActionState)
  const [paramState, paramAction] = useActionState(saveParam, {} as ActionState)

  // Contrats de l'année sélectionnée uniquement
  const contratsAnnee = contrats.filter((c) => concerneAnnee(c, annee))

  const poireMap = new Map<string, number>()
  for (const r of remPoire) poireMap.set(`${r.contrat_id}|${ymOf(r.mois)}`, r.montant)

  // Heures issues des plannings Combo, par contrat × mois
  const hReel = new Map<string, number>()
  const hProj = new Map<string, number>()
  for (const h of heures) {
    const k = `${h.contrat_id}|${ymOf(h.mois)}`
    hReel.set(k, (hReel.get(k) || 0) + (h.heures_reelles || 0))
    hProj.set(
      k,
      (hProj.get(k) || 0) + (h.heures_projetees ?? h.heures_reelles ?? 0),
    )
  }

  // Semaines futures non planifiées → heures estimées (horaire cible au prorata)
  const estim = estimateUnplannedWeeks(contratsAnnee, semainesPlan, annee)

  // Coût réalisé : données Combo en priorité, repli sur l'ancien import fichier
  const combo = aggregateFromCombo(contrats, heures, 'reel')
  const fichier = realiseByMonth(labor.filter((l) => l.periode.startsWith(annee)))
  const real: typeof fichier = { ...fichier }
  for (const ym of combo.months) if (ym.startsWith(annee)) real[ym] = combo.brut[ym]

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
              step="0.1"
              min="0"
              max="100"
              defaultValue={Math.round(tauxCharges * 1000) / 10}
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
          Contrats{' '}
          <span className="tag">
            {contratsAnnee.length} contrat(s) actifs en {annee}
          </span>
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
                <th>Source</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {contratsAnnee.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ color: 'var(--ink-soft)' }}>
                    Aucun contrat actif en {annee}.
                  </td>
                </tr>
              ) : (
                contratsAnnee.map((c) => (
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
                    <td>{c.combo_contract_id ? 'ComboHR' : 'saisie'}</td>
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
              {contratsAnnee.map((c) => {
                let tot = 0
                return (
                  <tr key={c.id}>
                    <td>{c.nom_affichage}</td>
                    {months.map((m) => {
                      const v = poireMap.get(`${c.id}|${m}`) ?? 0
                      tot += v
                      return (
                        <td key={m}>
                          <PoireCell contratId={c.id} mois={m} montant={v} />
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
          coût global <b>après</b> application du coefficient de charges. Saisis directement dans les cellules —
          l&apos;enregistrement se fait en quittant le champ (vide ou 0 = suppression).
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
              {contratsAnnee.map((c) => {
                let tot = 0
                return (
                  <tr key={c.id}>
                    <td>{c.nom_affichage}</td>
                    {months.map((m) => {
                      const r = hReel.get(`${c.id}|${m}`) ?? 0
                      const planif = hProj.get(`${c.id}|${m}`) ?? 0
                      const est = estim.parContrat[`${c.id}|${m}`]?.heures ?? 0
                      const v = planif + est
                      tot += v
                      if (!v) return <td key={m}>—</td>
                      const aVenir = Math.round((planif - r) * 10) / 10
                      const marques = [
                        aVenir > 0 ? `${N1(aVenir)} h planifiées à venir` : null,
                        est > 0 ? `${N1(est)} h estimées (semaines non planifiées)` : null,
                      ].filter(Boolean)
                      return (
                        <td key={m} style={{ color: r ? undefined : 'var(--ink-soft)' }}>
                          {N1(v)}
                          {marques.length > 0 ? (
                            <span
                              title={[`${N1(r)} h pointées`, ...marques].join(' + ')}
                              style={{ color: 'var(--ink-soft)' }}
                            >
                              {' '}
                              {est > 0 ? '·e' : '·p'}
                            </span>
                          ) : null}
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
          Heures issues des <b>plannings ComboHR</b>, combinées <b>shift par shift</b> : un shift déjà effectué
          compte ses heures <b>pointées</b>, un shift à venir ses heures <b>planifiées</b>. Au-delà du{' '}
          <b>dernier shift planifié</b> (l&apos;horizon de planification), on ajoute une <b>estimation</b> =
          horaire hebdo cible (à défaut l&apos;horaire contractuel) au prorata des jours couverts par le contrat
          {estim.horizon
            ? ` — planning saisi jusqu'à la semaine du ${estim.horizon}, ${estim.semaines} semaine(s) estimée(s) au-delà`
            : ''}. Suffixes : « ·p » heures planifiées à venir, « ·e » heures estimées (survole pour le détail).
          En deçà de l&apos;horizon, une semaine sans shift signifie que le salarié ne travaille pas : rien
          n&apos;est estimé, et la fermeture hivernale apparaît telle quelle.
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
          C&apos;est la <b>décomposition du coût affiché dans l&apos;onglet « Coûts salariaux »</b> : d&apos;où
          viennent les euros, mois par mois. Source : les <b>heures pointées dans ComboHR</b> valorisées au
          salaire du contrat (repli sur l&apos;ancien import fichier pour les mois antérieurs à la synchro).
          <br />
          Brut = salaire de base + majoration des heures supp hors contrat (×1,10 / ×1,20 / ×1,50 au taux horaire
          contractuel) + fériés et 1er mai (+100 %) + 6ème jour (base ÷ 6, « 6 jours payés 7 »), le tout majoré
          de la provision congés payés (+10 %). Pas de majoration de nuit (convention CHR). Coût global = brut ×
          (1 + charges patronales) + complément Poire (non chargé).
        </div>
      </section>
    </>
  )
}
