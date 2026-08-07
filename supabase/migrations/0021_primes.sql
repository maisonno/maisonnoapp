-- =============================================================
-- Projet : Analyse des services (préfixe : ana_)
-- Primes mensuelles versées en Poire
-- =============================================================
-- À exécuter dans le SQL Editor Supabase.
--
-- Une prime mensuelle est décidée pour un salarié à TEMPS PLEIN ; le montant de
-- chaque salarié en découle :
--   prime = montant_temps_plein
--         × (heures hebdo CONTRACTUELLES / heures temps plein)   ← pas le réalisé
--         × prorata des jours du mois couverts par le contrat
--
-- La prime étant versée en Poire (cash), elle n'est pas soumise aux charges :
-- elle s'ajoute au coût global APRÈS le coefficient de charges patronales.
--
-- `ana_remuneration_poire` reste utilisée comme AJUSTEMENT manuel : une valeur
-- saisie pour un salarié et un mois remplace le montant calculé.
-- =============================================================

create table if not exists ana_primes (
  mois                date primary key,          -- 1er jour du mois
  montant_temps_plein numeric not null default 0,
  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);

alter table ana_primes enable row level security;
create policy "auth read ana_primes"   on ana_primes for select using (auth.role() = 'authenticated');
create policy "auth manage ana_primes" on ana_primes for all    using (auth.role() = 'authenticated');
grant select, insert, update, delete on table ana_primes to authenticated;

drop trigger if exists ana_primes_updated_at on ana_primes;
create trigger ana_primes_updated_at
  before update on ana_primes
  for each row execute procedure update_updated_at();

-- Référence « temps plein » (heures hebdo) servant au prorata temps partiel
insert into ana_params (cle, valeur) values ('heures_temps_plein', 39)
  on conflict (cle) do nothing;

select pg_notify('pgrst', 'reload schema');
