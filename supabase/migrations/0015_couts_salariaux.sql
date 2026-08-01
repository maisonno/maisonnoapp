-- =============================================================
-- Projet : Analyse des services (préfixe : ana_)
-- Onglet « Coûts salariaux » — contrats, compléments, paramètres
-- =============================================================
-- À exécuter dans le SQL Editor Supabase.
--
-- Ces tables alimentent la page DÉTAIL (zone protégée par mot de passe).
-- Elles contiennent des données nominatives et salariales : le nom d'affichage
-- est saisi manuellement ici, l'import Combo (ana_labor) reste anonyme (hash).
-- Le lien facultatif `employe_hash` rattache un contrat aux lignes importées.
-- =============================================================

-- 1 ligne = 1 contrat salarié
create table if not exists ana_contrats (
  id                    uuid default gen_random_uuid() primary key,
  nom_affichage         text not null,              -- saisi en zone protégée
  poste                 text,
  contrat               text,                       -- Saisonnier, CDI…
  employe_hash          text,                       -- lien facultatif vers ana_labor
  date_debut            date,
  date_fin              date,
  heures_hebdo_contrat  numeric,                    -- heures hebdo contractuelles
  salaire_brut_mensuel  numeric,                    -- brut de base (saisi si absent de l'API)
  heures_hebdo_cible    numeric,                    -- cible pour le prévisionnel
  actif                 boolean default true,
  created_at            timestamptz default now(),
  updated_at            timestamptz default now()
);
create index if not exists idx_ana_contrats_hash on ana_contrats (employe_hash);

-- Complément de rémunération « Poire » : versé en CASH, NON soumis aux charges
create table if not exists ana_remuneration_poire (
  id          uuid default gen_random_uuid() primary key,
  contrat_id  uuid not null references ana_contrats(id) on delete cascade,
  mois        date not null,                        -- 1er jour du mois
  montant     numeric not null default 0,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now(),
  unique (contrat_id, mois)
);
create index if not exists idx_ana_rem_poire_mois on ana_remuneration_poire (mois);

-- Paramètres du module (ex. coefficient de charges patronales)
create table if not exists ana_params (
  cle        text primary key,
  valeur     numeric not null,
  updated_at timestamptz default now()
);
insert into ana_params (cle, valeur) values ('taux_charges_patronales', 0.30)
  on conflict (cle) do nothing;

-- RLS + GRANTs (cf. migration 0011 pour le pourquoi des GRANTs explicites)
alter table ana_contrats           enable row level security;
alter table ana_remuneration_poire enable row level security;
alter table ana_params             enable row level security;

create policy "auth read ana_contrats"             on ana_contrats           for select using (auth.role() = 'authenticated');
create policy "auth manage ana_contrats"           on ana_contrats           for all    using (auth.role() = 'authenticated');
create policy "auth read ana_remuneration_poire"   on ana_remuneration_poire for select using (auth.role() = 'authenticated');
create policy "auth manage ana_remuneration_poire" on ana_remuneration_poire for all    using (auth.role() = 'authenticated');
create policy "auth read ana_params"               on ana_params             for select using (auth.role() = 'authenticated');
create policy "auth manage ana_params"             on ana_params             for all    using (auth.role() = 'authenticated');

grant select, insert, update, delete on table ana_contrats           to authenticated;
grant select, insert, update, delete on table ana_remuneration_poire to authenticated;
grant select, insert, update, delete on table ana_params             to authenticated;

-- Triggers updated_at (fonction créée par 0001_init.sql)
drop trigger if exists ana_contrats_updated_at on ana_contrats;
create trigger ana_contrats_updated_at
  before update on ana_contrats
  for each row execute procedure update_updated_at();

drop trigger if exists ana_remuneration_poire_updated_at on ana_remuneration_poire;
create trigger ana_remuneration_poire_updated_at
  before update on ana_remuneration_poire
  for each row execute procedure update_updated_at();

select pg_notify('pgrst', 'reload schema');
