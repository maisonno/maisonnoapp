# Gestion utilisateurs — Base de données

## Table `usr_profiles`

Extension de `auth.users` pour stocker les infos métier des utilisateurs.

| Colonne | Type | Description |
|---------|------|-------------|
| `id` | `uuid` | FK → `auth.users.id` (clé primaire) |
| `first_name` | `text` | Prénom |
| `last_name` | `text` | Nom |
| `role` | `text` | `'user'` ou `'admin'` |
| `app_access` | `text[]` | Liste des slugs de projets accessibles |
| `created_at` | `timestamptz` | — |
| `updated_at` | `timestamptz` | Mis à jour automatiquement par trigger |

## RLS

| Policy | Opération | Condition |
|--------|-----------|-----------|
| `users read own profile` | SELECT | `auth.uid() = id` |
| `admins read all profiles` | SELECT | `public.is_admin()` |

Les écritures (`INSERT`, `UPDATE`) passent par le **service role** (admin client) — elles contournent la RLS.

### ⚠️ Récursion RLS (corrigé en `0004_fix-usr-profiles-rls.sql`)

La politique `admins read all profiles` interrogeait initialement `usr_profiles`
dans sa propre clause `using` (`exists (select 1 from usr_profiles ...)`), ce qui
provoquait une **récursion infinie** : Postgres renvoyait
`infinite recursion detected in policy for relation "usr_profiles"` sur **toute**
lecture de la table. Conséquences :

- la page gestion des utilisateurs échouait sur le check admin → redirection vers l'accueil ;
- le filtrage des projets sur l'accueil était inopérant pour les non-admins.

**Correctif** : une fonction `public.is_admin()` en `SECURITY DEFINER` contourne le
RLS pour vérifier le rôle sans récursion. La politique l'appelle désormais.

```sql
create or replace function public.is_admin()
returns boolean language sql security definer set search_path = public stable as $$
  select exists (select 1 from usr_profiles where id = auth.uid() and role = 'admin');
$$;
```

> Note : la page `user-management` lit aussi le rôle de l'utilisateur courant via le
> **client admin** (service role), pour que le contrôle d'accès ne dépende plus du RLS.

## Trigger `on_auth_user_created`

Crée automatiquement un profil `usr_profiles` avec `role = 'user'` à chaque nouvel utilisateur Supabase Auth.

## Note : profil admin initial

Après migration, créer manuellement le profil du compte admin existant :

```sql
insert into usr_profiles (id, first_name, last_name, role, app_access)
values ('TON-UUID', 'Prénom', 'Nom', 'admin', '{}')
on conflict (id) do nothing;
```
