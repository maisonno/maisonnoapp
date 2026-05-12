import type { CaisseFields } from './types'

const n = (v: number | null | undefined): number => v ?? 0

// Comptage espèces
export function computeTotalCaisseSoir(c: CaisseFields): number {
  return (
    n(c.billets_500) * 500 + n(c.billets_200) * 200 + n(c.billets_100) * 100 +
    n(c.billets_50) * 50  + n(c.billets_20) * 20   + n(c.billets_10) * 10  +
    n(c.billets_5) * 5    + n(c.pieces_2) * 2       + n(c.pieces_1)         +
    n(c.pieces_50c) * 0.5 + n(c.pieces_20c) * 0.2   + n(c.pieces_10c) * 0.1
  )
}

export function computeNbPiecesPoids(c: CaisseFields) {
  return {
    nb_pieces_2:   Math.round((n(c.poids_pieces_2)   / 8.5) * 10) / 10,
    nb_pieces_1:   Math.round((n(c.poids_pieces_1)   / 7.5) * 10) / 10,
    nb_pieces_50c: Math.round((n(c.poids_pieces_50c) / 7.8) * 10) / 10,
    nb_pieces_20c: Math.round((n(c.poids_pieces_20c) / 5.7) * 10) / 10,
    nb_pieces_10c: Math.round((n(c.poids_pieces_10c) / 4.1) * 10) / 10,
  }
}

// Étape 1 — Total CA v1
export function computeTotalCAv1(c: CaisseFields): number {
  return (
    n(c.reglement_service_compte_client) +
    n(c.reglement_cb_du_service_v1) +
    n(c.reglement_service_cash) +
    n(c.reglement_service_trop_percu_cb) +
    n(c.reglement_service_pay_at_table) +
    n(c.reglement_service_payplus) +
    n(c.reglement_autres_cheque)
  )
}

// Étape 2 — CB
export function computeEncaissementCB(c: CaisseFields): number {
  const sp =
    n(c.sp_cb_j_pourboire_incl) +
    n(c.sp_cb_jplus1_pourboire_incl) -
    n(c.sp_cb_jplus1_veille_pourboire_incl)
  const autre =
    n(c.autre_cb_j_pourboire_incl) +
    n(c.autre_cb_jplus1_pourboire_incl) -
    n(c.autre_cb_jplus1_veille_pourboire_incl)
  return sp + autre
}

export function computePourboire_CB(c: CaisseFields): number {
  const sp =
    n(c.sp_pourboire_j) + n(c.sp_pourboire_jplus1) - n(c.sp_pourboire_jplus1_de_la_veille)
  const autre =
    n(c.autre_pourboire_j) + n(c.autre_pourboire_jplus1) - n(c.autre_pourboire_jplus1_de_la_veille)
  return sp + autre
}

export function computeEncaissementCBNet(c: CaisseFields): number {
  return computeEncaissementCB(c) - computePourboire_CB(c)
}

export function computeCACB(c: CaisseFields): number {
  return computeEncaissementCBNet(c) - n(c.reglement_differe_cb)
}

export function computeDeltaCBv1(c: CaisseFields): number {
  return computeCACB(c) - n(c.reglement_cb_du_service_v1)
}

// Étape 3 — Cash
export function computeCACash(c: CaisseFields): number {
  return (
    computeTotalCaisseSoir(c) -
    n(c.fond_caisse_matin) -
    n(c.mouvement_monnaie) -
    n(c.reglement_differe_cash)
  )
}

export function computeDeltaCashv1(c: CaisseFields): number {
  return computeCACash(c) - n(c.reglement_service_cash)
}

// Étape 6 — Rapport X v2
export function computeTotalCAv2(c: CaisseFields): number {
  const cashV2 = c.reglement_service_cash_v2 != null
    ? n(c.reglement_service_cash_v2)
    : n(c.reglement_service_cash)
  return (
    n(c.reglement_service_compte_client) +
    n(c.reglement_service_cb_v2) +
    cashV2 +
    n(c.reglement_service_trop_percu_cb) +
    n(c.reglement_service_pay_at_table) +
    n(c.reglement_service_payplus) +
    n(c.reglement_autres_cheque)
  )
}

