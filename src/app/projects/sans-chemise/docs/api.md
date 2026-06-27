# Sans Chemise — Server Actions & lectures

Toutes les mutations sont des **Server Actions** (`actions.ts`, `'use server'`).
Chacune vérifie l'authentification et renvoie `ActionState = { error?, success? }`.

## Modèles

### `createModele({ nom, prix, variantes, tailles })`
Crée un modèle puis génère ses articles via `syncArticles`.
Validation : nom requis, ≥ 1 variante, ≥ 1 taille, prix ≥ 0.

### `updateModele(id, { nom, prix, variantes, tailles })`
Met à jour le modèle et re-synchronise les articles (création des nouvelles
combinaisons, désactivation de celles retirées).

### `setModeleActif(id, actif)`
Active/désactive un modèle (le retire de la saisie de vente sans rien effacer).

### `deleteModele(id)`
Supprime un modèle (cascade sur ses articles). Échoue proprement si des ventes
référencent encore ses articles → message invitant à désactiver plutôt.

## Ventes

### `createVente({ date, article_id, quantite, prix_unitaire, notes })`
Enregistre une vente. Validation : article requis, quantité ≥ 1, prix ≥ 0.

### `updateVente(id, { ... })`
Modifie une vente (article, quantité, prix, date, notes).

### `deleteVente(id)`
Supprime une vente. Le stock se recalcule automatiquement (vue `snc_v_stock`).

## Mouvements d'inventaire

### `createMouvement({ date, article_id, quantite, sens, motif })`
`sens` ∈ `'reception' | 'retrait'`, `quantite` toujours positive.

### `deleteMouvement(id)`
Supprime un mouvement.

## Lectures (`lib/queries.ts`, server-only)

| Fonction | Usage |
|---|---|
| `getModeles()` | liste brute des modèles (onglet Modèles) |
| `getModelesWithStock()` | modèles actifs + articles + stock (saisie de vente) |
| `getArticlesWithStock()` | tous les articles actifs + stock (onglet Stock) |
| `getVentes(limit=100)` | ventes récentes dénormalisées (modèle/variante/taille) |
| `getMouvements(limit=100)` | mouvements récents dénormalisés |

Aucune route API REST exposée — tout passe par Server Components + Server Actions.
