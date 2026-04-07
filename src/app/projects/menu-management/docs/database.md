# Gestion des Menus — Base de données

## Préfixe : `mnu_`

## Tables

### `mnu_dishes` — Catalogue de plats

| Colonne | Type | Description |
|---------|------|-------------|
| `id` | uuid PK | Identifiant |
| `name` | text NOT NULL | Nom du plat |
| `description` | text | Description (optionnelle) |
| `price` | numeric(6,2) | Prix en € (optionnel) |
| `category` | text NOT NULL | Catégorie (voir enum) |
| `is_active` | boolean DEFAULT true | Au menu oui/non |
| `sort_order` | integer DEFAULT 0 | Ordre dans le catalogue |
| `created_at` | timestamptz | Création |
| `updated_at` | timestamptz | Dernière modification (auto) |

**Catégories** (check constraint) : `entree`, `a_partager`, `plat`, `pizza`, `salade`, `dessert`, `glace`

### `mnu_menus` — Menus

| Colonne | Type | Description |
|---------|------|-------------|
| `id` | uuid PK | Identifiant |
| `label` | text NOT NULL | Libellé (ex. "Menu du midi") |
| `menu_date` | date NOT NULL | Date du menu |
| `notes` | text | Notes internes |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

### `mnu_menu_items` — Plats d'un menu

| Colonne | Type | Description |
|---------|------|-------------|
| `id` | uuid PK | |
| `menu_id` | uuid FK → mnu_menus.id | CASCADE DELETE |
| `dish_id` | uuid FK → mnu_dishes.id | RESTRICT (ne peut pas supprimer un plat utilisé) |
| `position` | integer DEFAULT 0 | Ordre **dans la catégorie** (pas global) |
| `is_featured` | boolean DEFAULT false | Mis en avant dans les documents |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

**Contrainte unique** : `(menu_id, dish_id)` — un plat ne peut apparaître qu'une fois par menu.

**Tri côté app** : `ORDER BY CATEGORY_ORDER index, position`  
Le tri par catégorie est géré applicativement via `CATEGORY_ORDER` dans `lib/types.ts`.

### `mnu_generated_docs` — Documents générés

| Colonne | Type | Description |
|---------|------|-------------|
| `id` | uuid PK | |
| `menu_id` | uuid FK → mnu_menus.id | CASCADE DELETE |
| `template_name` | text | `menu-table` \| `affiche-facade` \| `grande-affiche` |
| `docx_path` | text | URL signée Supabase Storage (.docx) |
| `pdf_path` | text | URL signée Supabase Storage (.pdf) |
| `expires_at` | timestamptz DEFAULT now()+48h | TTL |
| `created_at` | timestamptz | |

## RLS (Row Level Security)

Toutes les tables : accès read/write réservé aux utilisateurs authentifiés.
```sql
using (auth.role() = 'authenticated')
```

## Supabase Storage

Bucket : `generated-docs` (privé)  
Structure : `{menuId}/{template}-{timestamp}.docx` et `.pdf`

**Purge automatique** : Vercel Cron quotidien (3h UTC) via `/api/cleanup-docs`  
Le cron supprime les fichiers Storage + lignes DB dont `expires_at < now()`.

## Variables d'environnement requises

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...   (cleanup cron uniquement)
GOTENBERG_URL=...               (service Docker pour conversion PDF)
CRON_SECRET=...                 (protection de la route cleanup)
```
