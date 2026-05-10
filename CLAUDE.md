# maisonnoapp — Le Lounge

Espace personnel pour héberger des mini-projets et expérimentations.  
Stack : **Next.js 15** (App Router) · **Supabase** (auth + DB) · **Vercel** (deploy)

---

## Architecture globale

```
maisonnoapp/
├── src/
│   ├── app/
│   │   ├── page.tsx              ← Dashboard principal (liste des projets)
│   │   ├── layout.tsx            ← Layout racine (fonts, metadata)
│   │   ├── actions.ts            ← Server Actions globales (login/logout)
│   │   ├── globals.css           ← Styles globaux + classes tiki
│   │   ├── login/
│   │   │   └── page.tsx
│   │   └── projects/
│   │       └── [slug]/           ← Un dossier par projet
│   │           ├── page.tsx
│   │           ├── components/
│   │           └── lib/
│   ├── components/               ← Composants partagés
│   │   ├── ProjectCard.tsx
│   │   ├── TikiHeader.tsx
│   │   └── TikiFace.tsx
│   ├── lib/
│   │   └── supabase/
│   │       ├── client.ts         ← Client browser
│   │       └── server.ts         ← Client server (SSR)
│   └── middleware.ts             ← Auth guard (redirige vers /login)
├── supabase/
│   └── migrations/
│       └── 0001_init.sql         ← Table `projects` + RLS
└── .env.local                    ← Variables d'env (ne pas commiter)
```

---

## Ajouter un nouveau projet

### 1. Créer le dossier de l'app

Chaque projet vit dans `src/app/projects/[slug]/`.

```
src/app/projects/mon-projet/
├── page.tsx          ← Page principale (Server Component)
├── actions.ts        ← Server Actions spécifiques au projet (optionnel)
├── components/       ← Composants UI propres au projet
├── lib/              ← Logique métier, helpers, types
└── docs/             ← Documentation du projet (voir section Documentation)
```

La route sera automatiquement disponible à `/projects/mon-projet`.

### 2. Choisir un préfixe de base de données

Chaque projet utilise un préfixe court (2–4 lettres) pour nommer ses tables Supabase.  
Cela évite les collisions et permet d'identifier l'origine d'une table au premier coup d'œil.

| Projet | Préfixe | Exemple de tables |
|--------|---------|-------------------|
| budget-tracker | `bdg_` | `bdg_expenses`, `bdg_categories` |
| link-saver | `lnk_` | `lnk_links`, `lnk_tags` |
| habit-tracker | `hbt_` | `hbt_habits`, `hbt_entries` |
| notes | `nts_` | `nts_notes`, `nts_folders` |
| menu-management | `mnu_` | `mnu_dishes`, `mnu_menus`, `mnu_menu_items`, `mnu_generated_docs` |
| user-management | `usr_` | `usr_profiles` |
| scoubidoo | `scd_` | _(à définir)_ |

**Règle :** choisir un préfixe qui n'est pas encore utilisé. Le tenir à jour dans ce tableau.

### 3. Créer la migration SQL

Ajouter un fichier dans `supabase/migrations/` :

```
supabase/migrations/
  0001_init.sql
  0002_mon-projet.sql    ← nouveau fichier
```

Template de migration :

```sql
-- =============================================================
-- Projet : Mon Projet (préfixe : mpj_)
-- =============================================================

create table if not exists mpj_items (
  id          uuid        default gen_random_uuid() primary key,
  title       text        not null,
  -- ... tes colonnes
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- RLS : accès réservé aux utilisateurs authentifiés
alter table mpj_items enable row level security;

create policy "auth read mpj_items"
  on mpj_items for select
  using (auth.role() = 'authenticated');

create policy "auth manage mpj_items"
  on mpj_items for all
  using (auth.role() = 'authenticated');

-- Trigger updated_at (la fonction existe déjà depuis 0001_init.sql)
create trigger mpj_items_updated_at
  before update on mpj_items
  for each row execute procedure update_updated_at();
```

Exécuter dans le **SQL Editor** du dashboard Supabase.

### 4. Référencer le projet dans la table `projects`

```sql
insert into projects (title, slug, description, tags, status, url, sort_order)
values (
  'Mon Projet',
  'mon-projet',
  'Description courte du projet.',
  array['Next.js', 'Supabase'],
  'wip',              -- 'idea' | 'wip' | 'live' | 'archived'
  '/projects/mon-projet',
  10                  -- ordre d'affichage sur le dashboard
);
```

### 5. Créer le client Supabase dans le projet (si besoin)

Pour les Server Components, utiliser le client partagé :

```typescript
import { createClient } from '@/lib/supabase/server'

const supabase = await createClient()
const { data } = await supabase.from('mpj_items').select('*')
```

Pour les Client Components :

```typescript
import { createClient } from '@/lib/supabase/client'

const supabase = createClient()
```

---

## Documentation

**À chaque évolution d'un projet, Claude doit maintenir la documentation à jour.**

La documentation de chaque mini-projet est enregistrée dans des fichiers `.md` organisés par module ou thème, dans le dossier `docs/` du projet concerné.

```
src/app/projects/mon-projet/docs/
├── overview.md         ← Vue d'ensemble fonctionnelle (quoi, pourquoi, pour qui)
├── architecture.md     ← Choix techniques, structure des composants, flux de données
├── database.md         ← Schéma des tables, relations, politiques RLS
├── api.md              ← Server Actions et routes API exposées
└── changelog.md        ← Historique des évolutions significatives
```

**Règles :**
- Créer le dossier `docs/` dès la création du projet, avec au minimum `overview.md`
- Mettre à jour le fichier concerné **dans le même commit** que le code qu'il documente
- Un fichier par thème — ne pas tout mettre dans un seul fichier monolithique
- La documentation doit être suffisamment précise pour qu'un développeur reprenne le projet sans avoir à lire tout le code

---

## Conventions de code

- **Server Components par défaut** — ajouter `'use client'` uniquement si nécessaire (formulaires interactifs, hooks React)
- **Server Actions** pour les mutations — créer un `actions.ts` dans le dossier du projet
- **Types inline** — définir les types localement dans le projet, pas de types globaux partagés sauf si vraiment réutilisés
- **Pas de `any`** — TypeScript strict activé

---

## Variables d'environnement

```bash
# .env.local (jamais commité)
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbG...
```

Les clés se trouvent dans **Supabase → Settings → API**.  
Les mêmes variables doivent être ajoutées dans **Vercel → Project → Settings → Environment Variables**.

---

## Commandes utiles

```bash
npm run dev        # Serveur local sur http://localhost:3000
npm run build      # Build de production
npm run lint       # Vérification ESLint
```

---

## Auth

L'accès à toutes les routes (sauf `/login`) est protégé par le middleware Supabase.  
Pas d'inscription publique — les comptes se créent manuellement dans **Supabase → Authentication → Users**.

---

## Deploy

Chaque push sur `main` déclenche un deploy automatique sur Vercel.  
Les branches créent des preview deployments.
