// Portage fidèle de la logique métier du HTML de référence
// (compute / mergeRes / yearStats). Fonctions pures : pas de DOM.
//
// ⚠️ Règles à NE PAS dévier (cf. SPEC §6) :
//  - offerts déjà exclus en amont (vue ana_v_ticket_metrics) ;
//  - service du soir = heure ≥ cutoff OU heure < 5 (rebouclage nuit) ;
//  - Poire = cash TTC au jour, ajoutée au bar et au total, non ventilée midi/soir.

import { brutDetail } from './labor'
import type { Base, DashControls, LaborRow, PoireDay, TicketMetric, TicketType } from './types'

const NIGHT = 5

// Jours d'ouverture : un service (midi ou soir) est « ouvert » un jour donné s'il
// a au moins OPEN_MIN tickets. Un jour ouvert midi seul compte 0,25, soir seul
// 0,75, les deux 1. Sert aux ratios CA moyen / couverts moyen par jour ouvert.
const OPEN_MIN = 5
const W_MIDI = 0.25
const W_SOIR = 0.75

export type SvcCell = { n: number; rev: number }
export type Matrix = Record<TicketType, { Midi: SvcCell; Soir: SvcCell }>

export type Bucket = { rev: number; n: number }
export type RestoCell = {
  tickets: number
  couverts: number
  zeroCv: number
  rev: number
  plats: number
  offPlat: number
  entree: Bucket
  plat: Bucket
  dessert: Bucket
  boisson: Bucket
  autre: Bucket
}
export type DayAgg = {
  resto: number
  dessert: number
  bar: number
  couverts: number
  total: number
  midiTk: number // nb de tickets midi (pour le calcul jours ouverts)
  soirTk: number // nb de tickets soir
}

export type ComputeResult = {
  from: string
  to: string
  cut: number
  M: Matrix
  R: { Midi: RestoCell; Soir: RestoCell }
  days: Record<string, DayAgg>
  nDays: number // jours calendaires avec activité
  openDays: number // jours d'ouverture pondérés (0,25 midi / 0,75 soir)
  couverts: number // couverts resto (total fenêtre)
  poireTTC: number
  poireV: number
}

export type YearStat = {
  year: string
  n: number
  total: number
  bar: number
  restoCA: number
  cv: number
  plats: number
  panier: number | null
  poire: number
  hasData: boolean
  maxd: string
}

// ─── Helpers de base (valeur selon TTC/HT) ───

export const ticketVal = (t: TicketMetric, base: Base) => (base === 'ht' ? t.ht : t.ttc)

const BUCKETS = ['entree', 'plat', 'dessert', 'boisson', 'autre'] as const
type BucketKey = (typeof BUCKETS)[number]

const bucketRev = (t: TicketMetric, b: BucketKey, base: Base): number =>
  base === 'ht'
    ? (t[`ht_${b}` as keyof TicketMetric] as number)
    : (t[`ttc_${b}` as keyof TicketMetric] as number)

const bucketN = (t: TicketMetric, b: BucketKey): number => {
  if (b === 'autre') return 0 // la vue n'expose pas n_autre (non utilisé à l'affichage)
  return t[`n_${b}` as keyof TicketMetric] as number
}

// ─── Poire ───

export function buildPoireMap(rows: PoireDay[]): Record<string, number> {
  const m: Record<string, number> = {}
  for (const r of rows) m[r.jour] = (m[r.jour] || 0) + (r.montant_ttc || 0)
  return m
}

export const hasPoire = (poire: Record<string, number>) => Object.keys(poire).length > 0

// La Poire est du cash comptoir NON soumis à la TVA : son montant est identique
// en TTC et en HT (pas de conversion).
const poireBase = (montant: number) => montant

const incP = (ctrl: DashControls, poire: Record<string, number>) =>
  ctrl.incPoire && hasPoire(poire)

function poireSum(poire: Record<string, number>, from: string, to: string) {
  let s = 0
  for (const d in poire) if (d >= from && d <= to) s += poire[d]
  return s
}

// ─── Compute (plage sélectionnée) ───

