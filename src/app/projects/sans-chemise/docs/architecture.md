# Sans Chemise — Architecture

## Stack

Next.js 15 (App Router) · Supabase (auth + Postgres) · Tailwind.
Préfixe DB : `snc_`.

## Arborescence

```
src/app/projects/sans-chemise/
├── page.tsx                  ← Server Component : auth + fetch des données
├── actions.ts                ← Server Actions (modèles, ventes, mouvements)
├── components/
│   ├── SansChemiseApp.tsx    ← Shell client : onglets + nav mobile fixe
│   ├── SaleEntry.tsx         ← Saisie de vente (écran prioritaire) + SaleSheet
│   ├── SalesList.tsx         ← Liste des ventes + VenteEditModal
│   ├── StockView.tsx         ← Stock courant + MovementSheet + historique
│   ├── ModelesView.tsx       ← Gestion des modèles
│   └── ModeleFormModal.tsx   ← Création / édition d'un modèle
├── lib/
│   ├── constants.ts          ← TAILLES, VARIANTES, tri des tailles
│   ├── types.ts              ← Types locaux
│   └── queries.ts            ← Lectures Supabase (server-only)
└── docs/
```

## Flux de données

- **`page.tsx`** (Server Component) vérifie l'auth puis charge en parallèle :
  modèles+stock, modèles bruts, articles+stock, ventes, mouvements. Tout est
  passé en props à `SansChemiseApp`.
- **`SansChemiseApp`** est un Client Component qui gère l'onglet courant
  (`useState`) et la barre de navigation fixe en bas.
- Les **mutations** passent par les Server Actions de `actions.ts`. Après succès,
  les composants appellent `router.refresh()` (pas de full reload) : le Server
  Component re-fetch et renvoie les nouvelles props, l'état client (onglet) est
  conservé. La saisie de vente affiche en plus un toast de confirmation.

## Choix d'ergonomie mobile

- **Onglet « Vendre » par défaut** : priorité à la saisie de vente.
- **Bottom sheets** (`SaleSheet`, `MovementSheet`, modales) ancrées en bas
  d'écran sur mobile (`items-end`), centrées sur desktop.
- **Parcours de vente en ~3 touches** : modèle → taille → valider. La variante
  est masquée si le modèle n'en a qu'une ; la quantité vaut 1 par défaut ;
  la date est repliée sur « aujourd'hui ».
- **Stock par couleur** : rouge si ≤ 0, ambre si ≤ 3.

## Génération des articles

Un modèle décrit ses `variantes[]` et `tailles[]`. À la création/édition,
`syncArticles()` (dans `actions.ts`) matérialise le produit cartésien dans
`snc_articles` : il crée les combinaisons manquantes, réactive celles qui
reviennent et **désactive** (sans supprimer) celles retirées, pour préserver
l'historique des ventes qui pointent vers ces articles.
