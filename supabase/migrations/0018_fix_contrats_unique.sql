-- =============================================================
-- Correctif : index unique sur ana_contrats.combo_contract_id
-- =============================================================
-- La migration 0017 créait un index unique PARTIEL
-- (`where combo_contract_id is not null`). Or `ON CONFLICT (col)` ne peut
-- s'appuyer sur un index partiel que si la requête répète le même prédicat,
-- ce que PostgREST ne fait pas → « there is no unique or exclusion constraint
-- matching the ON CONFLICT specification » à la synchro ComboHR.
--
-- On le remplace par un index unique simple : en PostgreSQL les NULL ne
-- s'entrechoquent pas (NULLS DISTINCT par défaut), donc les contrats saisis à
-- la main (sans combo_contract_id) restent parfaitement possibles.
-- =============================================================

drop index if exists uq_ana_contrats_combo;

create unique index if not exists uq_ana_contrats_combo
  on ana_contrats (combo_contract_id);

select pg_notify('pgrst', 'reload schema');
