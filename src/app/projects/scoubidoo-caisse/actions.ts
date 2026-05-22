'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { ActionState } from './lib/types'

// Colonnes valides de scd_caisse — filtre les champs fantômes de localStorage
const VALID_CAISSE_COLUMNS = new Set([
  'date', 'notes', 'tag_id', 'ne_pas_compter',
  'billets_500', 'billets_200', 'billets_100', 'billets_50', 'billets_20', 'billets_10', 'billets_5',
  'pieces_2', 'pieces_1', 'pieces_50c', 'pieces_20c', 'pieces_10c',
  'poids_pieces_2', 'poids_pieces_1', 'poids_pieces_50c', 'poids_pieces_20c', 'poids_pieces_10c',
  'fond_caisse_matin', 'fond_caisse_soir', 'mis_au_coffre', 'poire', 'ajout_monnaie', 'mouvement_monnaie',
  'total_service_ht', 'total_service_ttc',
  'reglement_cb_du_service_v1', 'reglement_service_total', 'reglement_service_cash',
  'reglement_service_cash_v2', 'reglement_service_cb_v2', 'reglement_service_payplus',
  'reglement_service_compte_client', 'reglement_service_trop_percu_cb',
  'reglement_service_pay_at_table', 'reglement_autres_cheque',
  'reglement_differe_cb', 'reglement_differe_cash',
  'payplus_rapport_x', 'payplus_ventes_service', 'payplus_jplus1', 'payplus_jplus1_de_la_veille',
  'payplus_cumul_pourboire', 'payplus_pourboire_service',
  'sp_cb_j_pourboire_incl', 'sp_cb_jplus1_pourboire_incl', 'sp_cb_jplus1_veille_pourboire_incl',
  'sp_pourboire_j', 'sp_pourboire_jplus1', 'sp_pourboire_jplus1_de_la_veille',
  'sp_transactions_json',
  'autre_cb_j_pourboire_incl', 'autre_cb_jplus1_pourboire_incl', 'autre_cb_jplus1_veille_pourboire_incl',
  'autre_pourboire_j', 'autre_pourboire_jplus1', 'autre_pourboire_jplus1_de_la_veille',
  'pourboire_tpe_verse_au_pourboire', 'trop_percu_verse_au_pourboire',
  'paiement_compte_cb', 'paiement_compte_cash', 'ecart_cb', 'ecart_cash',
  'statut', 'created_by', 'updated_by',
  'fond_billets_500', 'fond_billets_200', 'fond_billets_100', 'fond_billets_50',
  'fond_billets_20', 'fond_billets_10', 'fond_billets_5',
  'fond_pieces_2', 'fond_pieces_1', 'fond_pieces_50c', 'fond_pieces_20c', 'fond_pieces_10c',
])

export async function upsertCaisse(
  id: string | null,
  data: Record<string, unknown>,
): Promise<ActionState & { id?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié.' }

  const filtered = Object.fromEntries(
    Object.entries(data).filter(([k]) => VALID_CAISSE_COLUMNS.has(k))
  )

  const payload = {
    ...filtered,
    tag_id: data.tag_id === '' ? null : data.tag_id,
    updated_by: user.id,
    ...(id ? {} : { created_by: user.id }),
  }

  if (id) {
    const { error } = await supabase
      .from('scd_caisse')
      .update(payload)
      .eq('id', id)
    if (error) return { error: error.message }
    revalidatePath('/projects/scoubidoo-caisse')
    return { success: 'Service mis à jour.', id }
  } else {
    const { data: inserted, error } = await supabase
      .from('scd_caisse')
      .insert(payload)
      .select('id')
      .single()
    if (error) return { error: error.message }
    revalidatePath('/projects/scoubidoo-caisse')
    return { success: 'Service créé.', id: inserted.id }
  }
}

export async function fermerCaisse(id: string): Promise<ActionState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié.' }

  const { error } = await supabase
    .from('scd_caisse')
    .update({ statut: 'fermee', updated_by: user.id })
    .eq('id', id)

  if (error) return { error: error.message }
  revalidatePath('/projects/scoubidoo-caisse')
  return { success: 'Caisse fermée.' }
}

export async function deleteCaisse(id: string): Promise<ActionState> {
  const supabase = await createClient()
  const { error } = await supabase.from('scd_caisse').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/projects/scoubidoo-caisse')
  return { success: 'Service supprimé.' }
}

type SPTransaction = {
  transactionDate: string   // "YYYYMMDD" ou "DD/MM/YYYY" selon l'API
  transactionTime?: string  // "HHMMSS"
  amount: number
  tipsAmount: number
  cardBrand?: string
  transactionResponseStatus?: boolean | null
  stateId?: number
}

export type ImportedTransaction = {
  ref: string
  date: string
  time: string     // HHMMSS
  amount: number
  tipsAmount: number
  cardBrand: string
  period: 'J_AM' | 'J' | 'J1_AM'
}

type SPImportResult = {
  error?: string
  sp_cb_j_pourboire_incl?: number
  sp_pourboire_j?: number
  sp_cb_jplus1_pourboire_incl?: number
  sp_pourboire_jplus1?: number
  j_count?: number
  jplus1_count?: number
  j_am_amount?: number
  j_am_pourboire?: number
  transactions?: ImportedTransaction[]
}

function nextDayYYYYMMDD(date: string): string {
  const d = new Date(date + 'T12:00:00Z')
  d.setUTCDate(d.getUTCDate() + 1)
  return d.toISOString().slice(0, 10).replace(/-/g, '')
}

