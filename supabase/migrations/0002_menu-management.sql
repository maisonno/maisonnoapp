-- =============================================================
-- Projet : Gestion des Menus — La Pomme d'Adam (préfixe : mnu_)
-- =============================================================

-- ------------------------------------------------------------
-- Table : catalogue de plats
-- ------------------------------------------------------------
create table if not exists mnu_dishes (
  id          uuid        default gen_random_uuid() primary key,
  name        text        not null,
  description text,
  price       numeric(6,2),
  category    text        not null
              check (category in ('entree','a_partager','plat','pizza','salade','dessert','glace')),
  is_active   boolean     not null default true,
  sort_order  integer     not null default 0,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

alter table mnu_dishes enable row level security;

create policy "auth read mnu_dishes"
  on mnu_dishes for select
  using (auth.role() = 'authenticated');

create policy "auth manage mnu_dishes"
  on mnu_dishes for all
  using (auth.role() = 'authenticated');

create trigger mnu_dishes_updated_at
  before update on mnu_dishes
  for each row execute procedure update_updated_at();

-- ------------------------------------------------------------
-- Table : menus (en-têtes)
-- ------------------------------------------------------------
create table if not exists mnu_menus (
  id          uuid        default gen_random_uuid() primary key,
  label       text        not null,
  menu_date   date        not null,
  notes       text,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

alter table mnu_menus enable row level security;

create policy "auth read mnu_menus"
  on mnu_menus for select
  using (auth.role() = 'authenticated');

create policy "auth manage mnu_menus"
  on mnu_menus for all
  using (auth.role() = 'authenticated');

create trigger mnu_menus_updated_at
  before update on mnu_menus
  for each row execute procedure update_updated_at();

-- ------------------------------------------------------------
-- Table : plats assignés à un menu
-- position est l'ordre DANS la catégorie (pas global)
-- ------------------------------------------------------------
create table if not exists mnu_menu_items (
  id          uuid        default gen_random_uuid() primary key,
  menu_id     uuid        not null references mnu_menus(id) on delete cascade,
  dish_id     uuid        not null references mnu_dishes(id) on delete restrict,
  position    integer     not null default 0,
  is_featured boolean     not null default false,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now(),
  unique(menu_id, dish_id)
);

alter table mnu_menu_items enable row level security;

create policy "auth read mnu_menu_items"
  on mnu_menu_items for select
  using (auth.role() = 'authenticated');

create policy "auth manage mnu_menu_items"
  on mnu_menu_items for all
  using (auth.role() = 'authenticated');

create trigger mnu_menu_items_updated_at
  before update on mnu_menu_items
  for each row execute procedure update_updated_at();

-- Index utile pour les requêtes par menu
create index if not exists mnu_menu_items_menu_id_idx on mnu_menu_items(menu_id);

-- ------------------------------------------------------------
-- Table : suivi des documents générés (DOCX + PDF, TTL 48h)
-- ------------------------------------------------------------
create table if not exists mnu_generated_docs (
  id            uuid        default gen_random_uuid() primary key,
  menu_id       uuid        not null references mnu_menus(id) on delete cascade,
  template_name text        not null,  -- 'menu-table' | 'affiche-facade' | 'grande-affiche'
  docx_path     text,                  -- Supabase Storage path (.docx)
  pdf_path      text,                  -- Supabase Storage path (.pdf)
  expires_at    timestamptz not null default (now() + interval '48 hours'),
  created_at    timestamptz default now()
);

alter table mnu_generated_docs enable row level security;

create policy "auth read mnu_generated_docs"
  on mnu_generated_docs for select
  using (auth.role() = 'authenticated');

create policy "auth manage mnu_generated_docs"
  on mnu_generated_docs for all
  using (auth.role() = 'authenticated');

create index if not exists mnu_generated_docs_menu_id_idx on mnu_generated_docs(menu_id);
create index if not exists mnu_generated_docs_expires_at_idx on mnu_generated_docs(expires_at);

-- ------------------------------------------------------------
-- Référencer le projet dans le dashboard
-- ------------------------------------------------------------
insert into projects (title, slug, description, tags, status, url, sort_order)
values (
  'Gestion des Menus',
  'menu-management',
  'Gérer la liste des plats et permettre l''édition des menus — La Pomme d''Adam.',
  array['Next.js', 'Supabase', 'Gotenberg'],
  'wip',
  '/projects/menu-management',
  20
);
