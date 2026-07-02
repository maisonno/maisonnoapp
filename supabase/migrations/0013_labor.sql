-- =============================================================
-- Projet : Analyse des services (préfixe : ana_)
-- Coûts salariaux — export comptable Combo (onglet « Synthèse »)
-- =============================================================
-- À exécuter dans le SQL Editor du dashboard Supabase.
--
-- Anonymisation : les NOMS ne sont JAMAIS stockés. Le client hash Nom+Prénom
-- (employe_hash) pour dédoublonner sans exposer d'identité. On ne conserve que
-- des colonnes non nominatives (poste, contrat, salaire de base, heures).
-- =============================================================

-- 1 ligne = 1 salarié × 1 période (mois de paie)
create table if not exists ana_labor (
  periode                date    not null,        -- 1er jour du mois de paie
  employe_hash           text    not null,        -- hash anonyme (Nom+Prénom+contrat)
  poste                  text,                     -- "Poste" (Serveur, Chef de cuisine…)
  contrat                text,                     -- "Contrat" (Saisonnier…)
  salaire_base           numeric default 0,        -- "Salaire de base" (brut mensuel de base)
  heures_contrat_mensuel numeric,                  -- "Heures contrat mensuel"
  heures_travaillees     numeric,                  -- "Heures travaillées"
  jours_travailles       numeric,                  -- "Total jours travaillés"
  -- Éléments de coût au-delà du salaire de base (en HEURES dans l'export Combo) —
  -- à valoriser au taux horaire (salaire_base / heures_contrat_mensuel) selon la
  -- règle de calcul retenue. Le « double du 6ème jour » n'est pas isolable ici.
  h_supp_10              numeric,                  -- "Heures supp. 10.0% (hors contrat)"
  h_supp_20              numeric,                  -- "Heures supp. 20.0% (hors contrat)"
  h_supp_50              numeric,                  -- "Heures supp. 50.0% (hors contrat)"
  h_nuit                 numeric,                  -- "Heures majorées de nuit"
  h_feries              numeric,                  -- "Heures travaillées majorées (jours fériés)"
  h_1er_mai             numeric,                  -- "Heures majorées 1er mai"
  conges_payes_j        numeric,                  -- "Congé payé (j)"
  source_file            text,
  imported_at            timestamptz default now(),
  primary key (periode, employe_hash)
);
create index if not exists idx_ana_labor_periode on ana_labor (periode);

-- RLS + GRANTs (cf. migration 0011 pour le pourquoi des GRANTs explicites)
alter table ana_labor enable row level security;
create policy "auth read ana_labor"   on ana_labor for select using (auth.role() = 'authenticated');
create policy "auth manage ana_labor" on ana_labor for all    using (auth.role() = 'authenticated');
grant select, insert, update, delete on table ana_labor to authenticated;

-- Journal des imports : colonne pour les imports Combo
alter table ana_import_log add column if not exists labor_upserted int;

select pg_notify('pgrst', 'reload schema');