const blankSvc = (): SvcCell => ({ n: 0, rev: 0 })
const blankResto = (): RestoCell => ({
  tickets: 0,
  couverts: 0,
  zeroCv: 0,
  rev: 0,
  plats: 0,
  offPlat: 0,
  entree: { rev: 0, n: 0 },
  plat: { rev: 0, n: 0 },
  dessert: { rev: 0, n: 0 },
  boisson: { rev: 0, n: 0 },
  autre: { rev: 0, n: 0 },
})

export function compute(
  tickets: TicketMetric[],
  poire: Record<string, number>,
  ctrl: DashControls,
): ComputeResult {
  const { from, to, cutoff: cut, base } = ctrl
  const sel = tickets.filter((t) => t.jour >= from && t.jour <= to)

  const M: Matrix = {
    resto: { Midi: blankSvc(), Soir: blankSvc() },
    dessert: { Midi: blankSvc(), Soir: blankSvc() },
    bar: { Midi: blankSvc(), Soir: blankSvc() },
  }
  const R = { Midi: blankResto(), Soir: blankResto() }
  const days: Record<string, DayAgg> = {}

  for (const t of sel) {
    const h = t.heure == null ? cut : t.heure
    const svc: 'Midi' | 'Soir' = h >= cut || h < NIGHT ? 'Soir' : 'Midi'
    const v = ticketVal(t, base)

    M[t.type][svc].n++
    M[t.type][svc].rev += v

    if (t.type === 'resto') {
      const r = R[svc]
      r.tickets++
      r.couverts += t.couverts
      if (t.couverts === 0) r.zeroCv++
      r.rev += v
      r.plats += t.n_plat
      r.offPlat += t.n_plat_offert
      for (const b of BUCKETS) {
        r[b].rev += bucketRev(t, b, base)
        r[b].n += bucketN(t, b)
      }
    }

    const d =
      days[t.jour] ||
      (days[t.jour] = { resto: 0, dessert: 0, bar: 0, couverts: 0, total: 0, midiTk: 0, soirTk: 0 })
    d[t.type] += v
    d.total += v
    if (t.type === 'resto') d.couverts += t.couverts
    if (svc === 'Midi') d.midiTk++
    else d.soirTk++
  }

  let openDays = 0
  for (const k in days) {
    const d = days[k]
    openDays += (d.midiTk >= OPEN_MIN ? W_MIDI : 0) + (d.soirTk >= OPEN_MIN ? W_SOIR : 0)
  }

  const poireTTC = poireSum(poire, from, to)
  const poireV = incP(ctrl, poire) ? poireBase(poireTTC) : 0
  return {
    from,
    to,
    cut,
    M,
    R,
    days,
    nDays: Object.keys(days).length,
    openDays,
    couverts: R.Midi.couverts + R.Soir.couverts,
    poireTTC,
    poireV,
  }
}

export function mergeRes(a: { Midi: RestoCell; Soir: RestoCell }): RestoCell {
  const T = blankResto()
  for (const s of ['Midi', 'Soir'] as const) {
    const r = a[s]
    T.tickets += r.tickets
    T.couverts += r.couverts
    T.zeroCv += r.zeroCv
    T.rev += r.rev
    T.plats += r.plats
    T.offPlat += r.offPlat
    for (const b of BUCKETS) {
      T[b].rev += r[b].rev
      T[b].n += r[b].n
    }
  }
  return T
}

// ─── Comparaison annuelle (même fenêtre calendaire) ───

export function yearStats(
  tickets: TicketMetric[],
  poire: Record<string, number>,
  year: string,
  mdFrom: string,
  mdTo: string,
  ctrl: DashControls,
): YearStat {
  const base = ctrl.base
  const sub = tickets.filter(
    (t) => t.jour.startsWith(year) && t.jour.slice(5) >= mdFrom && t.jour.slice(5) <= mdTo,
  )
  let total = 0
  let bar = 0
  let restoCA = 0
  let cv = 0
  let plats = 0
  let maxd = ''
  for (const t of sub) {
    const v = ticketVal(t, base)
    total += v
    if (t.type === 'bar') bar += v
    if (t.type === 'resto') {
      restoCA += v
      cv += t.couverts
      plats += t.n_plat
    }
    if (t.jour > maxd) maxd = t.jour
  }
  let pTTC = 0
  for (const d in poire) {
    if (d.startsWith(year) && d.slice(5) >= mdFrom && d.slice(5) <= mdTo) pTTC += poire[d]
  }
  const pV = incP(ctrl, poire) ? poireBase(pTTC) : 0
  return {
    year,
    n: sub.length,
    total: total + pV,
    bar: bar + pV,
    restoCA,
    cv,
    plats,
    panier: cv ? restoCA / cv : null,
    poire: pV,
    hasData: sub.length > 0,
    maxd,
  }
}

