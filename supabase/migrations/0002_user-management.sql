-- =============================================================
-- Projet : Gestion utilisateurs (préfixe : usr_)
-- =============================================================

create table if not exists usr_profiles (
  id           uuid        references auth.users(id) on delete cascade primary key,
  first_name   text,
  last_name    text,
  role         text        not null default 'user'
                           check (role in ('user', 'admin')),
  app_access   text[]      not null default '{}',
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

-- RLS
alter table usr_profiles enable row level security;

-- Chaque utilisateur peut lire son propre profil (nécessaire pour le filtrage sur l'accueil)
create policy "users read own profile"
  on usr_profiles for select
  using (auth.uid() = id);

-- Les admins peuvent lire tous les profils
create policy "admins read all profiles"
  on usr_profiles for select
  using (
    exists (
      select 1 from usr_profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- Les écritures passent par le service role (admin client) — pas de policy nécessaire

-- Trigger updated_at
create trigger usr_profiles_updated_at
  before update on usr_profiles
  for each row execute procedure update_updated_at();

-- Trigger : crée automatiquement un profil à la création d'un utilisateur auth
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.usr_profiles (id, first_name, last_name, role, app_access)
  values (
    new.id,
    new.raw_user_meta_data->>'first_name',
    new.raw_user_meta_data->>'last_name',
    'user',
    '{}'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Référencer le projet dans le dashboard
insert into projects (title, slug, description, tags, status, url, sort_order)
values (
  'Gestion utilisateurs',
  'user-management',
  'Gestion des comptes et des droits d''accès aux applications.',
  array['Next.js', 'Supabase'],
  'live',
  '/projects/user-management',
  1
) on conflict (slug) do nothing;

-- ⚠️  Après avoir exécuté cette migration, crée manuellement le profil admin
-- pour ton compte existant (remplace l'UUID par le tien) :
--
-- insert into usr_profiles (id, first_name, last_name, role, app_access)
-- values ('TON-UUID-ICI', 'Prénom', 'Nom', 'admin', '{}')
-- on conflict (id) do nothing;
--
-- Tu trouveras ton UUID dans Supabase → Authentication → Users.
