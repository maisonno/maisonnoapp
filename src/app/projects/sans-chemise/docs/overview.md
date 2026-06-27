# Sans Chemise — Vue d'ensemble

Mini-app de **gestion de stock et de suivi des ventes** des tshirts et souvenirs
de la marque *Sans Chemise*.

## Pour qui / pourquoi

Outil personnel, utilisé **principalement sur téléphone mobile** lors des ventes
(marchés, événements, comptoir). L'ergonomie privilégie la **rapidité de saisie
d'une vente** et la **réduction du nombre de clics**.

## Fonctions

1. **Saisie d'une vente** (onglet par défaut) — on touche le modèle, la taille,
   on valide. Le prix est pré-rempli depuis le modèle et reste modifiable.
2. **Liste des ventes** — historique avec total CA, édition et suppression.
3. **Stock** — stock courant par article (modèle × variante × taille),
   réception de colis (ajout) et retrait (perte, casse, cadeau…), avec
   historique des mouvements.
4. **Modèles** — création/édition d'un modèle : nom, prix, sélection des tailles
   (XS, S, M, L, XL, 2XL, TU) et des variantes (tshirt homme, tshirt femme,
   sweat, col V, débardeur, ou variante personnalisée).

## Concepts

- **Modèle** : un design (ex. « Logo classique »), avec un prix de base et la
  liste des variantes/tailles déclinées.
- **Article** : déclinaison concrète = modèle × variante × taille. C'est l'unité
  de stock. Les articles sont générés automatiquement à partir du modèle.
- **Stock** : jamais stocké en dur. Recalculé en continu à partir du registre
  des réceptions/retraits et des ventes (voir `database.md`). Aucune dérive
  possible : éditer ou supprimer une vente met le stock à jour automatiquement.

## Navigation

Barre d'onglets fixe en bas de l'écran (réflexe « pouce » mobile) :
**Vendre · Ventes · Stock · Modèles**.
