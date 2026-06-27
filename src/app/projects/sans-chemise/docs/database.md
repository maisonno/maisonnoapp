# Sans Chemise — Base de données

Préfixe : `snc_`. Migration : `supabase/migrations/0013_sans-chemise.sql`.
RLS activé partout, accès réservé aux utilisateurs `authenticated`
(+ GRANTs explicites, cf. migration 0011).

## Tables

### `snc_modeles`
Un design vendu sous plusieurs déclinaisons.

| Colonne | Type | Notes |
|---|---|---|
| id | uuid PK | |
| nom | text | nom du modèle |
| prix | numeric | prix de base (€) = repli ; auto = plus bas des prix de variante |
| prix_variantes | jsonb | prix par variante, ex. `{"T-Shirt":29,"Sweat":49}` |
| variantes_phares | text[] | variantes « phares » (mises en avant), ex. `{Sweat}` |
| variantes | text[] | ex. `{Tshirt homme, Sweat}` |
| tailles | text[] | ex. `{S, M, L, XL}` |
| actif | boolean | un modèle inactif n'apparaît plus à la vente |
| created_at / updated_at | timestamptz | trigger `update_updated_at` |

### `snc_articles`
Déclinaison concrète = modèle × variante × taille. **Unité de stock.**
Générée automatiquement depuis le modèle.

| Colonne | Type | Notes |
|---|---|---|
| id | uuid PK | |
| modele_id | uuid FK → snc_modeles | `on delete cascade` |
| variante | text | |
| taille | text | |
| actif | boolean | désactivé quand la combinaison est retirée du modèle |
| | | `unique (modele_id, variante, taille)` |

> Le prix est géré **par variante** sur le modèle (`prix_variantes`). Le prix
> appliqué à la vente est pré-rempli avec `prix_variantes[variante] ?? prix`
> (puis modifiable), et s'édite depuis l'écran de gestion des modèles.
> Cf. migration `0016_sans-chemise-prix-variantes.sql` (qui remplace `0015`).

### `snc_ventes`
Une ligne = une vente d'un article.

| Colonne | Type | Notes |
|---|---|---|
| id | uuid PK | |
| date | date | défaut `current_date` |
| article_id | uuid FK → snc_articles | `on delete restrict` |
| quantite | integer | `> 0` |
| prix_unitaire | numeric | prix appliqué au moment de la vente |
| notes | text | optionnel |
| created_by | uuid | id de l'utilisateur |
| created_at / updated_at | timestamptz | |

### `snc_mouvements`
Ajustements d'inventaire : réception de colis ou retrait (perte, casse…).

| Colonne | Type | Notes |
|---|---|---|
| id | uuid PK | |
| date | date | défaut `current_date` |
| article_id | uuid FK → snc_articles | `on delete restrict` |
| quantite | integer | `> 0` (toujours positif) |
| sens | text | `'reception'` (+) ou `'retrait'` (−) |
| motif | text | optionnel |
| created_by | uuid | |
| created_at | timestamptz | |

## Vue `snc_v_stock`

Source de vérité du stock — **rien n'est stocké en dur**, tout est recalculé :

```
stock = Σ réceptions − Σ retraits − Σ ventes   (par article)
```

Colonnes : `article_id, modele_id, variante, taille, recu, retire, vendu, stock`.

Conséquence : éditer/supprimer une vente ou un mouvement met automatiquement le
stock à jour, sans risque de désynchronisation.

## Relations

```
snc_modeles 1───* snc_articles 1───* snc_ventes
                              1───* snc_mouvements
snc_v_stock  ← agrège snc_articles + snc_mouvements + snc_ventes
```
