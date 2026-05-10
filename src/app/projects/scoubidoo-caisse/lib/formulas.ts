import type { CaisseFields } from './types'

const n = (v: number | null | undefined): number => v ?? 0

// B. Comptage espèces
export function computeTotalCaisseSoir(c: CaisseFields): number {
  return (
    n(c.billets_500) * 500 +
    n(c.billets_200) * 200 +
    n(c.billets_100) * 100 +
    n(c.billets_50) * 50 +
    n(c.billets_20) * 20 +
    n(c.billets_10) * 10 +
    n(c.billets_5) * 5 +
    n(c.pieces_2) * 2 +
    n(c.pieces_1) +
    n(c.pieces_50c) * 0.5 +
    n(c.pieces_20c) * 0.2 +
    n(c.pieces_10c) * 0.1
  )
}

// C. Comptage au poids → nombre de pièces estimé
export function computeNbPiecesPoids(c: CaisseFields) {
  return {
    nb_pieces_2:   Math.round((n(c.poids_pieces_2)   / 8.5) * 10) / 10,
    nb_pieces_1:   Math.round((n(c.poids_pieces_1)   / 7.5) * 10) / 10,
    nb_pieces_50c: Math.round((n(c.poids_pieces_50c) / 7.8) * 10) / 10,
    nb_pieces_20c: Math.round((n(c.poids_pieces_20c) / 5.7) * 10) / 10,
    nb_pieces_10c: Math.round((n(c.poids_pieces_10c) / 4.1) * 10) / 10,
  }
}

// F. Pay+
export function computePayplusEncaissements(c: CaisseFields): number {
  return n(c.payplus_rapport_x) - n(c.payplus_ventes_service) - n(c.payplus_jplus1_de_la_veille)
}

export function computePayplusPourboire(c: CaisseFields): number {
  return n(c.payplus_cumul_pourboire) - n(c.payplus_pourboire_service)
}

// G. Smile & Pay
export function computeSpPourboire(c: CaisseFields): number {
  return n(c.sp_pourboire_j) + n(c.sp_pourboire_jplus1) - n(c.sp_pourboire_jplus1_de_la_veille)
}

export function computeSpCbService(c: CaisseFields): number {
  const cbBrut =
    n(c.sp_cb_j_pourboire_incl) +
    n(c.sp_cb_jplus1_pourboire_incl) -
    n(c.sp_cb_jplus1_veille_pourboire_incl)
  const pourboire = computeSpPourboire(c)
  return cbBrut - pourboire
}

// H. Pourboires
export function computePourboire(c: CaisseFields): number {
  return computePayplusPourboire(c) + computeSpPourboire(c)
}

// J. Indicateurs synthétiques
export function computeTotalEncaissementsCashReel(c: CaisseFields): number {
  return computeTotalCaisseSoir(c) - n(c.fond_caisse_matin)
}

export function computeTotalCaCash(c: CaisseFields): number {
  return computeTotalCaisseSoir(c) - n(c.fond_caisse_matin) - n(c.mouvement_monnaie)
}

export function computeTotalEncaissementsCbReel(c: CaisseFields): number {
  return computePayplusEncaissements(c) + computeSpCbService(c)
}

export function computeTotalEncaissementsLs(c: CaisseFields): number {
  return n(c.reglement_service_cash) + n(c.reglement_service_cb_v2) + n(c.reglement_service_payplus)
}

export function computeTotalEncaissementsCbLs(c: CaisseFields): number {
  return n(c.reglement_service_cb_v2) + n(c.reglement_service_payplus)
}

export function computeFullCa(c: CaisseFields): number {
  return (
    computeTotalCaCash(c) +
    computePayplusEncaissements(c) +
    computeSpCbService(c) -
    n(c.reglement_service_trop_percu_cb) +
    n(c.reglement_service_compte_client) -
    n(c.paiement_compte_cb) -
    n(c.paiement_compte_cash)
  )
}

export function computeHtPlusPoire(c: CaisseFields): number {
  return n(c.total_service_ht) + n(c.poire)
}

export function computeAMettreAuFrais(c: CaisseFields): number {
  return computeFullCa(c) - computeTotalEncaissementsLs(c)
}

