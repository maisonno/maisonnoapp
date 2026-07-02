# Base de données (préfixe `ana_`)

Migration : `supabase/migrations/0012_analyse-services.sql` (à exécuter dans le
SQL Editor Supabase). Toutes les tables sont en **RLS** + **GRANTs** pour le rôle
`authenticated` (cf. migration 0011 pour le pourquoi des GRANTs).

## Tables

### `ana_tickets` — 1 ligne = 1 ticket (feuille `SalesDocument`)
| Colonne | Type | Note |
|---|---|---|
| `ticket_id` | text PK | « ID Ticket » |
| `jour` | date NOT NULL | « Jour » |
| `heure` | smallint | « Heure » 0-23 (0 si absent) |
| `couverts` | numeric | « Couverts » (0 hors service à table) |
| `total_ttc` / `total_ht` | numeric | informatif, recalculé par la vue |
| `tag_split` | text | « TAG_Split » (non utilisé) |
| `etablissement` | text | |
| `source_file`, `imported_at` | | traçabilité |

Index : `idx_ana_tickets_jour`.

### `ana_lines` — 1 ligne = 1 produit vendu (feuille `SalesDocumentLines`)
| Colonne | Type | Note |
|---|---|---|
| `line_id` | text PK | « ID » (id unique de la ligne) |
| `ticket_id` | text NOT NULL → `ana_tickets` ON DELETE CASCADE | |
| `jour` | date NOT NULL | redondant, pratique pour filtrer |
| `nom` | text | « Nom » |
| `qte` | numeric | « Qte » |
| `prix_ht` | numeric | « Prix HT » (TOTAL ligne, net de remise, 0 si offert) |
| `taux` | numeric | TVA en décimal (normalisée : "10%"/10/0.1 → 0.10) |
| `categorie` | text | « TAG_Catégorie » |
| `type_produit` | text | « TAG_TypeProduit » |
| `offert` | boolean | « TAG_Offered » = 'OUI' |
| `offerts_ht` | numeric | « Offerts HT » |
| `source_file`, `imported_at` | | |

Index : `idx_ana_lines_ticket`, `idx_ana_lines_jour`.

### `ana_poire_daily` — cash comptoir agrégé au jour
| Colonne | Type | Note |
|---|---|---|
| `jour` | date PK | |
| `montant_ttc` | numeric NOT NULL | TTC |
| `tag` | text | ex. « Karaoké », « Bal » |
| `source_file`, `imported_at` | | |

### `ana_category_map` — mapping catégorie → poste
`categorie` (PK) → `bucket` ∈ {entree, plat, dessert, boisson, autre}. Seedé par la
migration, éditable en SQL sans redéploiement.

### `ana_labor` — coûts salariaux (export Combo), anonymisé
Migration `0013_labor.sql`. 1 ligne = 1 salarié × 1 mois de paie.
| Colonne | Type | Note |
|---|---|---|
| `periode` | date | 1er jour du mois de paie (PK avec `employe_hash`) |
| `employe_hash` | text | hash anonyme (Nom+Prénom+contrat) — **aucun nom stocké** |
| `poste`, `contrat` | text | non nominatifs |
| `salaire_base` | numeric | « Salaire de base » (brut mensuel de base) |
| `heures_contrat_mensuel`, `heures_travaillees`, `jours_travailles` | numeric | |
| `h_supp_10/20/50`, `h_nuit`, `h_feries`, `h_1er_mai` | numeric | heures de coût (à valoriser) |
| `conges_payes_j` | numeric | congés payés (jours) |
| `source_file`, `imported_at` | | |

PK `(periode, employe_hash)` → ré-importer un mois ne crée pas de doublon. Le
calcul du brut/chargé est fait en TypeScript (`analytics.ts`), pas en base.

### `ana_import_log` — journal des imports
`id`, `kind` ('ventes'|'poire'|'combo'), `file_name`, `rows_in`, `tickets_upserted`,
`lines_upserted`, `poire_upserted`, `labor_upserted`, `created_at`.

## Fonction `ana_f_bucket(categorie, nom)`
Réplique de `bucket()` du HTML : cherche d'abord dans `ana_category_map`, sinon
rattrapage par nom (`plat|frite`→plat, `affogato`→dessert, `alcool|soft|vin`→boisson,
sinon `autre`).

## Vue `ana_v_ticket_metrics`
Pour chaque ticket (sur les lignes **non offertes**) :
- `ht`, `ttc` (= Σ `prix_ht·(1+taux)`) ;
- comptes `n_entree/n_plat/n_dessert/n_boisson` et `n_plat_offert` ;
- revenus par bucket en TTC et HT (`ttc_*`, `ht_*`, dont `*_autre`) ;
- `type` = `resto` (n_plat>0 ou n_entree>0) · `dessert` (n_dessert>0) · `bar`.

`WHERE` exclut les tickets **100 % offerts** (aucun revenu ni item payant).

## Idempotence
Les PK sont les **identifiants naturels** L'Addition. L'import fait des `upsert`
(`on conflict`), donc ré-importer un export chevauchant ne crée aucun doublon.
Pour la Poire, plusieurs lignes d'un même jour dans un fichier sont **sommées**
avant upsert.
