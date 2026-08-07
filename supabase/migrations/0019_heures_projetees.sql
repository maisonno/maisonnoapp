-- =============================================================
-- Projet : Analyse des services (préfixe : ana_)
-- Heures « projetées » : pointage si connu, sinon planning
-- =============================================================
-- À exécuter dans le SQL Editor Supabase.
--
-- `heures_reelles` ne compte que les shifts pointés et `heures_planifiees` que
-- le planning prévu. Pour un mois en cours, aucune des deux ne donne le total
-- attendu : il faut combiner shift par shift (passé = pointé, futur = planifié).
-- =============================================================

alter table ana_heures_mois add column if not exists heures_projetees   numeric default 0;
alter table ana_heures_mois add column if not exists supp_equiv_projete numeric default 0;

select pg_notify('pgrst', 'reload schema');
