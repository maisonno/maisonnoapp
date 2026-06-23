# Architecture

## Stack
- **Next.js 15** (App Router, TypeScript strict), déployé sur Vercel.
- **Supabase** (Postgres + Auth + RLS), clients partagés `@/lib/supabase/*`.
- **SheetJS (`xlsx`)** pour le parsing tableur, côté client.
- Préfixe DB du projet : **`ana_`**.

## Principe : source de vérité = la vue SQL, présentation = TypeScript
On suit l'**option A** de la spec :

1. Les fichiers sont parsés et stockés bruts (`ana_tickets`, `ana_lines`,
   `ana_poire_daily`).
2. La vue **`ana_v_ticket_metrics`** agrège les lignes **non offertes** par ticket,
   dérive le **type** (resto/dessert/bar) et **exclut les tickets 100 % offerts**.
   C'est le cœur du calcul.
3. Le tableau de bord charge cette vue + la Poire, puis applique en TS
   (`lib/analytics.ts`) : split midi/soir, KPIs, répartition, agrégat jour,
   comparaison annuelle. Portage fidèle des fonctions `compute()`, `mergeRes()`,
   `yearStats()` du HTML d'origine.

## Structure des fichiers
```
analyse-services/
├── layout.tsx            ← scope le design « Pomme d'Adam » (.ana-scope) + police Bricolage
├── analyse.css           ← tokens & classes portés du HTML, scopés sous .ana-scope
├── page.tsx              ← tableau de bord (Server Component : auth + chargement)
├── import/page.tsx       ← page d'import (Server Component : auth + journal)
├── components/
│   ├── Dashboard.tsx     ← 'use client' : contrôles + rendu des sections
│   └── ImportClient.tsx  ← 'use client' : parsing + upserts par lots + progression
├── lib/
│   ├── types.ts          ← types locaux
│   ├── format.ts         ← helpers fr-FR (EUR, PCT, dates…)
│   ├── analytics.ts      ← logique métier pure (compute / mergeRes / yearStats)
│   ├── parsers.ts        ← parsing SheetJS/CSV → lignes prêtes à upsert
│   └── queries.ts        ← chargement serveur paginé (vue + Poire + journal)
└── docs/
```

## Flux de données
### Import (`/import`, client)
1. Lecture fichier (texte pour `.csv`, ArrayBuffer pour `.xlsx`).
2. Détection du type (`detectWorkbookKind`) : feuilles `SalesDocument(+Lines)` →
   ventes ; sinon colonne « Poire » → poire.
3. Parsing → lignes typées. Pour les ventes, l'ensemble des tickets est l'**union**
   des tickets de `SalesDocument` et de ceux référencés par les lignes (un ticket
   manquant est synthétisé avec couverts 0 / heure 0) pour garantir l'intégrité FK
   et reproduire le comptage du HTML.
4. **Upsert par lots de 500** via le client **browser** (clé `anon` + session, RLS) :
   `ana_tickets` (onConflict `ticket_id`) **avant** `ana_lines` (onConflict `line_id`) ;
   `ana_poire_daily` (onConflict `jour`). Barre de progression.
5. Écriture dans `ana_import_log`, puis `router.refresh()`.

> Le parsing + l'insert sont côté client volontairement : un export historique fait
> ~88 000 lignes, au-delà de la limite de taille des Server Actions. La
> `service_role` n'est jamais exposée.

### Tableau de bord (`/`, serveur → client)
1. `getAllTicketMetrics()` charge **toute** la vue par pages de 1000 (PostgREST),
   `getAllPoire()` charge la Poire.
2. `<Dashboard>` (client) garde tout en mémoire et recalcule instantanément à
   chaque changement de contrôle (plage, cutoff, base TTC/HT, Poire).

## Design
Le thème global de maisonnoApp est sombre ; cette app réutilise le design clair
« Pomme d'Adam » (fond `--paper`, police Bricolage Grotesque, filet tricolore).
Tout est **scopé sous `.ana-scope`** (cf. `analyse.css` + `layout.tsx`) pour ne pas
affecter le reste du site.
