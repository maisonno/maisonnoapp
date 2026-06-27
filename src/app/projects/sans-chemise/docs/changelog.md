# Sans Chemise — Changelog

## 2026-06-27 — Prix par variante éditables depuis les modèles

- Le prix est désormais géré **par variante**, stocké dans
  `snc_modeles.prix_variantes` (jsonb). Migration
  `0016_sans-chemise-prix-variantes.sql` (remplace `0015` ; retire
  `snc_articles.prix`).
- Le formulaire de modèle affiche un champ **prix par variante** (pré-rempli
  d'un tarif indicatif quand on coche une variante).
- La liste des modèles affiche le prix de chaque variante.
- La saisie de vente pré-remplit le prix de la variante choisie
  (`prix_variantes[variante] ?? prix`).

## 2026-06-27 — Prix par variante + ajustement rapide du stock

- Boutons « + » (vert) / « − » (rouge) par ligne dans l'onglet Stock :
  enregistrement d'un mouvement de ±1 avec mise à jour optimiste.
- Prix par article (`snc_articles.prix`, par variante) — migration
  `0015_sans-chemise-prix.sql`. La saisie de vente pré-remplit le prix de la
  variante sélectionnée (repli sur le prix du modèle).
- Tarifs appliqués : T-Shirt / T-Shirt Femme / Débardeur 29 €, Sweat 49 €,
  T-Shirt Col V 35 €, Mug 15 €. (Casquette, Gourde, Coque iPhone : à définir.)


## 2026-06-27 — Création du projet

Première version de l'app de stock & ventes Sans Chemise.

- Migration `0013_sans-chemise.sql` : tables `snc_modeles`, `snc_articles`,
  `snc_ventes`, `snc_mouvements` + vue `snc_v_stock` (stock recalculé),
  RLS + GRANTs, référencement dans `projects` (slug `sans-chemise`).
- Saisie de vente rapide (écran par défaut) : modèle → taille → valider,
  prix pré-rempli, toast de confirmation.
- Liste des ventes avec total CA, édition et suppression.
- Stock par article avec réception/retrait d'inventaire et historique des
  mouvements.
- Gestion des modèles : tailles (XS→2XL, TU) et variantes (tshirt homme/femme,
  sweat, col V, débardeur, + variantes personnalisées).
- Navigation par barre d'onglets fixe en bas, pensée pour le mobile.

### À noter
- Pour qu'un utilisateur non-admin voie l'app, ajouter `sans-chemise` à son
  `usr_profiles.app_access`.
- Le prix est défini au niveau du modèle (modifiable au moment de la vente).
  Un prix par variante pourrait être ajouté plus tard si besoin.
