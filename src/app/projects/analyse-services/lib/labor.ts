// Coûts salariaux : décomposition du brut, réalisé (import Combo) et
// prévisionnel (contrats + heures cible). Fonctions pures, testables.
//
// ⚠️ Conventions validées (cf. docs/overview.md) :
//  - taux horaire = salaire de base / heures contrat mensuel ;
//  - heures supp hors contrat valorisées ×1,10 / ×1,20 / ×1,50 ;
//  - heures fériés et 1er mai majorées (+100 %) ;
//  - 6ème jour : salaire de base / 6 (« 6 jours payés 7 ») ;
//  - PAS de majoration de nuit (convention CHR) ;
//  - provision congés payés : +10 % sur l'ensemble ;
//  - complément « Poire » : cash, NON soumis aux charges → ajouté après charges.

import type { Contrat, HeuresMois, LaborRow, RemunerationPoire } from './types'

export const CP_RATE = 0.1 // provision congés payés
export const SIXTH_DAY = 1 / 6 // « 6 jours payés 7 »
const WEEKS_PER_MONTH = 52 / 12

// Décomposition du brut d'un salarié sur un mois
export type BrutDetail = {
  base: number // salaire de base
  supp: number // majoration heures supp hors contrat
  ferie: number // fériés + 1er mai
  sixieme: number // 6ème jour payé
  cp: number // provision congés payés
  brut: number // total brut
}

const blankDetail = (): BrutDetail => ({ base: 0, supp: 0, ferie: 0, sixieme: 0, cp: 0, brut: 0 })

export function addDetail(a: BrutDetail, b: BrutDetail): BrutDetail {
  return {
    base: a.base + b.base,
    supp: a.supp + b.supp,
    ferie: a.ferie + b.ferie,
    sixieme: a.sixieme + b.sixieme,
    cp: a.cp + b.cp,
    brut: a.brut + b.brut,
  }
}

// Réalisé : décomposition à partir d'une ligne importée de Combo
export function brutDetail(r: LaborRow): BrutDetail {
  const base = r.salaire_base || 0
  const h = r.heures_contrat_mensuel || 0
  const hr = h > 0 ? base / h : 0
  const supp = hr * ((r.h_supp_10 || 0) * 1.1 + (r.h_supp_20 || 0) * 1.2 + (r.h_supp_50 || 0) * 1.5)
  const ferie = hr * ((r.h_feries || 0) + (r.h_1er_mai || 0)) * 1.0
  const sixieme = base * SIXTH_DAY
  const sousTotal = base + supp + ferie + sixieme
  const cp = sousTotal * CP_RATE
  return { base, supp, ferie, sixieme, cp, brut: sousTotal + cp }
}

// ─── Prévisionnel (contrats + heures hebdo cible) ───

// Heures « payées » (majoration incluse) entre deux volumes hebdo, barème CHR :
// jusqu'à 39 h → ×1,10 · 39-43 h → ×1,20 · au-delà → ×1,50
export function majoredHours(fromH: number, toH: number): number {
  if (toH <= fromH) return 0
  const segments: [number, number, number][] = [
    [0, 39, 1.1],
    [39, 43, 1.2],
    [43, Infinity, 1.5],
  ]
  let acc = 0
  for (const [a, b, f] of segments) {
    const lo = Math.max(fromH, a)
    const hi = Math.min(toH, b)
    if (hi > lo) acc += (hi - lo) * f
  }
  return acc
}

const daysInMonth = (ym: string) => {
  const [y, m] = ym.split('-').map(Number)
  return new Date(Date.UTC(y, m, 0)).getUTCDate()
}

function isoToUtc(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number)
  return Date.UTC(y, m - 1, d)
}

// Part du mois couverte par le contrat (0 → 1)
export function activeFraction(c: Contrat, ym: string): number {
  const [y, m] = ym.split('-').map(Number)
  const nb = daysInMonth(ym)
  const first = Date.UTC(y, m - 1, 1)
  const last = Date.UTC(y, m - 1, nb)
  const debut = c.date_debut ? Math.max(isoToUtc(c.date_debut), first) : first
  const fin = c.date_fin ? Math.min(isoToUtc(c.date_fin), last) : last
  if (fin < debut) return 0
  const joursCouverts = (fin - debut) / 86400000 + 1 // bornes incluses
  return joursCouverts / nb
}

// Prévisionnel d'un contrat pour un mois : base au prorata + heures au-delà du
// contrat majorées, + 6ème jour + CP.
export function prevDetail(c: Contrat, ym: string): BrutDetail {
  const frac = activeFraction(c, ym)
  if (frac <= 0) return blankDetail()
  const salaire = c.salaire_brut_mensuel || 0
  const hContrat = c.heures_hebdo_contrat || 0
  const hCible = c.heures_hebdo_cible ?? hContrat
  if (!salaire && !hContrat) return blankDetail()

  const base = salaire * frac
  const hMensuelContrat = hContrat * WEEKS_PER_MONTH
  const hr = hMensuelContrat > 0 ? salaire / hMensuelContrat : 0
  // heures hebdo au-delà du contrat, valorisées au barème, ramenées au mois
  const supp = hr * majoredHours(hContrat, hCible) * WEEKS_PER_MONTH * frac
  const sixieme = base * SIXTH_DAY
  const sousTotal = base + supp + sixieme
  const cp = sousTotal * CP_RATE
  return { base, supp, ferie: 0, sixieme, cp, brut: sousTotal + cp }
}