// K. Contrôles & deltas
export function computeDelta(c: CaisseFields): number {
  return (
    computeTotalCaisseSoir(c) -
    n(c.mis_au_coffre) -
    n(c.poire) +
    n(c.ajout_monnaie) -
    n(c.fond_caisse_soir) -
    n(c.pourboire_tpe_verse_au_pourboire) -
    n(c.trop_percu_verse_au_pourboire)
  )
}

export function computeDeltaEncaissementCash(c: CaisseFields): number {
  // Formule corrigée (bug Coda : colonne inexistante remplacée)
  return n(c.reglement_service_cash) - computeTotalEncaissementsCashReel(c)
}

export function computeDeltaEncaissementCb(c: CaisseFields): number {
  return computeTotalEncaissementsCbLs(c) - computeTotalEncaissementsCbReel(c)
}

export function computeReglementVerifier(c: CaisseFields): number {
  return (
    n(c.reglement_service_total) -
    n(c.reglement_service_cash) -
    n(c.reglement_service_cb_v2) -
    n(c.reglement_service_payplus) -
    n(c.reglement_service_compte_client) -
    n(c.reglement_service_trop_percu_cb) -
    n(c.reglement_autres_cheque)
  )
}

export function computeEcartCashService(c: CaisseFields): number {
  return (
    computeTotalCaisseSoir(c) -
    n(c.fond_caisse_matin) -
    n(c.mouvement_monnaie) -
    n(c.reglement_service_cash) -
    n(c.paiement_compte_cash)
  )
}

export function computeCbEcartService(c: CaisseFields): number {
  return (
    computeSpCbService(c) +
    computePayplusEncaissements(c) -
    n(c.reglement_service_pay_at_table) -
    n(c.reglement_service_payplus) -
    n(c.reglement_service_cb_v2) -
    n(c.paiement_compte_cb) +
    n(c.ecart_cb)
  )
}

export function computeDeltaAAjouterCb(c: CaisseFields): number {
  return (
    computePayplusEncaissements(c) +
    computeSpCbService(c) -
    n(c.reglement_service_trop_percu_cb) -
    n(c.reglement_service_payplus) -
    n(c.reglement_service_pay_at_table) -
    n(c.paiement_compte_cb) -
    n(c.reglement_cb_du_service_v1)
  )
}

// Calcul complet — retourne tous les indicateurs à la fois
export function computeAll(c: CaisseFields) {
  const totalCaisseSoir = computeTotalCaisseSoir(c)
  const payplusEnc = computePayplusEncaissements(c)
  const payplusPourb = computePayplusPourboire(c)
  const spPourboire = computeSpPourboire(c)
  const spCbService = computeSpCbService(c)
  const cashReel = totalCaisseSoir - n(c.fond_caisse_matin)
  const totalCaCash = cashReel - n(c.mouvement_monnaie)
  const cbReel = payplusEnc + spCbService
  const fullCa =
    totalCaCash + payplusEnc + spCbService -
    n(c.reglement_service_trop_percu_cb) +
    n(c.reglement_service_compte_client) -
    n(c.paiement_compte_cb) -
    n(c.paiement_compte_cash)

  return {
    total_caisse_soir: totalCaisseSoir,
    ...computeNbPiecesPoids(c),
    payplus_encaissements: payplusEnc,
    payplus_pourboire: payplusPourb,
    sp_pourboire_service: spPourboire,
    sp_cb_service: spCbService,
    pourboire_tpe: payplusPourb + spPourboire,
    total_encaissements_cash_reel: cashReel,
    total_ca_cash: totalCaCash,
    total_encaissements_cb_reel: cbReel,
    total_encaissements_ls: computeTotalEncaissementsLs(c),
    total_encaissements_cb_ls: computeTotalEncaissementsCbLs(c),
    full_ca: fullCa,
    ht_plus_poire: computeHtPlusPoire(c),
    a_mettre_au_frais: fullCa - computeTotalEncaissementsLs(c),
    delta: computeDelta(c),
    delta_encaissement_cash: computeDeltaEncaissementCash(c),
    delta_encaissement_cb: computeDeltaEncaissementCb(c),
    reglement_verifier: computeReglementVerifier(c),
    ecart_cash_service: computeEcartCashService(c),
    cb_ecart_service: computeCbEcartService(c),
    delta_a_ajouter_cb: computeDeltaAAjouterCb(c),
  }
}
