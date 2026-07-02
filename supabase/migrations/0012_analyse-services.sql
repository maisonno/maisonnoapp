-- =============================================================
-- Projet : Analyse des services (préfixe : ana_)
-- La Pomme d'Adam — analyse des exports L'Addition + Poire
-- =============================================================
-- À exécuter dans le SQL Editor du dashboard Supabase.
-- Toutes les tables sont en RLS + GRANTs pour les utilisateurs
-- authentifiés (cf. migration 0011 pour le pourquoi des GRANTs).
-- =============================================================

-- -------------------------------------------------------------
-- 4.1 Tables de stockage brut
-- -------------------------------------------------------------

-- Tickets (1 ligne = 1 ticket de caisse) — feuille "SalesDocument"
create table if not exists ana_tickets (
  ticket_id     text primary key,            -- "ID Ticket"
  jour          date not null,               -- "Jour"
  heure         smallint,                    -- "Heure" (0-23, heure d'ouverture)
  couverts      numeric default 0,           -- "Couverts" (souvent 0 hors service à table)
  total_ttc     numeric,
  total_ht      numeric,
  tag_split     text,                        -- "TAG_Split" (info L'Addition, non utilisée)
  etablissement text,
  source_file   text,
  imported_at   timestamptz default now()
);
create index if not exists idx_ana_tickets_jour on ana_tickets (jour);

-- Lignes de vente (1 ligne = 1 produit vendu) — feuille "SalesDocumentLines"
create table if not exists ana_lines (
  line_id       text primary key,            -- "ID" (id unique de la ligne)
  ticket_id     text not null references ana_tickets(ticket_id) on delete cascade,
  jour          date not null,               -- "Jour" (redondant mais pratique pour filtrer)
  nom           text,                        -- "Nom"
  qte           numeric default 0,           -- "Qte"
  prix_ht       numeric default 0,           -- "Prix HT" (TOTAL de la ligne, net de remise, =0 si offert)
  taux          numeric default 0,           -- taux de TVA en décimal (0.10, 0.20…)
  categorie     text,                        -- "TAG_Catégorie"
  type_produit  text,                        -- "TAG_TypeProduit"
  offert        boolean default false,       -- "TAG_Offered" = 'OUI'
  offerts_ht    numeric default 0,           -- "Offerts HT"
  source_file   text,
  imported_at   timestamptz default now()
);
create index if not exists idx_ana_lines_ticket on ana_lines (ticket_id);
create index if not exists idx_ana_lines_jour   on ana_lines (jour);

-- Poire (cash comptoir hors caisse, agrégé au jour)
create table if not exists ana_poire_daily (
  jour          date primary key,
  montant_ttc   numeric not null default 0,
  tag           text,                        -- ex. "Karaoké", "Bal" (Scoubidoo)
  source_file   text,
  imported_at   timestamptz default now()
);

-- Suivi des imports (journal)
create table if not exists ana_import_log (
  id               bigint generated always as identity primary key,
  kind             text not null,            -- 'ventes' | 'poire'
  file_name        text,
  rows_in          int,
  tickets_upserted int,
  lines_upserted   int,
  poire_upserted   int,
  created_at       timestamptz default now()
);

-- -------------------------------------------------------------
-- 4.2 Mapping des catégories → poste (entrée / plat / dessert / boisson)
-- -------------------------------------------------------------

create table if not exists ana_category_map (
  categorie text primary key,
  bucket    text not null check (bucket in ('entree','plat','dessert','boisson','autre'))
);

insert into ana_category_map (categorie, bucket) values
  ('Entrée / A partager','entree'),
  ('Plat','plat'),('Pinsa','plat'),('Salade / Poke','plat'),('Plat du jour','plat'),
  ('Dessert','dessert'),
  ('Vins','boisson'),('Soft / Eau','boisson'),('Alcool / Cocktail','boisson'),
  ('Biere','boisson'),('Bière','boisson'),('Café / Petit déj','boisson'),
  ('Bar rapide','boisson'),('Petit déj','boisson'),('Boissons resto','boisson'),('Soft','boisson')
on conflict (categorie) do nothing;

-- Fonction de bucket avec rattrapage par nom (réplique de bucket() du HTML)
create or replace function ana_f_bucket(p_categorie text, p_nom text)
returns text language sql immutable as $$
  select coalesce(
    (select bucket from ana_category_map where categorie = p_categorie),
    case
      when lower(coalesce(p_nom,'')) ~ '(plat|frite)' then 'plat'
      when lower(coalesce(p_nom,'')) ~ 'affogato'     then 'dessert'
      when lower(coalesce(p_nom,'')) ~ '(alcool|soft|vin)' then 'boisson'
      else 'autre'
    end
  );
$$;

-- -------------------------------------------------------------
-- 4.3 Vue d'enrichissement des tickets
-- Agrège les lignes NON offertes par ticket, dérive le type,
-- exclut les tickets 100 % offerts. Source de vérité du calcul.
-- -------------------------------------------------------------

-- Perf : on calcule le bucket UNE fois par ligne via un LEFT JOIN sur
-- ana_category_map (au lieu d'appeler ana_f_bucket ~15x par ligne, ce qui
-- déclenchait un statement_timeout côté PostgREST/authenticated). Sémantique
-- identique : coalesce(map, rattrapage par nom).
create or replace view ana_v_ticket_metrics as
with lb as (
  select
    l.ticket_id, l.qte, l.prix_ht, l.taux, l.offert,
    coalesce(
      cm.bucket,
      case
        when lower(coalesce(l.nom,'')) ~ '(plat|frite)'      then 'plat'
        when lower(coalesce(l.nom,'')) ~ 'affogato'          then 'dessert'
        when lower(coalesce(l.nom,'')) ~ '(alcool|soft|vin)' then 'boisson'
        else 'autre'
      end
    ) as bucket
  from ana_lines l
  left join ana_category_map cm on cm.categorie = l.categorie
),
agg as (
  select
    ticket_id,
    coalesce(sum(prix_ht)          filter (where not offert), 0) as ht,
    coalesce(sum(prix_ht*(1+taux)) filter (where not offert), 0) as ttc,
    coalesce(sum(qte) filter (where not offert and bucket='entree'),  0) as n_entree,
    coalesce(sum(qte) filter (where not offert and bucket='plat'),    0) as n_plat,
    coalesce(sum(qte) filter (where not offert and bucket='dessert'), 0) as n_dessert,
    coalesce(sum(qte) filter (where not offert and bucket='boisson'), 0) as n_boisson,
    coalesce(sum(prix_ht*(1+taux)) filter (where not offert and bucket='entree'),  0) as ttc_entree,
    coalesce(sum(prix_ht*(1+taux)) filter (where not offert and bucket='plat'),    0) as ttc_plat,
    coalesce(sum(prix_ht*(1+taux)) filter (where not offert and bucket='dessert'), 0) as ttc_dessert,
    coalesce(sum(prix_ht*(1+taux)) filter (where not offert and bucket='boisson'), 0) as ttc_boisson,
    coalesce(sum(prix_ht*(1+taux)) filter (where not offert and bucket='autre'),   0) as ttc_autre,
    coalesce(sum(prix_ht) filter (where not offert and bucket='entree'),  0) as ht_entree,
    coalesce(sum(prix_ht) filter (where not offert and bucket='plat'),    0) as ht_plat,
    coalesce(sum(prix_ht) filter (where not offert and bucket='dessert'), 0) as ht_dessert,
    coalesce(sum(prix_ht) filter (where not offert and bucket='boisson'), 0) as ht_boisson,
    coalesce(sum(prix_ht) filter (where not offert and bucket='autre'),   0) as ht_autre,
    coalesce(sum(qte) filter (where offert and bucket='plat'), 0) as n_plat_offert
  from lb
  group by ticket_id
  having count(*) filter (where not offert) > 0   -- au moins une ligne non offerte
)
select
  t.ticket_id, t.jour, t.heure, t.couverts,
  a.ht, a.ttc,
  a.n_entree, a.n_plat, a.n_dessert, a.n_boisson, a.n_plat_offert,
  a.ttc_entree, a.ttc_plat, a.ttc_dessert, a.ttc_boisson, a.ttc_autre,
  a.ht_entree,  a.ht_plat,  a.ht_dessert,  a.ht_boisson,  a.ht_autre,
  case
    when a.n_plat > 0 or a.n_entree > 0 then 'resto'
    when a.n_dessert > 0                then 'dessert'
    else 'bar'
  end as type
from ana_tickets t
join agg a on a.ticket_id = t.ticket_id
where (a.ttc > 0 or a.n_plat>0 or a.n_entree>0 or a.n_dessert>0 or a.n_boisson>0); -- exclut les 100% offerts

-- -------------------------------------------------------------
-- RLS : lecture/écriture réservées aux utilisateurs authentifiés
-- -------------------------------------------------------------

alter table ana_tickets       enable row level security;
alter table ana_lines         enable row level security;
alter table ana_poire_daily   enable row level security;
alter table ana_import_log    enable row level security;
alter table ana_category_map  enable row level security;

create policy "auth read ana_tickets"        on ana_tickets       for select using (auth.role() = 'authenticated');
create policy "auth manage ana_tickets"      on ana_tickets       for all    using (auth.role() = 'authenticated');
create policy "auth read ana_lines"          on ana_lines         for select using (auth.role() = 'authenticated');
create policy "auth manage ana_lines"        on ana_lines         for all    using (auth.role() = 'authenticated');
create policy "auth read ana_poire_daily"    on ana_poire_daily   for select using (auth.role() = 'authenticated');
create policy "auth manage ana_poire_daily"  on ana_poire_daily   for all    using (auth.role() = 'authenticated');
create policy "auth read ana_import_log"     on ana_import_log    for select using (auth.role() = 'authenticated');
create policy "auth manage ana_import_log"   on ana_import_log    for all    using (auth.role() = 'authenticated');
create policy "auth read ana_category_map"   on ana_category_map  for select using (auth.role() = 'authenticated');
create policy "auth manage ana_category_map" on ana_category_map  for all    using (auth.role() = 'authenticated');

-- -------------------------------------------------------------
-- GRANTs explicites (Supabase Data API, cf. migration 0011)
-- -------------------------------------------------------------

grant select, insert, update, delete on table ana_tickets      to authenticated;
grant select, insert, update, delete on table ana_lines        to authenticated;
grant select, insert, update, delete on table ana_poire_daily  to authenticated;
grant select, insert, update, delete on table ana_import_log   to authenticated;
grant select, insert, update, delete on table ana_category_map to authenticated;
grant select on ana_v_ticket_metrics to authenticated;

-- -------------------------------------------------------------
-- Référencement dans le dashboard maisonnoApp
-- -------------------------------------------------------------

insert into projects (title, slug, description, tags, status, url, sort_order)
values (
  'Analyse des services',
  'analyse-services',
  'Analyse des exports L''Addition + Poire de La Pomme d''Adam : restaurant / desserts / bar, midi / soir, comparaison annuelle.',
  array['Next.js', 'Supabase'],
  'wip',
  '/projects/analyse-services',
  30
)
on conflict (slug) do nothing;
