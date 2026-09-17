-- =============================================================
-- Projet : Analyse des services (préfixe : ana_)
-- Shifts jour par jour + repos hebdomadaires non pris
-- =============================================================
-- À exécuter dans le SQL Editor Supabase.
--
-- POURQUOI
-- La convention HCR prévoit 2 jours de repos par semaine pour les saisonniers.
-- Les repos non pris doivent être récupérés ou payés en fin de saison. Pour les
-- compter il faut le détail JOUR PAR JOUR : `ana_heures_mois` agrège au mois et
-- `ana_semaines_planifiees` ne retient que l'existence d'un planning — ni l'un
-- ni l'autre ne sait dire combien de JOURS distincts ont été travaillés.
--
-- SOURCE
-- Aucun nouvel appel ComboHR : `/plannings` est déjà interrogé mois par mois par
-- la synchro et renvoie un enregistrement PAR SHIFT. On se contentait d'agréger
-- ces shifts puis de les jeter ; on les conserve désormais.
-- =============================================================

-- ─── 1. Les shifts, tels que Combo les renvoie ───

create table if not exists ana_shifts_jour (
  -- Identifiant Combo du shift : clé naturelle, donc clé primaire. C'est elle
  -- qui porte l'idempotence de la synchro (`on conflict (combo_shift_id)`).
  combo_shift_id text primary key,
  contrat_id     uuid not null references ana_contrats(id) on delete cascade,
  -- Jour de rattachement, en date LOCALE Europe/Paris. Un service qui finit
  -- après minuit reste rattaché à son jour de DÉBUT — c'est déjà la sémantique
  -- du champ `date` de Combo, qu'on reprend telle quelle.
  jour           date not null,
  debut          timestamptz,
  fin            timestamptz,
  -- Durée travaillée, pauses déduites (`break_duration` de Combo).
  duree_heures   numeric,
  -- Ce que l'on sait du shift, sans rien inventer :
  --   'pointe'     → début ET fin réels pointés : journée travaillée, avérée ;
  --   'planifie'   → planning sans pointage (shift à venir, ou pointage non saisi) ;
  --   'sans_duree' → durée nulle ou inexploitable : ni compté, ni « travaillé ».
  -- `/plannings` ne renvoie que des shifts de travail ; les absences et repos
  -- relèvent d'une autre ressource de l'API et ne sont PAS chargés ici.
  type           text,
  synced_at      timestamptz default now()
);

create index if not exists idx_ana_shifts_jour_contrat on ana_shifts_jour (contrat_id, jour);
create index if not exists idx_ana_shifts_jour_jour    on ana_shifts_jour (jour);

alter table ana_shifts_jour enable row level security;
create policy "auth read ana_shifts_jour"
  on ana_shifts_jour for select using (auth.role() = 'authenticated');
create policy "auth manage ana_shifts_jour"
  on ana_shifts_jour for all    using (auth.role() = 'authenticated');
grant select, insert, update, delete on table ana_shifts_jour to authenticated;

-- ─── 2. Repos hebdomadaires non pris ───
--
-- Une ligne par contrat et par semaine civile (lundi → dimanche).
-- `date_trunc('week', …)` cale sur le LUNDI en PostgreSQL ; le mois de
-- rattachement est celui du DIMANCHE, soit lundi + 6 jours — une semaine à
-- cheval sur deux mois compte donc pour le mois où elle se termine.
--
-- `security_invoker` : la vue s'exécute avec les droits de l'appelant, donc la
-- RLS de `ana_shifts_jour` s'applique vraiment (sans quoi une vue appartenant à
-- `postgres` contournerait la RLS).

create or replace view v_repos_hebdo
with (security_invoker = true) as
select
  s.contrat_id,
  date_trunc('week', s.jour)::date                            as semaine,
  date_trunc('month', date_trunc('week', s.jour)::date + 6)::date
                                                              as mois_rattachement,
  count(distinct s.jour)::int                                 as jours_travailles,
  greatest(0, count(distinct s.jour)::int - 5)::int            as repos_non_pris
from ana_shifts_jour s
-- Seuls les shifts TRAVAILLÉS entrent dans le compte.
where s.type in ('pointe', 'planifie')
  and coalesce(s.duree_heures, 0) > 0
group by s.contrat_id, date_trunc('week', s.jour);

grant select on v_repos_hebdo to authenticated;

select pg_notify('pgrst', 'reload schema');
