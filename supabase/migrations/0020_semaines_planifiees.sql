-- =============================================================
-- Projet : Analyse des services (préfixe : ana_)
-- Semaines effectivement planifiées dans ComboHR
-- =============================================================
-- À exécuter dans le SQL Editor Supabase.
--
-- Le planning se fait semaine par semaine : une semaine future peut n'être pas
-- encore saisie. Pour ces semaines-là on estime les heures (horaire hebdo cible,
-- à défaut contractuel, au prorata de la période de contrat).
--
-- L'estimation dépend de la date du jour : elle ne peut donc pas être figée à la
-- synchro. On mémorise seulement QUELLES semaines ont un planning ; le calcul se
-- fait à l'affichage, toujours à jour.
-- =============================================================

create table if not exists ana_semaines_planifiees (
  contrat_id uuid not null references ana_contrats(id) on delete cascade,
  semaine    date not null,            -- lundi de la semaine ISO
  synced_at  timestamptz default now(),
  primary key (contrat_id, semaine)
);
create index if not exists idx_ana_sem_plan_semaine on ana_semaines_planifiees (semaine);

alter table ana_semaines_planifiees enable row level security;
create policy "auth read ana_semaines_planifiees"
  on ana_semaines_planifiees for select using (auth.role() = 'authenticated');
create policy "auth manage ana_semaines_planifiees"
  on ana_semaines_planifiees for all using (auth.role() = 'authenticated');
grant select, insert, update, delete on table ana_semaines_planifiees to authenticated;

select pg_notify('pgrst', 'reload schema');