// Le grand total affiché dans la pastille « Vue d'ensemble »
export function grandTotal(C: ComputeResult): number {
  const types: TicketType[] = ['resto', 'dessert', 'bar']
  return types.reduce((s, k) => s + C.M[k].Midi.rev + C.M[k].Soir.rev, 0) + C.poireV
}

// ─── Tableau par mois (année × mois) ───
// Ignore la fenêtre from/to (le mois EST le regroupement) mais respecte
// cutoff (jours ouverts), base et incPoire. La Poire est ajoutée au bar et au
// total du mois. % desserts / % entrées calculés sur les couverts resto, comme
// les KPIs salle.

export type MonthCell = {
  caTotal: number
  caResto: number
  caBar: number
  couverts: number
  nTickets: number
  openDays: number
  nDessert: number
  nEntree: number
  heures: number // heures travaillées (Combo)
  brut: number // brut salarial estimé, avant charges (Combo)
  caRestoMidi: number // CA resto service midi
  cvMidi: number // couverts resto midi
  caRestoSoir: number // CA resto service soir
  cvSoir: number // couverts resto soir
  nPinsa: number // pinsa (catégorie Pinsa, demi/petite = 1)
}

export type MonthlyPivot = {
  years: string[]
  months: number[] // numéros de mois présents (1-12), triés
  cells: Record<string, MonthCell> // clé `${year}-${month}`
}

const mKey = (y: string, m: number) => `${y}-${m}`

const blankMonth = (): MonthCell => ({
  caTotal: 0,
  caResto: 0,
  caBar: 0,
  couverts: 0,
  nTickets: 0,
  openDays: 0,
  nDessert: 0,
  nEntree: 0,
  heures: 0,
  brut: 0,
  caRestoMidi: 0,
  cvMidi: 0,
  caRestoSoir: 0,
  cvSoir: 0,
  nPinsa: 0,
})

export function monthlyPivot(
  tickets: TicketMetric[],
  poire: Record<string, number>,
  labor: LaborRow[],
  pinsaByMonth: Record<string, number>,
  ctrl: DashControls,
): MonthlyPivot {
  const cells: Record<string, MonthCell> = {}
  const ensure = (y: string, m: number) => (cells[mKey(y, m)] ||= blankMonth())

  // Comptage des tickets midi/soir par jour (pour les jours ouverts par mois)
  const dayCount: Record<string, { midi: number; soir: number; ym: string }> = {}

  for (const t of tickets) {
    const y = t.jour.slice(0, 4)
    const m = parseInt(t.jour.slice(5, 7), 10)
    const c = ensure(y, m)
    const v = ticketVal(t, ctrl.base)
    const h = t.heure == null ? ctrl.cutoff : t.heure
    const soir = h >= ctrl.cutoff || h < NIGHT
    c.caTotal += v
    c.nTickets++
    if (t.type === 'resto') {
      c.caResto += v
      c.couverts += t.couverts
      c.nDessert += t.n_dessert
      c.nEntree += t.n_entree
      if (soir) {
        c.caRestoSoir += v
        c.cvSoir += t.couverts
      } else {
        c.caRestoMidi += v
        c.cvMidi += t.couverts
      }
    } else if (t.type === 'bar') {
      c.caBar += v
    }
    const dc = dayCount[t.jour] || (dayCount[t.jour] = { midi: 0, soir: 0, ym: mKey(y, m) })
    if (soir) dc.soir++
    else dc.midi++
  }

  // Poire : ajoutée au bar et au total du mois (si incluse)
  if (incP(ctrl, poire)) {
    for (const d in poire) {
      const y = d.slice(0, 4)
      const m = parseInt(d.slice(5, 7), 10)
      const c = ensure(y, m)
      c.caTotal += poire[d]
      c.caBar += poire[d]
    }
  }

  // Jours ouverts pondérés par mois
  for (const dk in dayCount) {
    const dc = dayCount[dk]
    cells[dc.ym].openDays +=
      (dc.midi >= OPEN_MIN ? W_MIDI : 0) + (dc.soir >= OPEN_MIN ? W_SOIR : 0)
  }

  // Masse salariale (Combo) : heures travaillées + brut estimé par mois
  for (const r of labor) {
    const y = r.periode.slice(0, 4)
    const m = parseInt(r.periode.slice(5, 7), 10)
    const c = ensure(y, m)
    c.heures += r.heures_travaillees || 0
    c.brut += estimateBrut(r)
  }

  // Pinsa par mois (vue ana_v_pinsa_monthly, clé 'YYYY-MM')
  for (const ym in pinsaByMonth) {
    const y = ym.slice(0, 4)
    const m = parseInt(ym.slice(5, 7), 10)
    ensure(y, m).nPinsa += pinsaByMonth[ym] || 0
  }

  const years = [...new Set(Object.keys(cells).map((k) => k.split('-')[0]))].sort()
  const months = [...new Set(Object.keys(cells).map((k) => parseInt(k.split('-')[1], 10)))].sort(
    (a, b) => a - b,
  )
  return { years, months, cells }
}

