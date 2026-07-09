# Changelog

## 2026-07-09 — Analyse du ticket moyen
- Nouveau bloc : distribution des tickets par **tranche de 5 €** (0-5, 5-10, …),
  une colonne par année, bascule **Nombre de tickets / CA**, + ligne ticket moyen.
  Calcul 100 % client (aucun SQL).

## 2026-07-09 — Indicateurs mensuels : paniers midi/soir + pinsa
- Tableau « Par mois » : ajout de **panier moyen midi**, **panier moyen soir**
  (CA resto ÷ couverts par service) et **Nb pinsa**.
- Pinsa comptées par **catégorie « Pinsa »** (inclut demi/petites, chacune = 1)
  via une vue mensuelle légère `ana_v_pinsa_monthly` (migration `0014`).

## 2026-07-02 — Import masse salariale (Combo)
- Nouvelle table **`ana_labor`** (migration `0013`) : 1 salarié × 1 mois, issue de
  l'onglet « Synthèse » de l'export comptable Combo. **Anonymisé** : les noms ne
  sont jamais stockés (hash Nom+Prénom côté client), on ne garde que poste,
  contrat, salaire de base et les heures de coût (supp 10/20/50 %, nuit, fériés,
  1er mai, congés payés). Dédoublonnage par (période, hash).
- Import : détection auto de l'export Combo, période dérivée des dates EVP (repli
  nom de fichier), upserts idempotents.
- **Affichage** : section « Coûts salariaux » (coût brut/chargé période, % masse
  salariale / CA, coût chargé / jour ouvert, tableau par mois) + colonne masse
  salariale au jour par jour. Taux de charges patronales éditable (défaut 42 %).
- **Estimation du brut** (règles validées) : salaire de base + heures supp hors
  contrat (×1,10/1,20/1,50) + fériés & 1er mai (+100 %) + 6ème jour (base ÷ 6,
  « 6 jours payés 7 ») + provision congés payés +10 % ; pas de majoration de nuit
  (CHR). Le coût mensuel est réparti sur les jours d'ouverture du mois.

## 2026-07-02 — Jours d'ouverture & tableau mensuel
- **Jours d'ouverture pondérés** : un service (midi/soir) est ouvert un jour donné
  s'il a ≥ 5 tickets ; midi seul = 0,25 j, soir seul = 0,75 j, les deux = 1 j.
  Nouveaux KPIs : jours ouverts, CA moyen / jour ouvert, couverts / jour ouvert.
- **Tableau par mois** : pivot année × mois avec sélecteur d'indicateur (CA total /
  resto / bar, couverts, tickets, CA & couverts par jour ouvert, % desserts,
  % entrées). Indépendant de la plage de dates.

## 2026-07-02 — Corrections post-import
- **Poire non soumise à la TVA** : son montant est désormais identique en TTC et
  en HT (plus de conversion ÷ TVA) ; sélecteur « TVA Poire » retiré.
- **Perf** : vue `ana_v_ticket_metrics` réécrite en JOIN puis **matérialisée**
  (rafraîchie par `ana_refresh_metrics()` après import) — le tableau de bord ne
  recalculait plus 99k lignes à chaque page.
- Robustesse : les lectures Supabase n'émettent plus d'exception serveur en cas
  d'erreur (log + état vide).

## 2026-06-23 — Création initiale
- Portage de l'outil HTML « Analyse des services » en mini-app maisonnoApp.
- Migration `0012_analyse-services.sql` : tables `ana_tickets`, `ana_lines`,
  `ana_poire_daily`, `ana_category_map`, `ana_import_log` ; fonction `ana_f_bucket` ;
  vue `ana_v_ticket_metrics` ; RLS + GRANTs ; référencement dans `projects`.
- Page d'import (`/import`) : dépôt multi-fichiers, détection auto du type
  (L'Addition `.xlsx` / Poire `.csv` Scoubidoo ou `.xlsx`), upserts idempotents par
  lots avec barre de progression, journal des imports.
- `lib/analytics.ts` : portage fidèle de `compute` / `mergeRes` / `yearStats`.
- Tableau de bord (`/`) : vue d'ensemble, KPIs salle, midi vs soir, répartition,
  comparaison annuelle, jour par jour — design « Pomme d'Adam » scopé.
