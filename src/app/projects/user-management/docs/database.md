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
| `admins read all profiles` | SELECT | Le user courant est admin |

Les écritures (`INSERT`, `UPDATE`) passent par le **service role** (admin client) — elles contournent la RLS.

## Trigger `on_auth_user_created`

Crée automatiquement un profil `usr_profiles` avec `role = 'user'` à chaque nouvel utilisateur Supabase Auth.

## Note : profil admin initial

Après migration, créer manuellement le profil du compte admin existant :

```sql
insert into usr_profiles (id, first_name, last_name, role, app_access)
values ('TON-UUID', 'Prénom', 'Nom', 'admin', '{}')
on conflict (id) do nothing;
```