// ─── Pivot par jour de la semaine (année × jour) ───
// Même principe que monthlyPivot mais regroupé par jour de semaine (1=lundi … 7=dimanche)
// et RESTREINT à la fenêtre de dates (MM-JJ de from→to rejouée sur chaque année).
// Indicateurs issus des tickets uniquement (masse salariale / pinsa sont mensuels
// et ne se ventilent pas par jour de semaine).

export type WeekdayPivot = {
  years: string[]
  weekdays: number[] // présents, triés (1=lundi … 7=dimanche)
  cells: Record<string, MonthCell> // clé `${year}-${weekday}`
}

const weekdayOf = (jour: string) => {
  const d = new Date(jour + 'T00:00:00Z').getUTCDay() // 0=dim … 6=sam
  return d === 0 ? 7 : d // 1=lundi … 7=dimanche
}

export function weekdayPivot(
  tickets: TicketMetric[],
  poire: Record<string, number>,
  ctrl: DashControls,
): WeekdayPivot {
  let mdFrom = ctrl.from.slice(5)
  let mdTo = ctrl.to.slice(5)
  if (mdFrom > mdTo) {
    mdFrom = '01-01'
    mdTo = '12-31'
  }
  const inWin = (jour: string) => {
    const md = jour.slice(5)
    return md >= mdFrom && md <= mdTo
  }

  const cells: Record<string, MonthCell> = {}
  const ensure = (y: string, wd: number) => (cells[`${y}-${wd}`] ||= blankMonth())
  const dayCount: Record<string, { midi: number; soir: number; key: string }> = {}

  for (const t of tickets) {
    if (!inWin(t.jour)) continue
    const y = t.jour.slice(0, 4)
    const wd = weekdayOf(t.jour)
    const c = ensure(y, wd)
    const v = ticketVal(t, ctrl.base)
    const h = t.heure == null ? ctrl.cutoff : t.heure
    const soir = h >= ctrl.cutoff || h < NIGHT
    c.caTotal += v
    c.nTickets++
    if (t.type === 'resto') {
      c.caResto += v
      c.couverts += t.couverts
      c.nDessert += t.n_dessert
      c.nEntree += t.n_entree
      if (soir) {
        c.caRestoSoir += v
        c.cvSoir += t.couverts
      } else {
        c.caRestoMidi += v
        c.cvMidi += t.couverts
      }
    } else if (t.type === 'bar') {
      c.caBar += v
    }
    const dc = dayCount[t.jour] || (dayCount[t.jour] = { midi: 0, soir: 0, key: `${y}-${wd}` })
    if (soir) dc.soir++
    else dc.midi++
  }

  if (incP(ctrl, poire)) {
    for (const d in poire) {
      if (!inWin(d)) continue
      const c = ensure(d.slice(0, 4), weekdayOf(d))
      c.caTotal += poire[d]
      c.caBar += poire[d]
    }
  }

  for (const dk in dayCount) {
    const dc = dayCount[dk]
    cells[dc.key].openDays += (dc.midi >= OPEN_MIN ? W_MIDI : 0) + (dc.soir >= OPEN_MIN ? W_SOIR : 0)
  }

  const years = [...new Set(Object.keys(cells).map((k) => k.split('-')[0]))].sort()
  const weekdays = [...new Set(Object.keys(cells).map((k) => parseInt(k.split('-')[1], 10)))].sort(
    (a, b) => a - b,
  )
  return { years, weekdays, cells }
}
// Pour chaque ticket RESTAURANT (au moins un plat ou une entrée ; bar et
// desserts seuls exclus) avec au moins 1 couvert, on calcule le PANIER = valeur
// du ticket / couverts, et on le range dans une tranche de 5 € (0-5, 5-10, …),
// par année. « Nb tickets » = tickets de la tranche ; « CA » = somme de leur CA ;
// « CA/jour » = CA de la tranche / jours ouverts de l'année.
// La fenêtre calendaire (MM-JJ de from→to) est rejouée sur CHAQUE année (comme la
// comparaison annuelle) afin de garder les années comparables.