function nextDayFR(date: string): string {
  const d = new Date(date + 'T12:00:00Z')
  d.setUTCDate(d.getUTCDate() + 1)
  const [ny, nm, nd2] = d.toISOString().slice(0, 10).split('-')
  return `${nd2}/${nm}/${ny}`
}

function serviceDateCompact(date: string): string {
  return date.replace(/-/g, '')
}

function serviceDateFR(date: string): string {
  const [y, m, d] = date.split('-')
  return `${d}/${m}/${y}`
}

function isEarlyMorning(time: string): boolean {
  // time is HHMMSS — 00:00–04:59 counts as "AM" (< 5)
  return parseInt(time.slice(0, 2), 10) < 5
}

function assignPeriod(
  tx: SPTransaction,
  jCompact: string,
  jFR: string,
  nextDayCompact: string,
  nextDayFrStr: string,
): 'J_AM' | 'J' | 'J1_AM' | null {
  const txDate = tx.transactionDate
  const time = tx.transactionTime ?? '120000'

  if (txDate === jCompact || txDate === jFR) {
    return isEarlyMorning(time) ? 'J_AM' : 'J'
  }
  if (txDate === nextDayCompact || txDate === nextDayFrStr) {
    return isEarlyMorning(time) ? 'J1_AM' : null
  }
  return null
}

function sumByPeriods(txs: Array<{ amount: number; tipsAmount: number; period: 'J_AM' | 'J' | 'J1_AM' }>, periods: Array<'J_AM' | 'J' | 'J1_AM'>, field: 'amount' | 'tipsAmount'): number {
  return Math.round(
    txs.filter(tx => periods.includes(tx.period))
      .reduce((acc, tx) => acc + (tx[field] ?? 0), 0) * 100
  ) / 100
}

export async function importSmileAndPay(serviceDate: string): Promise<SPImportResult> {
  const user = process.env.SMILEANDPAY_USER
  const password = process.env.SMILEANDPAY_PASSWORD
  if (!user || !password) {
    return { error: 'Identifiants Smile & Pay non configurés (SMILEANDPAY_USER / SMILEANDPAY_PASSWORD).' }
  }

  let token: string
  try {
    const authRes = await fetch('https://extranet-api.smileandpay.com/public/api/v1/authentication/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user, password }),
    })
    if (!authRes.ok) return { error: `Authentification Smile & Pay échouée (${authRes.status}).` }
    const body = await authRes.json()
    token = body.token ?? body.access_token ?? body.jwt
    if (!token) return { error: 'Token introuvable dans la réponse d\'authentification.' }
  } catch {
    return { error: 'Impossible de joindre l\'API Smile & Pay.' }
  }

  // Compute dates before the API call so we can pass them as filters
  const jCompact = serviceDateCompact(serviceDate)
  const jFR = serviceDateFR(serviceDate)
  const nextCompact = nextDayYYYYMMDD(serviceDate)
  const nextFR = nextDayFR(serviceDate)

  let rawTransactions: SPTransaction[]
  try {
    // Request transactions for J and J+1 explicitly so that re-importing a past service
    // (or importing after midnight) picks up J+1 00h–5h transactions correctly.
    const url = new URL('https://extranet-api.smileandpay.com/public/api/v1/transactions')
    url.searchParams.set('startDate', jCompact)
    url.searchParams.set('endDate', nextCompact)
    const txRes = await fetch(url.toString(), {
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    })
    if (!txRes.ok) return { error: `Récupération des transactions échouée (${txRes.status}).` }
    rawTransactions = await txRes.json()
  } catch {
    return { error: 'Erreur lors de la récupération des transactions.' }
  }

  // Assign period to each transaction, filter out irrelevant ones
  const categorized: Array<ImportedTransaction & { sortKey: string }> = []

  rawTransactions.forEach((tx, idx) => {
    const period = assignPeriod(tx, jCompact, jFR, nextCompact, nextFR)
    if (period === null) return
    categorized.push({
      ref: String(idx),
      date: tx.transactionDate,
      time: tx.transactionTime ?? '000000',
      amount: tx.amount ?? 0,
      tipsAmount: tx.tipsAmount ?? 0,
      cardBrand: tx.cardBrand ?? '',
      period,
      sortKey: tx.transactionDate + (tx.transactionTime ?? '000000'),
    })
  })

  // Sort descending by date+time
  categorized.sort((a, b) => b.sortKey.localeCompare(a.sortKey))

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const transactions: ImportedTransaction[] = categorized.map(({ sortKey: _sortKey, ...rest }) => rest)

  return {
    sp_cb_j_pourboire_incl: sumByPeriods(transactions, ['J', 'J_AM'], 'amount'),
    sp_pourboire_j: sumByPeriods(transactions, ['J', 'J_AM'], 'tipsAmount'),
    sp_cb_jplus1_pourboire_incl: sumByPeriods(transactions, ['J1_AM'], 'amount'),
    sp_pourboire_jplus1: sumByPeriods(transactions, ['J1_AM'], 'tipsAmount'),
    j_count: transactions.filter(tx => tx.period === 'J' || tx.period === 'J_AM').length,
    jplus1_count: transactions.filter(tx => tx.period === 'J1_AM').length,
    j_am_amount: sumByPeriods(transactions, ['J_AM'], 'amount'),
    j_am_pourboire: sumByPeriods(transactions, ['J_AM'], 'tipsAmount'),
    transactions,
  }
}
