'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import type { Base, DashControls, LaborRow, PoireDay, TicketMetric } from '../lib/types'
import {
  buildPoireMap,
  compute,
  computeLabor,
  grandTotal,
  hasLabor,
  hasPoire,
  laborBrutByMonth,
  mergeRes,
  monthlyPivot,
  yearStats,
  type LaborResult,
  type MonthCell,
  type MonthlyPivot,
  type RestoCell,
  type SvcCell,
} from '../lib/analytics'
import { EUR, EUR2, INT, N1, PCT, frDMY, frDate, frMD } from '../lib/format'

type Props = {
  tickets: TicketMetric[]
  poire: PoireDay[]
  labor: LaborRow[]
}

const CUTOFFS = [17, 16, 18, 19, 12]

export default function Dashboard({ tickets, poire, labor }: Props) {
  const poireMap = useMemo(() => buildPoireMap(poire), [poire])
  const hasP = hasPoire(poireMap)

  const { MIND, MAXD, defFrom, defTo } = useMemo(() => {
    const dates = tickets.map((t) => t.jour).sort()
    const mind = dates[0] ?? ''
    const maxd = dates[dates.length - 1] ?? ''
    const maxYear = maxd.slice(0, 4)
    const yDates = dates.filter((d) => d.startsWith(maxYear))
    return {
      MIND: mind,
      MAXD: maxd,
      defFrom: yDates[0] ?? mind,
      defTo: yDates[yDates.length - 1] ?? maxd,
    }
  }, [tickets])

  const [from, setFrom] = useState(defFrom)
  const [to, setTo] = useState(defTo)
  const [cutoff, setCutoff] = useState(17)
  const [base, setBase] = useState<Base>('ttc')
  const [incPoire, setIncPoire] = useState(true)
  const [chargeRate, setChargeRate] = useState(0.42) // charges patronales (éditable)

  const ctrl: DashControls = { from, to, cutoff, base, incPoire }
  const C = useMemo(
    () => compute(tickets, poireMap, ctrl),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tickets, poireMap, from, to, cutoff, base, incPoire],
  )

  const tot = mergeRes(C.R)
  const grand = grandTotal(C)
  const baseUp = base.toUpperCase()

  // Ratios par jour ouvert (jours pondérés : 0,25 midi / 0,75 soir)
  const caPerDay = C.openDays ? grand / C.openDays : null
  const covPerDay = C.openDays ? C.couverts / C.openDays : null

  const pivot = useMemo(
    () => monthlyPivot(tickets, poireMap, ctrl),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tickets, poireMap, cutoff, base, incPoire],
  )

  // Coûts salariaux : brut estimé par mois + jours ouverts par mois (mois entier)
  const brutByMonth = useMemo(() => laborBrutByMonth(labor), [labor])
  const hasLab = hasLabor(brutByMonth)
  const monthOpenDays = useMemo(() => {
    const m: Record<string, number> = {}
    for (const [k, c] of Object.entries(pivot.cells)) {
      const [y, mo] = k.split('-')
      m[`${y}-${mo.padStart(2, '0')}`] = c.openDays
    }
    return m
  }, [pivot])
  const caByMonth = useMemo(() => {
    const m: Record<string, number> = {}
    for (const [k, c] of Object.entries(pivot.cells)) {
      const [y, mo] = k.split('-')
      m[`${y}-${mo.padStart(2, '0')}`] = c.caTotal
    }
    return m
  }, [pivot])
  const L = computeLabor(C, monthOpenDays, brutByMonth, chargeRate)
  const pctMasse = grand > 0 ? (100 * L.charged) / grand : null

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
        <p className="sub">
          Restaurant, desserts seuls et bar, midi et soir, Poire intégrée et comparaison des années —
          le tout à partir des données stockées.
        </p>
        <div className="triline">
          <span className="a" />
          <span className="b" />
          <span className="c" />
        </div>
        <div className="toolbar">
          <Link className="btn btn-ghost" href="/projects/analyse-services/import">
            ↑ Importer des données
          </Link>
        </div>
      </header>

      {/* Controls */}
      <div className="controls">
        <div className="field">
          <label>Du</label>
          <input type="date" min={MIND} max={MAXD} value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div className="field">
          <label>Au</label>
          <input type="date" min={MIND} max={MAXD} value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <button
          className="ghost"
          onClick={() => {
            setFrom(MIND)
            setTo(MAXD)
          }}
        >
          Toute la période
        </button>
        <div className="field">
          <label>Bascule midi / soir</label>
          <select value={cutoff} onChange={(e) => setCutoff(parseInt(e.target.value, 10))}>
            {CUTOFFS.map((c) => (
              <option key={c} value={c}>
                {c} h
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>Base</label>
          <div className="seg">
            <button className={base === 'ttc' ? 'act' : ''} onClick={() => setBase('ttc')}>
              TTC
            </button>
            <button className={base === 'ht' ? 'act' : ''} onClick={() => setBase('ht')}>
              HT
            </button>
          </div>
        </div>
        {hasP && (
          <div className="poire-wrap">
            <label className="check">
              <input type="checkbox" checked={incPoire} onChange={(e) => setIncPoire(e.target.checked)} />{' '}
              Inclure la Poire
            </label>
          </div>
        )}
        <div className="range-note">
          {C.nDays} jour{C.nDays > 1 ? 's' : ''} · {frDMY(C.from)} → {frDMY(C.to)}
        </div>
      </div>

      {/* Vue d'ensemble */}
      <section>
        <div className="h2">
          Vue d&apos;ensemble{' '}
          <span className="tag">
            {EUR(grand)} {baseUp}
          </span>
        </div>
        <div className="matrix">
          <Tcard cls="resto" name="Restaurant" desc="Au moins un plat ou une entrée" M={C.M.resto} />
          <Tcard cls="dessert" name="Desserts seuls" desc="Dessert sans plat ni entrée" M={C.M.dessert} />
          <Tcard cls="bar" name="Bar" desc="Boissons uniquement, sans plat" M={C.M.bar} poireV={C.poireV} />
        </div>
      </section>

      {/* Jours d'ouverture */}
      <section>
        <div className="h2">Jours d&apos;ouverture</div>
        <div className="kpis">
          <div className="kpi">
            <div className="l">Jours ouverts</div>
            <div className="v">{N1(C.openDays)}</div>
            <div className="sub">
              {C.nDays} jour{C.nDays > 1 ? 's' : ''} d&apos;activité · midi 0,25 + soir 0,75 (service ouvert si ≥
              5 tickets)
            </div>
          </div>
          <div className="kpi">
            <div className="l">CA moyen / jour ouvert</div>
            <div className="v">{caPerDay != null ? EUR(caPerDay) : '—'}</div>
            <div className="sub">
              {EUR(grand)} {baseUp} / {N1(C.openDays)} j
            </div>
          </div>
          <div className="kpi">
            <div className="l">Couverts / jour ouvert</div>
            <div className="v">{covPerDay != null ? N1(covPerDay) : '—'}</div>
            <div className="sub">
              {INT(C.couverts)} couv. / {N1(C.openDays)} j
            </div>
          </div>
        </div>
      </section>

      {/* KPIs restaurant */}
      <section>
        <div className="h2">Tickets restaurant — indicateurs salle</div>
        <Kpis tot={tot} />
      </section>

      {/* Midi vs soir + répartition */}
      <section>
        <div className="cols">
          <div className="box">
            <h3>Restaurant : midi vs soir</h3>
            <SvcTable cutoff={cutoff} R={C.R} tot={tot} />
          </div>
          <div className="box">
            <h3>Répartition du revenu restaurant</h3>
            <Repartition tot={tot} />
          </div>
        </div>
      </section>

      {/* Comparaison annuelle */}
      <Comparison tickets={tickets} poireMap={poireMap} ctrl={ctrl} hasP={hasP} />

      {/* Tableau par mois */}
      <Monthly pivot={pivot} baseUp={baseUp} />

      {/* Coûts salariaux */}
      {hasLab && (
        <LaborSection
          L={L}
          brutByMonth={brutByMonth}
          monthOpenDays={monthOpenDays}
          caByMonth={caByMonth}
          chargeRate={chargeRate}
          setChargeRate={setChargeRate}
          pctMasse={pctMasse}
          openDays={C.openDays}
          baseUp={baseUp}
        />
      )}

      {/* Jour par jour */}
      <section>
        <div className="h2">Jour par jour</div>
        <Daily C={C} poireMap={poireMap} ctrl={ctrl} hasP={hasP} laborPerDay={L.perDay} hasLab={hasLab} />
      </section>

      <Foot cutoff={cutoff} baseUp={baseUp} hasP={hasP} />
    </div>
  )
}

// ─── Cartes vue d'ensemble ───

function Tcard({
  cls,
  name,
  desc,
  M,
  poireV = 0,
}: {
  cls: string
  name: string
  desc: string
  M: { Midi: SvcCell; Soir: SvcCell }
  poireV?: number
}) {
  const total = M.Midi.rev + M.Soir.rev + (poireV || 0)
  const ntot = M.Midi.n + M.Soir.n
  return (
    <div className={`tcard ${cls}`}>
      <div className="name">{name}</div>
      <div className="desc">{desc}</div>
      <div className="big">{EUR(total)}</div>
      {poireV ? <div className="poireline">+ {EUR(poireV)} de Poire (cash comptoir)</div> : null}
      <div className="desc">
        {INT(ntot)} ticket{ntot > 1 ? 's' : ''}
        {poireV ? ' en caisse' : ''}
      </div>
      <div className="splitrow">
        <div className="s">
          <div className="l">Midi</div>
          <div className="v">{EUR(M.Midi.rev)}</div>
          <div className="t">{INT(M.Midi.n)} tk</div>
        </div>
        <div className="s">
          <div className="l">Soir + nuit</div>
          <div className="v">{EUR(M.Soir.rev)}</div>
          <div className="t">{INT(M.Soir.n)} tk</div>
        </div>
      </div>
    </div>
  )
}

// ─── KPIs ───

function Kpis({ tot }: { tot: RestoCell }) {
  const panier = tot.couverts ? tot.rev / tot.couverts : null
  const txDess = tot.couverts ? (100 * tot.dessert.n) / tot.couverts : null
  const txEnt = tot.couverts ? (100 * tot.entree.n) / tot.couverts : null
  const ratio = tot.couverts ? tot.plats / tot.couverts : null
  return (
    <div className="kpis">
      <div className="kpi">
        <div className="l">Couverts saisis</div>
        <div className="v">{INT(tot.couverts)}</div>
        <div className="sub">
          {INT(tot.tickets)} tickets resto{tot.zeroCv ? ` · ${tot.zeroCv} sans couvert` : ''}
        </div>
      </div>
      <div className="kpi">
        <div className="l">Plats vendus</div>
        <div className="v">{INT(tot.plats)}</div>
        <div className="sub">
          ratio {ratio != null ? N1(ratio) : '—'} plat/couvert
          {tot.offPlat
            ? ` · ${tot.offPlat} offert${tot.offPlat > 1 ? 's' : ''} exclu${tot.offPlat > 1 ? 's' : ''}`
            : ''}
        </div>
      </div>
      <div className="kpi">
        <div className="l">Panier moyen</div>
        <div className="v">
          {panier != null ? EUR2(panier) : '—'}
          <small>/couv.</small>
        </div>
        <div className="sub">
          {EUR(tot.rev)} / {INT(tot.couverts)} couv.
        </div>
      </div>
      <div className="kpi">
        <div className="l">Taux d&apos;entrées</div>
        <div className="v">{txEnt != null ? PCT(txEnt) : '—'}</div>
        <div className="sub">{INT(tot.entree.n)} entrées / couv.</div>
      </div>
      <div className="kpi">
        <div className="l">Taux de desserts</div>
        <div className="v">{txDess != null ? PCT(txDess) : '—'}</div>
        <div className="sub">{INT(tot.dessert.n)} desserts / couv.</div>
      </div>
    </div>
  )
}

// ─── Tableau midi vs soir ───

function svcCells(r: RestoCell) {
  const pan = r.couverts ? r.rev / r.couverts : null
  const td = r.couverts ? (100 * r.dessert.n) / r.couverts : null
  const te = r.couverts ? (100 * r.entree.n) / r.couverts : null
  const rt = r.couverts ? r.plats / r.couverts : null
  return (
    <>
      <td>{INT(r.tickets)}</td>
      <td>{INT(r.couverts)}</td>
      <td>{INT(r.plats)}</td>
      <td>{rt != null ? N1(rt) : '—'}</td>
      <td>{EUR(r.rev)}</td>
      <td>{pan != null ? EUR2(pan) : '—'}</td>
      <td>{te != null ? PCT(te) : '—'}</td>
      <td>{td != null ? PCT(td) : '—'}</td>
    </>
  )
}

function SvcTable({
  cutoff,
  R,
  tot,
}: {
  cutoff: number
  R: { Midi: RestoCell; Soir: RestoCell }
  tot: RestoCell
}) {
  return (
    <table className="svc">
      <thead>
        <tr>
          <th>Service</th>
          <th>Tk</th>
          <th>Couv.</th>
          <th>Plats</th>
          <th>P/C</th>
          <th>Revenu</th>
          <th>Panier</th>
          <th>%Ent.</th>
          <th>%Dess.</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Midi ({cutoff}h)</td>
          {svcCells(R.Midi)}
        </tr>
        <tr>
          <td>Soir + nuit</td>
          {svcCells(R.Soir)}
        </tr>
        <tr className="tot">
          <td>Total</td>
          {svcCells(tot)}
        </tr>
      </tbody>
    </table>
  )
}

// ─── Répartition ───

function Repartition({ tot }: { tot: RestoCell }) {
  const order: [keyof RestoCell, string, string][] = [
    ['entree', 'Entrées', 'var(--entree)'],
    ['plat', 'Plats', 'var(--plat)'],
    ['dessert', 'Desserts', 'var(--dess)'],
    ['boisson', 'Boissons', 'var(--bois)'],
  ]
  if (tot.autre.rev > 0.005 * tot.rev) order.push(['autre', 'Autre (tabac, manuel…)', 'var(--autre)'])
  const sum = order.reduce((s, [k]) => s + (tot[k] as { rev: number }).rev, 0) || 1
  return (
    <div className="rep">
      {order.map(([k, lbl, col]) => {
        const rev = (tot[k] as { rev: number }).rev
        const p = (100 * rev) / sum
        return (
          <div className="repbar" key={k as string}>
            <div className="top">
              <span className="n">
                <i style={{ background: col }} />
                {lbl}
              </span>
              <span>
                <span className="pct">{N1(p)} %</span>
                <span style={{ color: 'var(--ink-soft)' }}> · {EUR(rev)}</span>
              </span>
            </div>
            <div className="track">
              <div className="fill" style={{ width: `${p}%`, background: col }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Comparaison annuelle ───

function Comparison({
  tickets,
  poireMap,
  ctrl,
  hasP,
}: {
  tickets: TicketMetric[]
  poireMap: Record<string, number>
  ctrl: DashControls
  hasP: boolean
}) {
  const years = [...new Set(tickets.map((t) => t.jour.slice(0, 4)))].sort()
  let mdFrom = ctrl.from.slice(5)
  let mdTo = ctrl.to.slice(5)
  if (mdFrom > mdTo) {
    mdFrom = '01-01'
    mdTo = '12-31'
  }
  const stats = years.map((y) => yearStats(tickets, poireMap, y, mdFrom, mdTo, ctrl)).filter((s) => s.hasData)
  if (stats.length < 2) return null

  const maxCA = Math.max(...stats.map((s) => s.total)) || 1
  const curYear = ctrl.to.slice(0, 4)

  return (
    <section>
      <div className="h2">
        Comparaison annuelle{' '}
        <span className="tag">
          du {frMD(ctrl.from)} au {frMD(ctrl.to)}
        </span>
      </div>
      <div className="cmp">
        <div className="note">
          Même fenêtre calendaire ({frMD(ctrl.from)} → {frMD(ctrl.to)}) comparée d&apos;une année sur l&apos;autre
          · base {ctrl.base.toUpperCase()}
          {ctrl.incPoire && hasP ? ' · Poire incluse quand elle est disponible' : ''}.
        </div>
        <table className="cmp-t">
          <thead>
            <tr>
              <th>Année</th>
              <th>CA total</th>
              <th>Évol.</th>
              <th>Bar</th>
              <th>Restaurant</th>
              <th>Couverts</th>
              <th>Plats</th>
              <th>Panier</th>
              <th>Poire</th>
            </tr>
          </thead>
          <tbody>
            {stats.map((s, i) => {
              const prev = i > 0 ? stats[i - 1] : null
              let evo: React.ReactNode = '—'
              if (prev) {
                const e = prev.total ? (100 * (s.total - prev.total)) / prev.total : 0
                evo = (
                  <span className={`evo ${e >= 0 ? 'up' : 'down'}`}>
                    {e >= 0 ? '▲' : '▼'} {N1(Math.abs(e))} %
                  </span>
                )
              }
              const windowEnd = `${s.year}-${mdTo}`
              const partial = s.maxd < windowEnd
              return (
                <tr key={s.year} className={s.year === curYear ? 'cur' : ''}>
                  <td>
                    <span className="yr">{s.year}</span>
                    {partial ? <div className="partial">jusqu&apos;au {frMD(s.maxd)}</div> : null}
                  </td>
                  <td>
                    <b>{EUR(s.total)}</b>
                    <div className="cabar">
                      <i style={{ width: `${(100 * s.total) / maxCA}%` }} />
                    </div>
                  </td>
                  <td>{evo}</td>
                  <td>{EUR(s.bar)}</td>
                  <td>{EUR(s.restoCA)}</td>
                  <td>{INT(s.cv)}</td>
                  <td>{INT(s.plats)}</td>
                  <td>{s.panier != null ? EUR2(s.panier) : '—'}</td>
                  <td>{s.poire ? EUR(s.poire) : '—'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}

// ─── Tableau par mois ───

const MONTH_LABELS = [
  'janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin',
  'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.',
]

type Indic = {
  key: string
  label: string
  value: (c: MonthCell) => number | null
  fmt: (v: number) => string
}

const INDICS: Indic[] = [
  { key: 'caTotal', label: 'CA total', value: (c) => c.caTotal, fmt: EUR },
  { key: 'caResto', label: 'CA resto', value: (c) => c.caResto, fmt: EUR },
  { key: 'caBar', label: 'CA bar', value: (c) => c.caBar, fmt: EUR },
  { key: 'couverts', label: 'Nb couverts', value: (c) => c.couverts, fmt: INT },
  { key: 'nTickets', label: 'Nb tickets', value: (c) => c.nTickets, fmt: INT },
  {
    key: 'caPerDay',
    label: 'CA moyen / jour ouvert',
    value: (c) => (c.openDays ? c.caTotal / c.openDays : null),
    fmt: EUR,
  },
  {
    key: 'covPerDay',
    label: 'Couverts / jour ouvert',
    value: (c) => (c.openDays ? c.couverts / c.openDays : null),
    fmt: N1,
  },
  {
    key: 'pctDess',
    label: '% desserts',
    value: (c) => (c.couverts ? (100 * c.nDessert) / c.couverts : null),
    fmt: PCT,
  },
  {
    key: 'pctEnt',
    label: '% entrées',
    value: (c) => (c.couverts ? (100 * c.nEntree) / c.couverts : null),
    fmt: PCT,
  },
]

function sumCells(cells: MonthCell[]): MonthCell {
  return cells.reduce<MonthCell>(
    (a, c) => ({
      caTotal: a.caTotal + c.caTotal,
      caResto: a.caResto + c.caResto,
      caBar: a.caBar + c.caBar,
      couverts: a.couverts + c.couverts,
      nTickets: a.nTickets + c.nTickets,
      openDays: a.openDays + c.openDays,
      nDessert: a.nDessert + c.nDessert,
      nEntree: a.nEntree + c.nEntree,
    }),
    { caTotal: 0, caResto: 0, caBar: 0, couverts: 0, nTickets: 0, openDays: 0, nDessert: 0, nEntree: 0 },
  )
}

function Monthly({ pivot, baseUp }: { pivot: MonthlyPivot; baseUp: string }) {
  const [ind, setInd] = useState('caTotal')
  const cur = INDICS.find((i) => i.key === ind) ?? INDICS[0]
  if (pivot.years.length === 0) return null

  const fmt = (v: number | null) => (v == null ? '—' : cur.fmt(v))
  const cell = (y: string, m: number): MonthCell | undefined => pivot.cells[`${y}-${m}`]

  return (
    <section>
      <div className="h2">
        Par mois <span className="tag">{cur.label}</span>
      </div>
      <div className="controls" style={{ marginBottom: 12 }}>
        <div className="field">
          <label>Indicateur</label>
          <select value={ind} onChange={(e) => setInd(e.target.value)}>
            {INDICS.map((i) => (
              <option key={i.key} value={i.key}>
                {i.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="daily">
        <table className="day">
          <thead>
            <tr>
              <th>Année</th>
              {pivot.months.map((m) => (
                <th key={m}>{MONTH_LABELS[m - 1]}</th>
              ))}
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {pivot.years.map((y) => {
              const yearCells = pivot.months.map((m) => cell(y, m)).filter((c): c is MonthCell => !!c)
              const yearTot = sumCells(yearCells)
              return (
                <tr key={y}>
                  <td>
                    <span className="yr">{y}</span>
                  </td>
                  {pivot.months.map((m) => {
                    const c = cell(y, m)
                    return <td key={m}>{c ? fmt(cur.value(c)) : '—'}</td>
                  })}
                  <td>
                    <b>{fmt(cur.value(yearTot))}</b>
                  </td>
                </tr>
              )
            })}
            <tr className="tot">
              <td>Total</td>
              {pivot.months.map((m) => {
                const monthCells = pivot.years
                  .map((y) => cell(y, m))
                  .filter((c): c is MonthCell => !!c)
                return <td key={m}>{fmt(cur.value(sumCells(monthCells)))}</td>
              })}
              <td>{fmt(cur.value(sumCells(Object.values(pivot.cells))))}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div className="foot">
        Une ligne par année, une colonne par mois · base <b>{baseUp}</b>. Indépendant de la plage de dates
        choisie plus haut (le mois est le regroupement). « CA moyen / jour ouvert » et « Couverts / jour ouvert »
        utilisent les jours d&apos;ouverture pondérés ; « % desserts / entrées » se basent sur les couverts
        restaurant.
      </div>
    </section>
  )
}

// ─── Coûts salariaux ───

function LaborSection({
  L,
  brutByMonth,
  monthOpenDays,
  caByMonth,
  chargeRate,
  setChargeRate,
  pctMasse,
  openDays,
  baseUp,
}: {
  L: LaborResult
  brutByMonth: Record<string, number>
  monthOpenDays: Record<string, number>
  caByMonth: Record<string, number>
  chargeRate: number
  setChargeRate: (n: number) => void
  pctMasse: number | null
  openDays: number
  baseUp: string
}) {
  const months = Object.keys(brutByMonth).sort()
  const chargedPerDay = openDays > 0 ? L.charged / openDays : null

  return (
    <section>
      <div className="h2">
        Coûts salariaux <span className="tag">estimation · {EUR(L.charged)} chargé</span>
      </div>

      <div className="controls" style={{ marginBottom: 12 }}>
        <div className="field">
          <label>Charges patronales</label>
          <div className="seg" style={{ alignItems: 'center' }}>
            <input
              type="number"
              min={0}
              max={100}
              step={1}
              value={Math.round(chargeRate * 100)}
              onChange={(e) => setChargeRate((parseFloat(e.target.value) || 0) / 100)}
              style={{ width: 70 }}
            />
            <span style={{ padding: '0 8px' }}>%</span>
          </div>
        </div>
      </div>

      <div className="kpis">
        <div className="kpi">
          <div className="l">Coût brut (période)</div>
          <div className="v">{EUR(L.brut)}</div>
          <div className="sub">salaire de base + heures supp + fériés + 6ème jour + CP</div>
        </div>
        <div className="kpi">
          <div className="l">Coût chargé (période)</div>
          <div className="v">{EUR(L.charged)}</div>
          <div className="sub">brut × (1 + {Math.round(chargeRate * 100)} % charges)</div>
        </div>
        <div className="kpi">
          <div className="l">% masse salariale / CA</div>
          <div className="v">{pctMasse != null ? PCT(pctMasse) : '—'}</div>
          <div className="sub">coût chargé / CA {baseUp} de la période</div>
        </div>
        <div className="kpi">
          <div className="l">Coût chargé / jour ouvert</div>
          <div className="v">{chargedPerDay != null ? EUR(chargedPerDay) : '—'}</div>
          <div className="sub">{N1(openDays)} jour(s) ouvert(s) sur la période</div>
        </div>
      </div>

      <div className="daily" style={{ marginTop: 14 }}>
        <table className="day">
          <thead>
            <tr>
              <th>Mois de paie</th>
              <th>Brut estimé</th>
              <th>Chargé</th>
              <th>Jours ouverts</th>
              <th>Chargé / j</th>
              <th>% CA</th>
            </tr>
          </thead>
          <tbody>
            {months.map((ym) => {
              const brut = brutByMonth[ym]
              const charged = brut * (1 + chargeRate)
              const od = monthOpenDays[ym] || 0
              const ca = caByMonth[ym] || 0
              return (
                <tr key={ym}>
                  <td>{ym}</td>
                  <td>{EUR(brut)}</td>
                  <td>{EUR(charged)}</td>
                  <td>{od > 0 ? N1(od) : '—'}</td>
                  <td>{od > 0 ? EUR(charged / od) : '—'}</td>
                  <td>{ca > 0 ? PCT((100 * charged) / ca) : '—'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="foot">
        <b>Estimation de gestion</b> à partir de l&apos;export comptable Combo (anonymisé : aucun nom stocké).
        Brut = salaire de base + heures supp hors contrat valorisées (×1,10 / ×1,20 / ×1,50 au taux horaire
        contractuel) + heures fériés et 1er mai (+100 %) + <b>6ème jour</b> (salaire de base ÷ 6, « 6 jours payés
        7 ») + provision <b>congés payés</b> +10 % ; pas de majoration de nuit (CHR). Coût chargé = brut × (1 +
        taux de charges patronales, éditable ci-dessus). Le coût mensuel est réparti sur les <b>jours d&apos;ouverture</b>
        du mois puis prorata de la période affichée. Le « double du 6ème jour » réel n&apos;étant pas isolable dans
        l&apos;export, il est approché par la règle ci-dessus.
      </div>
    </section>
  )
}

// ─── Jour par jour ───

function Daily({
  C,
  poireMap,
  ctrl,
  hasP,
  laborPerDay,
  hasLab,
}: {
  C: ReturnType<typeof compute>
  poireMap: Record<string, number>
  ctrl: DashControls
  hasP: boolean
  laborPerDay: Record<string, number>
  hasLab: boolean
}) {
  const ds = Object.keys(C.days).sort()
  const tt = { resto: 0, dessert: 0, bar: 0, couverts: 0, poire: 0, total: 0, labor: 0 }
  // Poire = cash non soumis à la TVA → même montant en TTC et HT.
  const poireVal = (montant: number) => (ctrl.incPoire && hasP ? montant : 0)

  const rows = ds.map((d) => {
    const x = C.days[d]
    const pV = poireVal(poireMap[d] || 0)
    const lineTot = x.total + pV
    const lab = laborPerDay[d] || 0
    tt.resto += x.resto
    tt.dessert += x.dessert
    tt.bar += x.bar
    tt.couverts += x.couverts
    tt.poire += pV
    tt.total += lineTot
    tt.labor += lab
    return (
      <tr key={d}>
        <td>{frDate(d)}</td>
        <td>{EUR(x.resto)}</td>
        <td>{EUR(x.dessert)}</td>
        <td>{EUR(x.bar)}</td>
        {hasP ? <td className="poire">{pV ? EUR(pV) : '—'}</td> : null}
        <td>{INT(x.couverts)}</td>
        <td>
          <b>{EUR(lineTot)}</b>
        </td>
        {hasLab ? <td className="labor">{lab ? EUR(lab) : '—'}</td> : null}
      </tr>
    )
  })

  return (
    <div className="daily">
      <table className="day">
        <thead>
          <tr>
            <th>Jour</th>
            <th>Restaurant</th>
            <th>Desserts</th>
            <th>Bar</th>
            {hasP ? <th>Poire</th> : null}
            <th>Couverts</th>
            <th>Total</th>
            {hasLab ? <th>Masse sal.</th> : null}
          </tr>
        </thead>
        <tbody>
          {rows}
          <tr className="tot">
            <td>Total</td>
            <td>{EUR(tt.resto)}</td>
            <td>{EUR(tt.dessert)}</td>
            <td>{EUR(tt.bar)}</td>
            {hasP ? <td>{EUR(tt.poire)}</td> : null}
            <td>{INT(tt.couverts)}</td>
            <td>{EUR(tt.total)}</td>
            {hasLab ? <td>{EUR(tt.labor)}</td> : null}
          </tr>
        </tbody>
      </table>
    </div>
  )
}

// ─── Note de bas de page ───

function Foot({ cutoff, baseUp, hasP }: { cutoff: number; baseUp: string; hasP: boolean }) {
  return (
    <div className="foot">
      Base <b>{baseUp}</b> · service du <b>soir = de {cutoff} h à 5 h du matin</b> (les ardoises fermées après
      minuit comptent dans le soir), midi = de 5 h à {cutoff} h. Tickets <b>restaurant</b> = au moins un plat ou
      une entrée · <b>desserts seuls</b> = dessert sans plat/entrée · <b>bar</b> = aucun plat. Plats = Plat,
      Pinsa, Salade/Poke · Boissons = vins, bières, cocktails, softs, cafés, bar rapide. Les lignes{' '}
      <b>offertes</b> (repas maison, gestes commerciaux) sont exclues du chiffre, des comptes de plats et du
      classement des tickets ; les tickets 100 % offerts sont ignorés. Le ratio <b>plat/couvert</b> recoupe les
      plats vendus avec les couverts saisis (≈1 = cohérent).{' '}
      {hasP
        ? 'La Poire (cash comptoir hors caisse) est ajoutée au bar et au total ; non ventilée midi/soir car saisie au jour. Non soumise à la TVA, elle affiche le même montant en TTC et en HT.'
        : 'Importe ta caisse Scoubidoo (.csv) ou ton fichier Poire (.xlsx avec colonnes Date + Poire) pour intégrer le cash comptoir.'}{' '}
      Le panier moyen et les taux se basent sur les couverts saisis dans L&apos;Addition.
    </div>
  )
}
