-- =============================================================
-- Projet : Analyse des services (préfixe : ana_)
-- Conserver le nom / prénom des salariés dans l'import Combo
-- =============================================================
-- À exécuter dans le SQL Editor Supabase.
--
-- L'import était volontairement anonyme (hash seul). On conserve désormais le
-- nom et le prénom pour pouvoir rattacher un salarié à son contrat et compléter
-- les informations absentes de Combo (salaire brut, heures cible…).
-- `employe_hash` reste la clé d'idempotence : rien ne change côté import.
-- Ces colonnes ne sont exposées que dans la zone Détail (protégée par code).
-- =============================================================

alter table ana_labor add column if not exists nom    text;
alter table ana_labor add column if not exists prenom text;

select pg_notify('pgrst', 'reload schema');