export function computeDeltaCBv2(c: CaisseFields): number {
  return n(c.reglement_service_cb_v2) - computeCACB(c)
}

export function computeDeltaTTC(c: CaisseFields): number {
  return n(c.total_service_ttc) - computeTotalCAv2(c)
}

// Étape 7 — Répartition
export function computeResteEnCaisse(c: CaisseFields): number {
  return (
    computeTotalCaisseSoir(c) -
    n(c.poire) -
    n(c.mis_au_coffre) -
    n(c.pourboire_tpe_verse_au_pourboire)
  )
}

export function computeDeltaCashv2(c: CaisseFields): number {
  const cashV2 = c.reglement_service_cash_v2 != null
    ? n(c.reglement_service_cash_v2)
    : n(c.reglement_service_cash)
  return computeCACash(c) - cashV2
}

// Étape 8 — Clôture
export function computeDeltaCloture(c: CaisseFields): number {
  return n(c.fond_caisse_soir) - computeResteEnCaisse(c) + n(c.ajout_monnaie)
}

// Pour la liste des services (backward compat)
export function computeFullCa(c: CaisseFields): number {
  const cashV2 = c.reglement_service_cash_v2 != null
    ? n(c.reglement_service_cash_v2)
    : n(c.reglement_service_cash)
  const totalCa = computeTotalCaisseSoir(c) - n(c.fond_caisse_matin) - n(c.mouvement_monnaie)
  return totalCa + computeCACB(c) + cashV2
}

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

// Calcul complet
export function computeAll(c: CaisseFields) {
  const totalCaisseSoir = computeTotalCaisseSoir(c)
  const totalCAv1 = computeTotalCAv1(c)
  const encaissementCB = computeEncaissementCB(c)
  const pourboireCB = computePourboire_CB(c)
  const encaissementCBNet = encaissementCB - pourboireCB
  const caCB = encaissementCBNet - n(c.reglement_differe_cb)
  const deltaCBv1 = caCB - n(c.reglement_cb_du_service_v1)
  const caCash = computeCACash(c)
  const deltaCashv1 = caCash - n(c.reglement_service_cash)
  const pctDeltaCash = totalCAv1 > 0.01 ? (deltaCashv1 / totalCAv1) * 100 : 0
  const totalCAv2 = computeTotalCAv2(c)
  const deltaCBv2 = n(c.reglement_service_cb_v2) - caCB
  const deltaTTC = n(c.total_service_ttc) - totalCAv2
  const resteEnCaisse = computeResteEnCaisse(c)
  const deltaCashv2 = computeDeltaCashv2(c)
  const deltaCloture = n(c.fond_caisse_soir) - resteEnCaisse + n(c.ajout_monnaie)

  return {
    total_caisse_soir: totalCaisseSoir,
    ...computeNbPiecesPoids(c),
    // Étape 1
    total_ca_v1: totalCAv1,
    // Étape 2
    encaissement_cb: encaissementCB,
    pourboire_cb: pourboireCB,
    encaissement_cb_net: encaissementCBNet,
    ca_cb: caCB,
    delta_cb_v1: deltaCBv1,
    // Étape 3
    ca_cash: caCash,
    delta_cash_v1: deltaCashv1,
    pct_delta_cash: pctDeltaCash,
    // Étape 6
    total_ca_v2: totalCAv2,
    delta_cb_v2: deltaCBv2,
    delta_ttc: deltaTTC,
    // Étape 7
    reste_en_caisse: resteEnCaisse,
    delta_cash_v2: deltaCashv2,
    // Étape 8
    delta_cloture: deltaCloture,
    // Liste des services
    full_ca: computeFullCa(c),
    delta: computeDelta(c),
  }
}
