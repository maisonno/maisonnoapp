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
  'autre_cb_j_pourboire_incl', 'autre_cb_jplus1_pourboire_incl', 'autre_cb_jplus1_veille_pourboire_incl',
  'autre_pourboire_j', 'autre_pourboire_jplus1', 'autre_pourboire_jplus1_de_la_veille',
  'pourboire_tpe_verse_au_pourboire', 'trop_percu_verse_au_pourboire',
  'paiement_compte_cb', 'paiement_compte_cash', 'ecart_cb', 'ecart_cash',
  'statut', 'created_by', 'updated_by',
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
  amount: number
  tipsAmount: number
  transactionResponseStatus?: boolean | null
  stateId?: number
}

function matchesDate(txDate: string, serviceDate: string): boolean {
  // Accepte "20260512" (YYYYMMDD) et "12/05/2026" (DD/MM/YYYY)
  const compact = serviceDate.replace(/-/g, '')            // "20260512"
  const [y, m, d] = serviceDate.split('-')
  const fr = `${d}/${m}/${y}`                              // "12/05/2026"
  return txDate === compact || txDate === fr
}

function matchesNextDay(txDate: string, serviceDate: string): boolean {
  const next = nextDayYYYYMMDD(serviceDate)               // "20260513"
  const d = new Date(serviceDate + 'T12:00:00Z')
  d.setUTCDate(d.getUTCDate() + 1)
  const [ny, nm, nd2] = d.toISOString().slice(0, 10).split('-')
  const nextFr = `${nd2}/${nm}/${ny}`                      // "13/05/2026"
  return txDate === next || txDate === nextFr
}

type SPImportResult = {
  error?: string
  sp_cb_j_pourboire_incl?: number
  sp_pourboire_j?: number
  sp_cb_jplus1_pourboire_incl?: number
  sp_pourboire_jplus1?: number
  j_count?: number
  jplus1_count?: number
}

function nextDayYYYYMMDD(date: string): string {
  const d = new Date(date + 'T12:00:00Z')
  d.setUTCDate(d.getUTCDate() + 1)
  return d.toISOString().slice(0, 10).replace(/-/g, '')
}

function sumField(txs: SPTransaction[], field: 'amount' | 'tipsAmount'): number {
  return Math.round(txs.reduce((acc, tx) => acc + (tx[field] ?? 0), 0) * 100) / 100
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

  let transactions: SPTransaction[]
  try {
    const txRes = await fetch('https://extranet-api.smileandpay.com/public/api/v1/transactions', {
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    })
    if (!txRes.ok) return { error: `Récupération des transactions échouée (${txRes.status}).` }
    transactions = await txRes.json()
  } catch {
    return { error: 'Erreur lors de la récupération des transactions.' }
  }

  // Pas de filtre sur transactionResponseStatus — peut être absent/null dans la vraie API
  // On inclut toutes les transactions (les remboursements ont des montants négatifs)
  const jTx = transactions.filter((tx) => matchesDate(tx.transactionDate, serviceDate))
  const jPlus1Tx = transactions.filter((tx) => matchesNextDay(tx.transactionDate, serviceDate))

  return {
    sp_cb_j_pourboire_incl: sumField(jTx, 'amount'),
    sp_pourboire_j: sumField(jTx, 'tipsAmount'),
    sp_cb_jplus1_pourboire_incl: sumField(jPlus1Tx, 'amount'),
    sp_pourboire_jplus1: sumField(jPlus1Tx, 'tipsAmount'),
    j_count: jTx.length,
    jplus1_count: jPlus1Tx.length,
  }
}
