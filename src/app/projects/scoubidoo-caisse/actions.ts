'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { ActionState } from './lib/types'

export async function upsertCaisse(
  id: string | null,
  data: Record<string, unknown>,
): Promise<ActionState & { id?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié.' }

  const payload = {
    ...data,
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
  transactionDate: string   // "YYYYMMDD"
  amount: number
  tipsAmount: number
  transactionResponseStatus: boolean
}

type SPImportResult = {
  error?: string
  sp_cb_j_pourboire_incl?: number
  sp_pourboire_j?: number
  sp_cb_jplus1_pourboire_incl?: number
  sp_pourboire_jplus1?: number
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

  const accepted = transactions.filter((tx) => tx.transactionResponseStatus === true)
  const jDate = serviceDate.replace(/-/g, '')
  const jPlus1Date = nextDayYYYYMMDD(serviceDate)

  const jTx = accepted.filter((tx) => tx.transactionDate === jDate)
  const jPlus1Tx = accepted.filter((tx) => tx.transactionDate === jPlus1Date)

  return {
    sp_cb_j_pourboire_incl: sumField(jTx, 'amount'),
    sp_pourboire_j: sumField(jTx, 'tipsAmount'),
    sp_cb_jplus1_pourboire_incl: sumField(jPlus1Tx, 'amount'),
    sp_pourboire_jplus1: sumField(jPlus1Tx, 'tipsAmount'),
  }
}
