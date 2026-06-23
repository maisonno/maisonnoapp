// Types locaux du projet « Analyse des services »

export type Base = 'ttc' | 'ht'
export type TicketType = 'resto' | 'dessert' | 'bar'

// Une ligne de la vue ana_v_ticket_metrics (1 ticket enrichi)
export type TicketMetric = {
  ticket_id: string
  jour: string // 'YYYY-MM-DD'
  heure: number | null
  couverts: number
  type: TicketType
  ht: number
  ttc: number
  n_entree: number
  n_plat: number
  n_dessert: number
  n_boisson: number
  n_plat_offert: number
  ttc_entree: number
  ttc_plat: number
  ttc_dessert: number
  ttc_boisson: number
  ttc_autre: number
  ht_entree: number
  ht_plat: number
  ht_dessert: number
  ht_boisson: number
  ht_autre: number
}

// Poire agrégée au jour (ana_poire_daily)
export type PoireDay = {
  jour: string
  montant_ttc: number
}

// État des contrôles du tableau de bord
export type DashControls = {
  from: string
  to: string
  cutoff: number // bascule midi/soir (par défaut 17)
  base: Base
  incPoire: boolean
  tvaPoire: number // 0.10 par défaut
}

// ─── Lignes prêtes à upsert (import) ───

export type TicketUpsertRow = {
  ticket_id: string
  jour: string
  heure: number | null
  couverts: number
  total_ttc: number | null
  total_ht: number | null
  tag_split: string | null
  etablissement: string | null
  source_file: string
}

export type LineUpsertRow = {
  line_id: string
  ticket_id: string
  jour: string
  nom: string | null
  qte: number
  prix_ht: number
  taux: number
  categorie: string | null
  type_produit: string | null
  offert: boolean
  offerts_ht: number
  source_file: string
}

export type PoireUpsertRow = {
  jour: string
  montant_ttc: number
  tag: string | null
  source_file: string
}

export type ImportLogRow = {
  kind: 'ventes' | 'poire'
  file_name: string
  rows_in: number
  tickets_upserted: number | null
  lines_upserted: number | null
  poire_upserted: number | null
}
