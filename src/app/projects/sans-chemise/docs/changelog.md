# Sans Chemise — Changelog

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
