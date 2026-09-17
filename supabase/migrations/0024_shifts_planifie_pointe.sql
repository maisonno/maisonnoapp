-- =============================================================
-- Projet : Analyse des services (préfixe : ana_)
-- Shifts : conserver le planifié ET le pointé
-- =============================================================
-- À exécuter dans le SQL Editor Supabase.
--
-- `ana_shifts_jour.duree_heures` ne gardait qu'une seule mesure — le pointage
-- s'il existe, sinon le planning — sans qu'on puisse revenir à l'autre. Or les
-- deux sont utiles : l'écart entre prévu et pointé se lit directement, et c'est
-- lui qui permet de recouper la modulation affichée par Combo.
--
-- Combo renvoie les deux dans /plannings :
--   · starts_at / ends_at / break_duration                → planifié
--   · real_starts_at / real_ends_at / real_break_duration  → pointé
--
-- `duree_heures` reste la mesure qui fait foi (le pointage quand il existe) —
-- rien ne change pour la vue `v_repos_hebdo` ni pour les calculs de coût.
-- `type` dit laquelle des deux a été retenue ('pointe' ou 'planifie').
-- =============================================================

alter table ana_shifts_jour add column if not exists heures_planifiees numeric;
alter table ana_shifts_jour add column if not exists heures_pointees   numeric;

comment on column ana_shifts_jour.heures_planifiees is
  'Durée du shift au planning, pause déduite (starts_at → ends_at).';
comment on column ana_shifts_jour.heures_pointees is
  'Durée réellement pointée, pause déduite (real_starts_at → real_ends_at). NULL si pas de pointage.';
comment on column ana_shifts_jour.duree_heures is
  'Mesure retenue : le pointage quand il existe, sinon le planning. Voir `type`.';

select pg_notify('pgrst', 'reload schema');
