-- =============================================================
-- Projet : Analyse des services (préfixe : ana_)
-- Connecteur ComboHR Partner API (remplace l'import fichier)
-- =============================================================
-- À exécuter dans le SQL Editor Supabase.
--
-- Source : https://partner.combohr.com/api/v1 (auth : Bearer / doorkeeper).
--   /locations  → établissements et équipes
--   /contracts  → contrats (nom, fonction, heures hebdo, salaire brut mensuel)
--   /plannings  → shifts, avec heures PLANIFIÉES et RÉELLES (pointages)
-- =============================================================

-- 1. Paramètres : autoriser les valeurs texte (id d'établissement Combo…)
alter table ana_params alter column valeur drop not null;
alter table ana_params add column if not exists valeur_texte text;

-- 2. Contrats : rattachement au contrat Combo (idempotence de la synchro)
alter table ana_contrats add column if not exists combo_contract_id text;
alter table ana_contrats add column if not exists synced_at timestamptz;
-- Index unique SIMPLE (pas partiel) : `ON CONFLICT (combo_contract_id)` ne sait
-- pas s'appuyer sur un index partiel. Les NULL ne s'entrechoquent pas en
-- PostgreSQL, les contrats saisis à la main restent donc possibles.
create unique index if not exists uq_ana_contrats_combo
  on ana_contrats (combo_contract_id);

-- 3. Heures par contrat et par mois, issues des plannings Combo
create table if not exists ana_heures_mois (
  contrat_id            uuid not null references ana_contrats(id) on delete cascade,
  mois                  date not null,            -- 1er jour du mois
  heures_reelles        numeric default 0,        -- pointages (real_starts_at/ends_at)
  heures_planifiees     numeric default 0,        -- planning prévu
  -- Heures « équivalent payé » de la majoration au-delà du contrat (barème CHR),
  -- calculées semaine par semaine à la synchro puis agrégées au mois.
  supp_equiv_reel       numeric default 0,
  supp_equiv_planifie   numeric default 0,
  synced_at             timestamptz default now(),
  primary key (contrat_id, mois)
);
create index if not exists idx_ana_heures_mois_mois on ana_heures_mois (mois);

alter table ana_heures_mois enable row level security;
create policy "auth read ana_heures_mois"   on ana_heures_mois for select using (auth.role() = 'authenticated');
create policy "auth manage ana_heures_mois" on ana_heures_mois for all    using (auth.role() = 'authenticated');
grant select, insert, update, delete on table ana_heures_mois to authenticated;

select pg_notify('pgrst', 'reload schema');
