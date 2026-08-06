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

// Coûts salariaux (ana_labor) — 1 salarié × 1 mois, anonymisé
export type LaborRow = {
  periode: string // 'YYYY-MM-DD' (1er du mois)
  employe_hash?: string | null // hash anonyme (rattachement d'un contrat)
  poste: string | null
  contrat: string | null
  salaire_base: number
  heures_contrat_mensuel: number | null
  heures_travaillees: number | null
  jours_travailles: number | null
  h_supp_10: number | null
  h_supp_20: number | null
  h_supp_50: number | null
  h_nuit: number | null
  h_feries: number | null
  h_1er_mai: number | null
  conges_payes_j: number | null
}

// ─── Coûts salariaux : contrats & compléments (zone protégée) ───

export type Contrat = {
  id: string
  nom_affichage: string
  poste: string | null
  contrat: string | null
  employe_hash: string | null
  date_debut: string | null // 'YYYY-MM-DD'
  date_fin: string | null
  heures_hebdo_contrat: number | null
  salaire_brut_mensuel: number | null
  heures_hebdo_cible: number | null
  actif: boolean
}

// Heures mensuelles synchronisées depuis les plannings ComboHR
export type HeuresMois = {
  contrat_id: string
  mois: string // 'YYYY-MM-DD' (1er du mois)
  heures_reelles: number
  heures_planifiees: number
  supp_equiv_reel: number
  supp_equiv_planifie: number
}

export type RemunerationPoire = {
  id: string
  contrat_id: string
  mois: string // 'YYYY-MM-DD' (1er du mois)
  montant: number
}

// Salarié issu de l'import Combo (pour rattacher un contrat)
export type LaborEmploye = {
  employe_hash: string
  nom: string | null
  prenom: string | null
  poste: string | null
  contrat: string | null
  salaire_base: number
}

// État des contrôles du tableau de bord
export type DashControls = {
  from: string
  to: string
  cutoff: number // bascule midi/soir (par défaut 17)
  base: Base
  incPoire: boolean
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

export type LaborUpsertRow = {
  periode: string
  employe_hash: string
  nom: string | null
  prenom: string | null
  poste: string | null
  contrat: string | null
  salaire_base: number
  heures_contrat_mensuel: number | null
  heures_travaillees: number | null
  jours_travailles: number | null
  h_supp_10: number | null
  h_supp_20: number | null
  h_supp_50: number | null
  h_nuit: number | null
  h_feries: number | null
  h_1er_mai: number | null
  conges_payes_j: number | null
  source_file: string
}

export type ImportLogRow = {
  kind: 'ventes' | 'poire' | 'combo'
  file_name: string
  rows_in: number
  tickets_upserted: number | null
  lines_upserted: number | null
  poire_upserted: number | null
  labor_upserted: number | null
}
