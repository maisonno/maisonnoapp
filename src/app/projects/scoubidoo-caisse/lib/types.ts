export type ActionState = { error?: string; success?: string } | null

export type CaisseStatut = 'brouillon' | 'fermee'

export type CaisseFields = {
  // B. Espèces
  billets_500?: number | null
  billets_200?: number | null
  billets_100?: number | null
  billets_50?: number | null
  billets_20?: number | null
  billets_10?: number | null
  billets_5?: number | null
  pieces_2?: number | null
  pieces_1?: number | null
  pieces_50c?: number | null
  pieces_20c?: number | null
  pieces_10c?: number | null
  // C. Poids
  poids_pieces_2?: number | null
  poids_pieces_1?: number | null
  poids_pieces_50c?: number | null
  poids_pieces_20c?: number | null
  poids_pieces_10c?: number | null
  // D. Fond & coffre
  fond_caisse_matin?: number | null
  fond_caisse_soir?: number | null
  mis_au_coffre?: number | null
  poire?: number | null
  ajout_monnaie?: number | null
  mouvement_monnaie?: number | null
  // E. L'Addition
  total_service_ht?: number | null
  reglement_cb_du_service_v1?: number | null
  reglement_service_total?: number | null
  reglement_service_cash?: number | null
  reglement_service_cb_v2?: number | null
  reglement_service_payplus?: number | null
  reglement_service_compte_client?: number | null
  reglement_service_trop_percu_cb?: number | null
  reglement_service_pay_at_table?: number | null
  reglement_autres_cheque?: number | null
  // F. Pay+
  payplus_rapport_x?: number | null
  payplus_ventes_service?: number | null
  payplus_jplus1?: number | null
  payplus_jplus1_de_la_veille?: number | null
  payplus_cumul_pourboire?: number | null
  payplus_pourboire_service?: number | null
  // G. Smile & Pay
  sp_cb_j_pourboire_incl?: number | null
  sp_cb_jplus1_pourboire_incl?: number | null
  sp_cb_jplus1_veille_pourboire_incl?: number | null
  sp_pourboire_j?: number | null
  sp_pourboire_jplus1?: number | null
  sp_pourboire_jplus1_de_la_veille?: number | null
  // H. Pourboires versés
  pourboire_tpe_verse_au_pourboire?: number | null
  trop_percu_verse_au_pourboire?: number | null
  // I. Comptes clients
  paiement_compte_cb?: number | null
  paiement_compte_cash?: number | null
  ecart_cb?: number | null
  ecart_cash?: number | null
}

export type Caisse = CaisseFields & {
  id: string
  date: string
  notes: string | null
  tag_id: string | null
  ne_pas_compter: boolean
  statut: CaisseStatut
  created_by: string | null
  updated_by: string | null
  created_at: string
  updated_at: string
}

export type CaisseWithCalc = Caisse & {
  tag_name: string | null
  // Calculés
  total_caisse_soir: number
  nb_pieces_2_poids: number
  nb_pieces_1_poids: number
  nb_pieces_50c_poids: number
  nb_pieces_20c_poids: number
  nb_pieces_10c_poids: number
  payplus_encaissements: number
  payplus_pourboire: number
  sp_pourboire_service: number
  sp_cb_service: number
  trop_percu: number
  total_encaissements_ls: number
  mois_label: string
  pourboire_tpe: number
  total_encaissements_cash_reel: number
  total_ca_cash: number
  total_encaissements_cb_reel: number
  total_encaissements_cb_ls: number
  full_ca: number
  ht_plus_poire: number
  delta: number
  delta_encaissement_cash: number
  delta_encaissement_cb: number
  reglement_verifier: number
  ecart_cash_service: number
  cb_ecart_service: number
  a_mettre_au_frais: number
  delta_a_ajouter_cb: number
}

export type Tag = {
  id: string
  name: string
}

export type JoursOuverts = {
  id: string
  mois: number
  nb_jours_ouverts: number
  objectif_par_jour: number
  objectif_min: number
}

// Valeurs J-1 à pré-remplir dans le formulaire "Nouveau service"
export type VeilleData = {
  sp_cb_jplus1_pourboire_incl: number | null
  sp_pourboire_jplus1: number | null
  payplus_jplus1: number | null
}
