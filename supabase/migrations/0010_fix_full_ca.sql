-- Correction Full CA : total_service_ttc + poire
-- (si total_service_ttc null : fallback sur somme des règlements v2)
drop view if exists scd_v_caisse_calc;

create view scd_v_caisse_calc as
with base as (
  select
    c.*,
    t.name as tag_name,

    coalesce(c.billets_500,0)*500
    + coalesce(c.billets_200,0)*200
    + coalesce(c.billets_100,0)*100
    + coalesce(c.billets_50,0)*50
    + coalesce(c.billets_20,0)*20
    + coalesce(c.billets_10,0)*10
    + coalesce(c.billets_5,0)*5
    + coalesce(c.pieces_2,0)*2
    + coalesce(c.pieces_1,0)
    + coalesce(c.pieces_50c,0)*0.5
    + coalesce(c.pieces_20c,0)*0.2
    + coalesce(c.pieces_10c,0)*0.1
    as total_caisse_soir,

    round(coalesce(c.poids_pieces_2,0)   / 8.5, 1) as nb_pieces_2_poids,
    round(coalesce(c.poids_pieces_1,0)   / 7.5, 1) as nb_pieces_1_poids,
    round(coalesce(c.poids_pieces_50c,0) / 7.8, 1) as nb_pieces_50c_poids,
    round(coalesce(c.poids_pieces_20c,0) / 5.7, 1) as nb_pieces_20c_poids,
    round(coalesce(c.poids_pieces_10c,0) / 4.1, 1) as nb_pieces_10c_poids,

    coalesce(c.payplus_rapport_x,0)
      - coalesce(c.payplus_ventes_service,0)
      - coalesce(c.payplus_jplus1_de_la_veille,0)
    as payplus_encaissements,

    coalesce(c.payplus_cumul_pourboire,0) - coalesce(c.payplus_pourboire_service,0)
    as payplus_pourboire,

    coalesce(c.sp_pourboire_j,0)
      + coalesce(c.sp_pourboire_jplus1,0)
      - coalesce(c.sp_pourboire_jplus1_de_la_veille,0)
    as sp_pourboire_service,

    (
      coalesce(c.sp_cb_j_pourboire_incl,0)
      + coalesce(c.sp_cb_jplus1_pourboire_incl,0)
      - coalesce(c.sp_cb_jplus1_veille_pourboire_incl,0)
    ) - (
      coalesce(c.sp_pourboire_j,0)
      + coalesce(c.sp_pourboire_jplus1,0)
      - coalesce(c.sp_pourboire_jplus1_de_la_veille,0)
    )
    as sp_cb_service,

    -coalesce(c.reglement_service_trop_percu_cb,0) as trop_percu,

    coalesce(c.reglement_service_cash,0)
      + coalesce(c.reglement_service_cb_v2,0)
      + coalesce(c.reglement_service_payplus,0)
    as total_encaissements_ls,

    to_char(c.date, 'FMMM/YYYY') as mois_label

  from scd_caisse c
  left join scd_tag t on t.id = c.tag_id
)
select
  b.*,

  b.payplus_pourboire + b.sp_pourboire_service as pourboire_tpe,

  b.total_caisse_soir - coalesce(b.fond_caisse_matin,0) as total_encaissements_cash_reel,

  b.total_caisse_soir - coalesce(b.fond_caisse_matin,0) - coalesce(b.mouvement_monnaie,0) as total_ca_cash,

  b.payplus_encaissements + b.sp_cb_service as total_encaissements_cb_reel,

  coalesce(b.reglement_service_cb_v2,0) + coalesce(b.reglement_service_payplus,0) as total_encaissements_cb_ls,

  -- Full CA = TTC + Poire (fallback : somme règlements v2 + poire si TTC absent)
  coalesce(
    b.total_service_ttc,
    coalesce(b.reglement_service_compte_client,0)
    + coalesce(b.reglement_service_cb_v2,0)
    + coalesce(case when b.reglement_service_cash_v2 is not null then b.reglement_service_cash_v2 else b.reglement_service_cash end, 0)
    + coalesce(b.reglement_service_trop_percu_cb,0)
    + coalesce(b.reglement_service_pay_at_table,0)
    + coalesce(b.reglement_service_payplus,0)
    + coalesce(b.reglement_autres_cheque,0)
  ) + coalesce(b.poire,0)
  as full_ca,

  coalesce(b.total_service_ht,0) + coalesce(b.poire,0) as ht_plus_poire,

  b.total_caisse_soir
  - coalesce(b.mis_au_coffre,0)
  - coalesce(b.poire,0)
  + coalesce(b.ajout_monnaie,0)
  - coalesce(b.fond_caisse_soir,0)
  - coalesce(b.pourboire_tpe_verse_au_pourboire,0)
  - coalesce(b.trop_percu_verse_au_pourboire,0)
  as delta,

  coalesce(b.reglement_service_cash,0)
  - (b.total_caisse_soir - coalesce(b.fond_caisse_matin,0))
  as delta_encaissement_cash,

  (coalesce(b.reglement_service_cb_v2,0) + coalesce(b.reglement_service_payplus,0))
  - (b.payplus_encaissements + b.sp_cb_service)
  as delta_encaissement_cb,

  coalesce(b.reglement_service_total,0)
  - coalesce(b.reglement_service_cash,0)
  - coalesce(b.reglement_service_cb_v2,0)
  - coalesce(b.reglement_service_payplus,0)
  - coalesce(b.reglement_service_compte_client,0)
  - coalesce(b.reglement_service_trop_percu_cb,0)
  - coalesce(b.reglement_autres_cheque,0)
  as reglement_verifier,

  b.total_caisse_soir
  - coalesce(b.fond_caisse_matin,0)
  - coalesce(b.mouvement_monnaie,0)
  - coalesce(b.reglement_service_cash,0)
  - coalesce(b.paiement_compte_cash,0)
  as ecart_cash_service,

  b.sp_cb_service
  + b.payplus_encaissements
  - coalesce(b.reglement_service_pay_at_table,0)
  - coalesce(b.reglement_service_payplus,0)
  - coalesce(b.reglement_service_cb_v2,0)
  - coalesce(b.paiement_compte_cb,0)
  + coalesce(b.ecart_cb,0)
  as cb_ecart_service,

  (
    (b.total_caisse_soir - coalesce(b.fond_caisse_matin,0) - coalesce(b.mouvement_monnaie,0))
    + b.payplus_encaissements
    + b.sp_cb_service
    - coalesce(b.reglement_service_trop_percu_cb,0)
    + coalesce(b.reglement_service_compte_client,0)
    - coalesce(b.paiement_compte_cb,0)
    - coalesce(b.paiement_compte_cash,0)
  ) - (
    coalesce(b.reglement_service_cash,0)
    + coalesce(b.reglement_service_cb_v2,0)
    + coalesce(b.reglement_service_payplus,0)
  )
  as a_mettre_au_frais,

  b.payplus_encaissements
  + b.sp_cb_service
  - coalesce(b.reglement_service_trop_percu_cb,0)
  - coalesce(b.reglement_service_payplus,0)
  - coalesce(b.reglement_service_pay_at_table,0)
  - coalesce(b.paiement_compte_cb,0)
  - coalesce(b.reglement_cb_du_service_v1,0)
  as delta_a_ajouter_cb

from base b;
