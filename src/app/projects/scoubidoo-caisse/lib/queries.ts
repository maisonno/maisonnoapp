import { createClient } from '@/lib/supabase/server'
import type { CaisseWithCalc, Tag, VeilleData } from './types'

export async function getCaisseList(limit = 60): Promise<CaisseWithCalc[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('scd_v_caisse_calc')
    .select('*')
    .order('date', { ascending: false })
    .limit(limit)

  if (error) throw new Error(error.message)
  return (data ?? []) as CaisseWithCalc[]
}

export async function getCaisseById(id: string): Promise<CaisseWithCalc | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('scd_v_caisse_calc')
    .select('*')
    .eq('id', id)
    .single()

  if (error) return null
  return data as CaisseWithCalc
}

export async function getTags(): Promise<Tag[]> {
  const supabase = await createClient()
  const { data } = await supabase.from('scd_tag').select('*').order('name')
  return (data ?? []) as Tag[]
}

export async function getVeilleData(today: string): Promise<VeilleData | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('scd_caisse')
    .select('sp_cb_jplus1_pourboire_incl, sp_pourboire_jplus1, payplus_jplus1, autre_cb_jplus1_pourboire_incl, autre_pourboire_jplus1')
    .lt('date', today)
    .order('date', { ascending: false })
    .limit(1)
    .single()

  if (!data) return null
  return data as VeilleData
}
