-- Migration 0006 : nouveaux champs pour le workflow de saisie scoubidoo-caisse

alter table scd_caisse
  add column if not exists reglement_differe_cb    numeric,
  add column if not exists reglement_differe_cash  numeric,
  add column if not exists reglement_service_cash_v2 numeric,
  add column if not exists total_service_ttc       numeric,
  add column if not exists autre_cb_j_pourboire_incl            numeric,
  add column if not exists autre_cb_jplus1_pourboire_incl       numeric,
  add column if not exists autre_cb_jplus1_veille_pourboire_incl numeric,
  add column if not exists autre_pourboire_j                    numeric,
  add column if not exists autre_pourboire_jplus1               numeric,
  add column if not exists autre_pourboire_jplus1_de_la_veille  numeric;