const BUCKET_EUR = 5
const NB_BUCKETS = 14 // 0 → 70 € ; l'indice 14 = « 70 €+ »

export type PanierBuckets = {
  years: string[]
  labels: string[]
  countByYear: Record<string, number[]>
  caByYear: Record<string, number[]>
  meanByYear: Record<string, number> // panier moyen = CA / couverts
  totalCountByYear: Record<string, number>
  totalCaByYear: Record<string, number>
  openDaysByYear: Record<string, number> // jours ouverts pondérés (fenêtre, par année)
}

export function panierBuckets(
  tickets: TicketMetric[],
  base: Base,
  from: string,
  to: string,
  cutoff: number,
): PanierBuckets {
  // Fenêtre calendaire (MM-JJ) rejouée sur chaque année
  let mdFrom = from.slice(5)
  let mdTo = to.slice(5)
  if (mdFrom > mdTo) {
    mdFrom = '01-01'
    mdTo = '12-31'
  }
  const inWindow = (jour: string) => {
    const md = jour.slice(5)
    return md >= mdFrom && md <= mdTo
  }
  const sel = tickets.filter((t) => inWindow(t.jour))

  // Jours ouverts pondérés par année (tous types de tickets)
  const dayCount: Record<string, { midi: number; soir: number; y: string }> = {}
  for (const t of sel) {
    const h = t.heure == null ? cutoff : t.heure
    const soir = h >= cutoff || h < NIGHT
    const dc = dayCount[t.jour] || (dayCount[t.jour] = { midi: 0, soir: 0, y: t.jour.slice(0, 4) })
    if (soir) dc.soir++
    else dc.midi++
  }
  const openDaysByYear: Record<string, number> = {}
  for (const d in dayCount) {
    const dc = dayCount[d]
    openDaysByYear[dc.y] =
      (openDaysByYear[dc.y] || 0) + (dc.midi >= OPEN_MIN ? W_MIDI : 0) + (dc.soir >= OPEN_MIN ? W_SOIR : 0)
  }

  const resto = sel.filter((t) => t.type === 'resto' && t.couverts > 0)
  const years = [...new Set(resto.map((t) => t.jour.slice(0, 4)))].sort()
  const countByYear: Record<string, number[]> = {}
  const caByYear: Record<string, number[]> = {}
  const cvByYear: Record<string, number> = {}
  for (const y of years) {
    countByYear[y] = new Array(NB_BUCKETS + 1).fill(0)
    caByYear[y] = new Array(NB_BUCKETS + 1).fill(0)
    cvByYear[y] = 0
  }
  let maxUsed = 0
  for (const t of resto) {
    const y = t.jour.slice(0, 4)
    const v = ticketVal(t, base)
    const panier = v / t.couverts
    let idx = Math.floor(panier / BUCKET_EUR)
    if (idx < 0) idx = 0
    if (idx > NB_BUCKETS) idx = NB_BUCKETS
    countByYear[y][idx]++
    caByYear[y][idx] += v
    cvByYear[y] += t.couverts
    if (idx > maxUsed) maxUsed = idx
  }
  const last = Math.min(maxUsed, NB_BUCKETS)
  const labels: string[] = []
  for (let i = 0; i <= last; i++) {
    labels.push(
      i >= NB_BUCKETS ? `${NB_BUCKETS * BUCKET_EUR} €+` : `${i * BUCKET_EUR} – ${(i + 1) * BUCKET_EUR}`,
    )
  }
  const meanByYear: Record<string, number> = {}
  const totalCountByYear: Record<string, number> = {}
  const totalCaByYear: Record<string, number> = {}
  for (const y of years) {
    const tc = countByYear[y].reduce((a, b) => a + b, 0)
    const tca = caByYear[y].reduce((a, b) => a + b, 0)
    totalCountByYear[y] = tc
    totalCaByYear[y] = tca
    meanByYear[y] = cvByYear[y] ? tca / cvByYear[y] : 0 // panier moyen = CA / couverts
  }
  return {
    years,
    labels,
    countByYear,
    caByYear,
    meanByYear,
    totalCountByYear,
    totalCaByYear,
    openDaysByYear,
  }
}

