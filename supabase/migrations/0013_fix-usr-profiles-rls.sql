-- =============================================================
-- Correctif : récursion infinie dans les politiques RLS de usr_profiles
-- =============================================================
--
-- L'ancienne politique "admins read all profiles" interrogeait usr_profiles
-- à l'intérieur d'une politique SUR usr_profiles → récursion infinie.
-- Postgres renvoyait "infinite recursion detected in policy for relation
-- usr_profiles" sur TOUTE lecture de la table, ce qui cassait :
--   - la page gestion des utilisateurs (check admin échoue → redirige)
--   - le filtrage des projets sur l'accueil pour les non-admins
--
-- Solution standard : une fonction SECURITY DEFINER qui contourne le RLS
-- pour vérifier le rôle admin sans déclencher de récursion.

-- ------------------------------------------------------------
-- Fonction helper : l'utilisateur courant est-il admin ?
-- SECURITY DEFINER → s'exécute avec les droits du propriétaire et
-- contourne le RLS de usr_profiles à l'intérieur de son corps.
-- ------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from usr_profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- ------------------------------------------------------------
-- Remplacement de la politique récursive
-- ------------------------------------------------------------
drop policy if exists "admins read all profiles" on usr_profiles;

create policy "admins read all profiles"
  on usr_profiles for select
  using (public.is_admin());
