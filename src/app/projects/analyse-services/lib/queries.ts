import { createClient } from '@/lib/supabase/server'
import type { PoireDay, TicketMetric } from './types'

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

export type ImportLogEntry = {
  id: number
  kind: string
  file_name: string | null
  rows_in: number | null
  tickets_upserted: number | null
  lines_upserted: number | null
  poire_upserted: number | null
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