// ─── Coûts salariaux (export Combo) ───
//
// Estimation enrichie du BRUT mensuel par salarié (règles validées) :
//   taux horaire = salaire_base / heures_contrat_mensuel ;
//   + heures supp hors contrat valorisées (×1,10 / ×1,20 / ×1,50) ;
//   + heures fériés et 1er mai majorées (+100 %) ;
//   + 6ème jour : salaire_base / 6 (« 6 jours payés 7 ») ;
//   PAS de majoration de nuit (convention CHR) ;
//   provision congés payés : +10 % sur l'ensemble.
// C'est une ESTIMATION de gestion, pas un calcul de paie.
// Le détail par composante vit dans lib/labor.ts (source unique de vérité) ;
// estimateBrut n'en est que la somme, conservée pour les appelants existants.

export function estimateBrut(r: LaborRow): number {
  return brutDetail(r).brut
}

// Brut estimé agrégé par mois de paie (clé 'YYYY-MM')
export function laborBrutByMonth(rows: LaborRow[]): Record<string, number> {
  const m: Record<string, number> = {}
  for (const r of rows) {
    const ym = r.periode.slice(0, 7)
    m[ym] = (m[ym] || 0) + estimateBrut(r)
  }
  return m
}

export const hasLabor = (m: Record<string, number>) => Object.keys(m).length > 0

export type LaborResult = {
  brut: number // brut sur la fenêtre (proraté aux jours ouverts)
  charged: number // brut × (1 + taux charges)
  perDay: Record<string, number> // coût chargé réparti par jour (fenêtre)
  hasData: boolean
}

// Répartit le brut mensuel sur les jours ouverts du mois, puis proratise à la
// fenêtre : coût du jour = (brut_mois / jours_ouverts_mois) × poids_du_jour.
export function computeLabor(
  C: ComputeResult,
  monthOpenDays: Record<string, number>,
  brutByMonth: Record<string, number>,
  chargeRate: number,
): LaborResult {
  const perDay: Record<string, number> = {}
  let brut = 0
  let charged = 0
  let hasData = false
  for (const d in C.days) {
    const ym = d.slice(0, 7)
    const monthBrut = brutByMonth[ym]
    if (monthBrut == null) continue
    hasData = true
    const od = monthOpenDays[ym] || 0
    if (od <= 0) continue
    const day = C.days[d]
    const w = (day.midiTk >= OPEN_MIN ? W_MIDI : 0) + (day.soirTk >= OPEN_MIN ? W_SOIR : 0)
    const dayBrut = (monthBrut / od) * w
    const dayCharged = dayBrut * (1 + chargeRate)
    perDay[d] = dayCharged
    brut += dayBrut
    charged += dayCharged
  }
  return { brut, charged, perDay, hasData }
}
