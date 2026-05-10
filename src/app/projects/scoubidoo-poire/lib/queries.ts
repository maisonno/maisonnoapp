import { createClient } from '@/lib/supabase/server'
import type { Mouvement, TypeOperation } from './types'

export async function getMouvements(mois?: string): Promise<Mouvement[]> {
  const supabase = await createClient()

  let query = supabase
    .from('scd_compta_poire')
    .select(`
      id, date, type_operation_id, entree, sortie, notes, caisse_id, created_at,
      scd_type_operation ( name )
    `)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })

  if (mois) {
    const [year, month] = mois.split('-')
    const start = `${year}-${month}-01`
    const end = new Date(Number(year), Number(month), 0).toISOString().split('T')[0]
    query = query.gte('date', start).lte('date', end)
  }

  const { data } = await query.limit(200)
  if (!data) return []

  return data.map((row) => ({
    id: row.id,
    date: row.date,
    type_operation_id: row.type_operation_id,
    type_operation_name: (row.scd_type_operation as unknown as { name: string } | null)?.name ?? null,
    entree: row.entree,
    sortie: row.sortie,
    notes: row.notes,
    caisse_id: row.caisse_id,
    created_at: row.created_at,
  }))
}

export async function getSoldeSaison(): Promise<number> {
  const supabase = await createClient()
  const currentYear = new Date().getFullYear()
  const { data } = await supabase
    .from('scd_compta_poire')
    .select('entree, sortie')
    .gte('date', `${currentYear}-01-01`)
    .lte('date', `${currentYear}-12-31`)

  if (!data) return 0
  return data.reduce((acc, row) => acc + (row.entree ?? 0) - (row.sortie ?? 0), 0)
}

export async function getStatsMois(): Promise<{ mois: string; entrees: number; sorties: number }[]> {
  const supabase = await createClient()
  const currentYear = new Date().getFullYear()
  const { data } = await supabase
    .from('scd_compta_poire')
    .select('date, entree, sortie')
    .gte('date', `${currentYear}-01-01`)
    .lte('date', `${currentYear}-12-31`)
    .order('date')

  if (!data) return []

  const map = new Map<string, { entrees: number; sorties: number }>()
  for (const row of data) {
    const mois = row.date.substring(0, 7)
    const existing = map.get(mois) ?? { entrees: 0, sorties: 0 }
    map.set(mois, {
      entrees: existing.entrees + (row.entree ?? 0),
      sorties: existing.sorties + (row.sortie ?? 0),
    })
  }

  return Array.from(map.entries()).map(([mois, stats]) => ({ mois, ...stats }))
}

export async function getTypesOperation(): Promise<TypeOperation[]> {
  const supabase = await createClient()
  const { data } = await supabase.from('scd_type_operation').select('id, name').order('name')
  return data ?? []
}