// Heures mensuelles cible d'un contrat (prévisionnel)
export function prevHeures(c: Contrat, ym: string): number {
  const frac = activeFraction(c, ym)
  if (frac <= 0) return 0
  const hCible = c.heures_hebdo_cible ?? c.heures_hebdo_contrat ?? 0
  return hCible * WEEKS_PER_MONTH * frac
}

// ─── Calcul depuis les données ComboHR synchronisées (contrats + plannings) ───
// Source privilégiée dès qu'un mois a des heures synchronisées : elle couvre à
// la fois le réalisé (pointages) et le prévisionnel (planning).

export function detailFromHeures(
  c: Contrat,
  ym: string,
  heuresSupp: number, // supp_equiv (réel ou planifié)
): BrutDetail {
  const frac = activeFraction(c, ym)
  if (frac <= 0) return blankDetail()
  const salaire = c.salaire_brut_mensuel || 0
  const hContrat = c.heures_hebdo_contrat || 0
  const base = salaire * frac
  const hMensuelContrat = hContrat * WEEKS_PER_MONTH
  const hr = hMensuelContrat > 0 ? salaire / hMensuelContrat : 0
  const supp = hr * heuresSupp
  const sixieme = base * SIXTH_DAY
  const sousTotal = base + supp + sixieme
  const cp = sousTotal * CP_RATE
  return { base, supp, ferie: 0, sixieme, cp, brut: sousTotal + cp }
}

export type ComboAgg = {
  brut: Record<string, BrutDetail>
  heures: Record<string, number>
  months: Set<string>
}

// Agrège par mois à partir des contrats et des heures synchronisées.
// `mode` : 'reel' (pointages) ou 'planifie' (planning prévu).
export function aggregateFromCombo(
  contrats: Contrat[],
  heures: HeuresMois[],
  mode: 'reel' | 'planifie',
): ComboAgg {
  const byContrat = new Map<string, Contrat>()
  for (const c of contrats) byContrat.set(c.id, c)

  const brut: Record<string, BrutDetail> = {}
  const hrs: Record<string, number> = {}
  const months = new Set<string>()

  for (const h of heures) {
    const c = byContrat.get(h.contrat_id)
    if (!c) continue
    const ym = ymOf(h.mois)
    const nb = mode === 'reel' ? h.heures_reelles : h.heures_planifiees
    const supp = mode === 'reel' ? h.supp_equiv_reel : h.supp_equiv_planifie
    if (!nb && !supp) continue
    months.add(ym)
    brut[ym] = addDetail(brut[ym] || blankDetail(), detailFromHeures(c, ym, supp || 0))
    hrs[ym] = (hrs[ym] || 0) + (nb || 0)
  }
  return { brut, heures: hrs, months }
}

// ─── Agrégats par mois ───

export const ymOf = (iso: string) => iso.slice(0, 7)

export function realiseByMonth(labor: LaborRow[]): Record<string, BrutDetail> {
  const out: Record<string, BrutDetail> = {}
  for (const r of labor) {
    const ym = ymOf(r.periode)
    out[ym] = addDetail(out[ym] || blankDetail(), brutDetail(r))
  }
  return out
}

export function heuresRealiseesByMonth(labor: LaborRow[]): Record<string, number> {
  const out: Record<string, number> = {}
  for (const r of labor) {
    const ym = ymOf(r.periode)
    out[ym] = (out[ym] || 0) + (r.heures_travaillees || 0)
  }
  return out
}

export function prevByMonth(contrats: Contrat[], months: string[]): Record<string, BrutDetail> {
  const out: Record<string, BrutDetail> = {}
  for (const ym of months) {
    let acc = blankDetail()
    for (const c of contrats) {
      if (!c.actif) continue
      acc = addDetail(acc, prevDetail(c, ym))
    }
    out[ym] = acc
  }
  return out
}

export function prevHeuresByMonth(contrats: Contrat[], months: string[]): Record<string, number> {
  const out: Record<string, number> = {}
  for (const ym of months) {
    let h = 0
    for (const c of contrats) {
      if (!c.actif) continue
      h += prevHeures(c, ym)
    }
    out[ym] = h
  }
  return out
}

// Complément Poire par mois (cash, hors charges)
export function poireByMonth(rows: RemunerationPoire[]): Record<string, number> {
  const out: Record<string, number> = {}
  for (const r of rows) {
    const ym = ymOf(r.mois)
    out[ym] = (out[ym] || 0) + (r.montant || 0)
  }
  return out
}

// Coût global d'un mois : brut chargé + complément Poire (non chargé)
export function coutGlobal(brut: number, tauxCharges: number, poire = 0): number {
  return brut * (1 + tauxCharges) + poire
}

// Liste des mois 'YYYY-MM' d'une année
export function monthsOfYear(year: string): string[] {
  return Array.from({ length: 12 }, (_, i) => `${year}-${String(i + 1).padStart(2, '0')}`)
}

export const MONTH_LABELS_SHORT = [
  'janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin',
  'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.',
]

export const labelOfYm = (ym: string) => {
  const m = parseInt(ym.slice(5, 7), 10)
  return `${MONTH_LABELS_SHORT[m - 1]} ${ym.slice(0, 4)}`
}
