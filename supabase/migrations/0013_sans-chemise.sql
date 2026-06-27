-- =============================================================
-- Projet : Sans Chemise — Stock & ventes (préfixe : snc_)
-- Gestion de stock et suivi des ventes de tshirts / souvenirs
-- de la marque « Sans Chemise ». Usage principal : mobile.
-- =============================================================
-- À exécuter dans le SQL Editor du dashboard Supabase.
-- Le stock n'est PAS stocké : il est recalculé depuis le registre
-- des réceptions/retraits (snc_mouvements) et des ventes
-- (snc_ventes) via la vue snc_v_stock. Pas de dérive possible.
-- =============================================================

-- -------------------------------------------------------------
-- Modèles (un design : nom + prix de base + tailles/variantes dispo)
-- -------------------------------------------------------------
create table if not exists snc_modeles (
  id          uuid        default gen_random_uuid() primary key,
  nom         text        not null,
  prix        numeric     not null default 0,   -- prix de vente de base (€)
  variantes   text[]      not null default '{}', -- ex. {Tshirt homme, Sweat}
  tailles     text[]      not null default '{}', -- ex. {S, M, L, XL}
  actif       boolean     not null default true,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- -------------------------------------------------------------
-- Articles (déclinaison concrète : modèle × variante × taille)
-- Généré automatiquement à partir des modèles. Unité de stock.
-- -------------------------------------------------------------
create table if not exists snc_articles (
  id          uuid        default gen_random_uuid() primary key,
  modele_id   uuid        not null references snc_modeles(id) on delete cascade,
  variante    text        not null,
  taille      text        not null,
  actif       boolean     not null default true,
  created_at  timestamptz default now(),
  unique (modele_id, variante, taille)
);
create index if not exists idx_snc_articles_modele on snc_articles (modele_id);

-- -------------------------------------------------------------
-- Ventes (1 ligne = 1 vente d'un article, quantité ≥ 1)
-- -------------------------------------------------------------
create table if not exists snc_ventes (
  id            uuid        default gen_random_uuid() primary key,
  date          date        not null default current_date,
  article_id    uuid        not null references snc_articles(id) on delete restrict,
  quantite      integer     not null default 1 check (quantite > 0),
  prix_unitaire numeric     not null default 0,  -- prix appliqué au moment de la vente (€)
  notes         text,
  created_by    uuid,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);
create index if not exists idx_snc_ventes_date    on snc_ventes (date);
create index if not exists idx_snc_ventes_article on snc_ventes (article_id);

-- -------------------------------------------------------------
-- Mouvements d'inventaire (réception de colis / retrait : perte, casse…)
-- -------------------------------------------------------------
create table if not exists snc_mouvements (
  id          uuid        default gen_random_uuid() primary key,
  date        date        not null default current_date,
  article_id  uuid        not null references snc_articles(id) on delete restrict,
  quantite    integer     not null check (quantite > 0),
  sens        text        not null check (sens in ('reception','retrait')),
  motif       text,
  created_by  uuid,
  created_at  timestamptz default now()
);
create index if not exists idx_snc_mouvements_article on snc_mouvements (article_id);

-- -------------------------------------------------------------
-- Vue stock : reçu − retiré − vendu, par article
-- -------------------------------------------------------------
create or replace view snc_v_stock as
select
  a.id          as article_id,
  a.modele_id,
  a.variante,
  a.taille,
  coalesce(m.recu, 0)    as recu,
  coalesce(m.retire, 0)  as retire,
  coalesce(v.vendu, 0)   as vendu,
  coalesce(m.recu, 0) - coalesce(m.retire, 0) - coalesce(v.vendu, 0) as stock
from snc_articles a
left join (
  select article_id,
         sum(case when sens = 'reception' then quantite else 0 end) as recu,
         sum(case when sens = 'retrait'   then quantite else 0 end) as retire
  from snc_mouvements
  group by article_id
) m on m.article_id = a.id
left join (
  select article_id, sum(quantite) as vendu
  from snc_ventes
  group by article_id
) v on v.article_id = a.id;

-- -------------------------------------------------------------
-- Trigger updated_at (fonction définie en 0001_init.sql)
-- -------------------------------------------------------------
create trigger snc_modeles_updated_at
  before update on snc_modeles
  for each row execute procedure update_updated_at();

create trigger snc_ventes_updated_at
  before update on snc_ventes
  for each row execute procedure update_updated_at();

-- -------------------------------------------------------------
-- RLS : lecture/écriture réservées aux utilisateurs authentifiés
-- -------------------------------------------------------------
alter table snc_modeles    enable row level security;
alter table snc_articles   enable row level security;
alter table snc_ventes     enable row level security;
alter table snc_mouvements enable row level security;

create policy "auth read snc_modeles"      on snc_modeles    for select using (auth.role() = 'authenticated');
create policy "auth manage snc_modeles"    on snc_modeles    for all    using (auth.role() = 'authenticated');
create policy "auth read snc_articles"     on snc_articles   for select using (auth.role() = 'authenticated');
create policy "auth manage snc_articles"   on snc_articles   for all    using (auth.role() = 'authenticated');
create policy "auth read snc_ventes"       on snc_ventes     for select using (auth.role() = 'authenticated');
create policy "auth manage snc_ventes"     on snc_ventes     for all    using (auth.role() = 'authenticated');
create policy "auth read snc_mouvements"   on snc_mouvements for select using (auth.role() = 'authenticated');
create policy "auth manage snc_mouvements" on snc_mouvements for all    using (auth.role() = 'authenticated');

-- -------------------------------------------------------------
-- GRANTs explicites (Supabase Data API, cf. migration 0011)
-- -------------------------------------------------------------
grant select, insert, update, delete on table snc_modeles    to authenticated;
grant select, insert, update, delete on table snc_articles   to authenticated;
grant select, insert, update, delete on table snc_ventes     to authenticated;
grant select, insert, update, delete on table snc_mouvements to authenticated;
grant select on snc_v_stock to authenticated;

-- -------------------------------------------------------------
-- Référencement dans le dashboard maisonnoApp
-- -------------------------------------------------------------
insert into projects (title, slug, description, tags, status, url, sort_order)
values (
  'Sans Chemise',
  'sans-chemise',
  'Stock & suivi des ventes de tshirts et souvenirs de la marque Sans Chemise. Saisie rapide sur mobile.',
  array['Next.js', 'Supabase'],
  'wip',
  '/projects/sans-chemise',
  40
)
on conflict (slug) do nothing;
