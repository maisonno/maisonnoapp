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
