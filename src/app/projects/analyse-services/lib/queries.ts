import { createClient } from '@/lib/supabase/server'
import type {
  Contrat,
  HeuresMois,
  LaborEmploye,
  LaborRow,
  PoireDay,
  RemunerationPoire,
  TicketMetric,
} from './types'

const PAGE = 1000 // PostgREST limite à 1000 lignes/requête → pagination

const METRIC_COLS =
  'ticket_id,jour,heure,couverts,type,ht,ttc,' +
  'n_entree,n_plat,n_dessert,n_boisson,n_plat_offert,' +
  'ttc_entree,ttc_plat,ttc_dessert,ttc_boisson,ttc_autre,' +
  'ht_entree,ht_plat,ht_dessert,ht_boisson,ht_autre'

// Charge toutes les lignes de la vue (1 par ticket, ~23k max) par pages.
// Volume faible → tout en mémoire client pour un calcul instantané (cf. SPEC §7 option A).
export async function getAllTicketMetrics(): Promise<TicketMetric[]> {
  const supabase = await createClient()
  const all: TicketMetric[] = []
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from('ana_v_ticket_metrics')
      .select(METRIC_COLS)
      .order('jour', { ascending: true })
      .range(from, from + PAGE - 1)
    if (error) {
      console.error('[ana] getAllTicketMetrics error:', error.code, error.message)
      break
    }
    if (!data || data.length === 0) break
    all.push(...(data as unknown as TicketMetric[]))
    if (data.length < PAGE) break
  }
  return all
}

export async function getAllPoire(): Promise<PoireDay[]> {
  const supabase = await createClient()
  const all: PoireDay[] = []
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from('ana_poire_daily')
      .select('jour,montant_ttc')
      .order('jour', { ascending: true })
      .range(from, from + PAGE - 1)
    if (error) {
      console.error('[ana] getAllPoire error:', error.code, error.message)
      break
    }
    if (!data || data.length === 0) break
    all.push(...(data as unknown as PoireDay[]))
    if (data.length < PAGE) break
  }
  return all
}

export async function getAllLabor(): Promise<LaborRow[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('ana_labor')
    .select(
      'periode,employe_hash,poste,contrat,salaire_base,heures_contrat_mensuel,heures_travaillees,' +
        'jours_travailles,h_supp_10,h_supp_20,h_supp_50,h_nuit,h_feries,h_1er_mai,conges_payes_j',
    )
    .order('periode', { ascending: true })
  if (error) {
    console.error('[ana] getAllLabor error:', error.code, error.message)
    return []
  }
  return (data as unknown as LaborRow[]) ?? []
}

// ─── Coûts salariaux : contrats, compléments, paramètres ───

export async function getContrats(): Promise<Contrat[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('ana_contrats')
    .select(
      'id,nom_affichage,poste,contrat,employe_hash,combo_contract_id,date_debut,date_fin,' +
        'heures_hebdo_contrat,salaire_brut_mensuel,heures_hebdo_cible,actif',
    )
    .order('nom_affichage', { ascending: true })
  if (error) {
    console.error('[ana] getContrats error:', error.code, error.message)
    return []
  }
  return (data as unknown as Contrat[]) ?? []
}

export async function getHeuresMois(): Promise<HeuresMois[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('ana_heures_mois')
    .select(
      'contrat_id,mois,heures_reelles,heures_planifiees,heures_projetees,' +
        'supp_equiv_reel,supp_equiv_planifie,supp_equiv_projete',
    )
    .order('mois', { ascending: true })
  if (error) {
    console.error('[ana] getHeuresMois error:', error.code, error.message)
    return []
  }
  return (data as unknown as HeuresMois[]) ?? []
}

// Semaines ayant un planning ComboHR, sous forme `${contrat_id}|${lundi}`
export async function getSemainesPlanifiees(): Promise<Set<string>> {
  const supabase = await createClient()
  const { data, error } = await supabase.from('ana_semaines_planifiees').select('contrat_id,semaine')
  if (error) {
    console.error('[ana] getSemainesPlanifiees error:', error.code, error.message)
    return new Set()
  }
  const out = new Set<string>()
  for (const r of (data as { contrat_id: string; semaine: string }[]) ?? []) {
    out.add(`${r.contrat_id}|${r.semaine.slice(0, 10)}`)
  }
  return out
}

export async function getRemunerationPoire(): Promise<RemunerationPoire[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('ana_remuneration_poire')
    .select('id,contrat_id,mois,montant')
    .order('mois', { ascending: true })
  if (error) {
    console.error('[ana] getRemunerationPoire error:', error.code, error.message)
    return []
  }
  return (data as unknown as RemunerationPoire[]) ?? []
}

export async function getParam(cle: string, defaut: number): Promise<number> {
  const supabase = await createClient()
  const { data, error } = await supabase.from('ana_params').select('valeur').eq('cle', cle).maybeSingle()
  if (error) {
    console.error('[ana] getParam error:', error.code, error.message)
    return defaut
  }
  const v = (data as { valeur: number } | null)?.valeur
  return v == null ? defaut : Number(v)
}

// Salariés anonymes présents dans l'import Combo (pour rattacher un contrat)
export async function getLaborEmployes(): Promise<LaborEmploye[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('ana_labor')
    .select('employe_hash,nom,prenom,poste,contrat,salaire_base')
    .order('periode', { ascending: false })
  if (error) {
    console.error('[ana] getLaborEmployes error:', error.code, error.message)
    return []
  }
  const seen = new Map<string, LaborEmploye>()
  for (const r of (data as unknown as LaborEmploye[]) ?? []) {
    if (!seen.has(r.employe_hash)) seen.set(r.employe_hash, r)
  }
  return [...seen.values()]
}

export async function getPinsaMonthly(): Promise<Record<string, number>> {
  const supabase = await createClient()
  const { data, error } = await supabase.from('ana_v_pinsa_monthly').select('ym,n_pinsa')
  if (error) {
    console.error('[ana] getPinsaMonthly error:', error.code, error.message)
    return {}
  }
  const m: Record<string, number> = {}
  for (const r of (data as unknown as { ym: string; n_pinsa: number }[]) ?? []) {
    m[r.ym] = Number(r.n_pinsa) || 0
  }
  return m
}

export type ImportLogEntry = {
  id: number
  kind: string
  file_name: string | null
  rows_in: number | null
  tickets_upserted: number | null
  lines_upserted: number | null
  poire_upserted: number | null
  labor_upserted: number | null
  created_at: string
}

export async function getImportLog(limit = 20): Promise<ImportLogEntry[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('ana_import_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) {
    console.error('[ana] getImportLog error:', error.code, error.message)
    return []
  }
  return (data as ImportLogEntry[]) ?? []
}
