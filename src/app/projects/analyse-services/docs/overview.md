# Analyse des services — Vue d'ensemble

## Quoi
Mini-app maisonnoApp qui analyse l'activité de **La Pomme d'Adam** (bar-restaurant
saisonnier, Île du Levant) à partir :

- des **exports L'Addition** (logiciel de caisse, fichiers `.xlsx`) ;
- de la **Poire** : un revenu cash comptoir hors caisse, saisi au jour
  (CSV de l'appli *Scoubidoo* pour 2026, `.xlsx` pour 2024-2025).

Elle remplace un outil HTML mono-fichier qui re-parsait les fichiers à chaque
session : ici les données sont **stockées dans Supabase** et l'import est
**incrémental et idempotent**.

## Pourquoi
- Conserver l'historique sans avoir à recharger les fichiers à chaque fois.
- Importer uniquement les nouvelles données (upsert sur clés naturelles).
- Garder le même tableau de bord validé sur données réelles.

## Pour qui
Usage interne (accès privé maisonnoApp, auth Supabase partagée). Un seul
établissement pour l'instant.

## Pages
- **`/projects/analyse-services`** — tableau de bord (vue d'ensemble, KPIs salle,
  midi vs soir, répartition du revenu, comparaison annuelle, jour par jour).
- **`/projects/analyse-services/import`** — dépôt multi-fichiers, détection
  automatique du type, barre de progression, journal des imports.

## Règles métier clés
- **Buckets** : entrée / plat / dessert / boisson / autre (mapping `ana_category_map`
  + rattrapage par nom dans `ana_f_bucket`).
- **Offerts exclus** du chiffre et des comptes ; tickets 100 % offerts ignorés.
- **Type de ticket** : `resto` (≥1 plat ou entrée) · `dessert` (dessert seul) · `bar`.
- **Service soir = de cutoff (17 h par défaut) à 5 h** : les ardoises fermées après
  minuit comptent dans le soir.
- **Poire** : cash au jour, ajouté au bar et au total, non ventilé midi/soir ;
  **non soumise à la TVA** → même montant en TTC et en HT.
- **Comparaison annuelle** : même fenêtre calendaire (MM-JJ) rejouée sur chaque année.

Voir `architecture.md`, `database.md`, `api.md` pour le détail.
