-- Projects table
create table if not exists projects (
  id           uuid        default gen_random_uuid() primary key,
  title        text        not null,
  slug         text        unique not null,
  description  text,
  tags         text[]      default '{}',
  status       text        default 'idea'
                           check (status in ('idea', 'wip', 'live', 'archived')),
  url          text,
  github_url   text,
  featured     boolean     default false,
  sort_order   integer     default 0,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

-- Only authenticated users can read/write
alter table projects enable row level security;

create policy "authenticated users can read projects"
  on projects for select
  using (auth.role() = 'authenticated');

create policy "authenticated users can manage projects"
  on projects for all
  using (auth.role() = 'authenticated');

-- Auto-update updated_at
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger projects_updated_at
  before update on projects
  for each row execute procedure update_updated_at();

-- Sample data (optional — delete if you want a clean start)
insert into projects (title, slug, description, tags, status, featured, sort_order) values
  (
    'maisonnoapp',
    'maisonnoapp',
    'Cet espace même — un portail tiki pour mes projets perso.',
    array['Next.js', 'Supabase', 'Vercel'],
    'live',
    true,
    0
  );
