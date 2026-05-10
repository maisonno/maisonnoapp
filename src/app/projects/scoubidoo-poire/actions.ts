'use server'

import { createClient } from '@/lib/supabase/server'
import type { ActionState } from './lib/types'

export async function createMouvement(data: {
  date: string
  type_operation_id: string
  montant: string
  sens: 'entree' | 'sortie'
  notes: string
}): Promise<ActionState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié' }

  const montant = parseFloat(data.montant)
  if (isNaN(montant) || montant <= 0) return { error: 'Montant invalide' }

  const { error } = await supabase.from('scd_compta_poire').insert({
    date: data.date,
    type_operation_id: data.type_operation_id || null,
    entree: data.sens === 'entree' ? montant : null,
    sortie: data.sens === 'sortie' ? montant : null,
    notes: data.notes || null,
    created_by: user.id,
  })

  if (error) return { error: error.message }
  return { success: true }
}

export async function updateMouvement(id: string, data: {
  date: string
  type_operation_id: string
  montant: string
  sens: 'entree' | 'sortie'
  notes: string
}): Promise<ActionState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié' }

  const montant = parseFloat(data.montant)
  if (isNaN(montant) || montant <= 0) return { error: 'Montant invalide' }

  const { error } = await supabase.from('scd_compta_poire').update({
    date: data.date,
    type_operation_id: data.type_operation_id || null,
    entree: data.sens === 'entree' ? montant : null,
    sortie: data.sens === 'sortie' ? montant : null,
    notes: data.notes || null,
  }).eq('id', id)

  if (error) return { error: error.message }
  return { success: true }
}

export async function deleteMouvement(id: string): Promise<ActionState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié' }

  const { error } = await supabase.from('scd_compta_poire').delete().eq('id', id)
  if (error) return { error: error.message }
  return { success: true }
}
