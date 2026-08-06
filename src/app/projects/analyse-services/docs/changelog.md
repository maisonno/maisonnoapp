# Changelog

## 2026-08-02 — Connecteur ComboHR Partner API (remplace l'import fichier)
- **Synchronisation** depuis `https://partner.combohr.com/api/v1` (auth Bearer) :
  `/locations`, `/contracts` (+ `/past_contracts`), `/plannings`.
- Récupère les **contrats** (nom, fonction, dates, heures hebdo et **salaire brut
  mensuel** — plus besoin de le saisir) et les **plannings** : heures
  **planifiées** et heures **réellement pointées**.
- Migration `0017` : `ana_heures_mois` (heures réelles/planifiées + équivalent
  majoration heures supp par mois), `ana_contrats.combo_contract_id`,
  `ana_params.valeur_texte`. Idempotent ; les saisies manuelles (heures cible,
  compléments Poire) sont préservées.
- Le calcul du **réalisé** et du **prévisionnel** s'appuie désormais sur Combo,
  avec repli sur l'import fichier pour les mois non couverts. Majoration des
  heures supp calculée **semaine par semaine** au barème CHR.

## 2026-08-02 — Noms des salariés + amorce connecteur ComboHR
- **Noms conservés à l'import** (migration `0016`) : `ana_labor.nom` / `.prenom`.
  `employe_hash` reste la clé d'idempotence. Les noms ne sont exposés que dans
  la zone Détail (protégée) et rendent le rattachement des contrats immédiat.
- **Diagnostic ComboHR** (`lib/combo.ts` + bloc sur la page Importation) : la
  doc de la Partner API n'étant pas publique, un sondage identifie depuis la
  prod la bonne base d'URL et le bon schéma d'authentification, et affiche un
  extrait des réponses. La clé (`COMBO_API_KEY`) reste strictement serveur.
- ⏳ L'import via API remplacera l'import fichier une fois le mapping connu.

## 2026-08-02 — Import direct de la Poire depuis Scoubidoo
- Bouton **« Importer la Poire »** sur la page Importation : lit directement la
  vue `scd_v_caisse_calc` de la mini-app Scoubidoo (même source que son export
  CSV) et upserte dans `ana_poire_daily`. Plus besoin d'exporter/ré-importer un
  CSV. Idempotent, ré-exécutable, journalisé dans `ana_import_log`.

## 2026-08-01 — Onglets & module « Coûts salariaux »
- **Onglets** : Revenus caisse · Coûts salariaux · Coûts appro · Autres coûts ·
  Synthèse · Importation (en-tête partagé `PageHeader` + `TabBar`, `?tab=`).
  Appro / Autres / Synthèse sont des placeholders.
- **Onglet Coûts salariaux** : masse salariale **agrégée par mois**, réalisé
  (import Combo) et **prévisionnel** (contrats × heures hebdo cible), % du CA,
  bouton **Détail**.
- **Page Détail** (`/detail`, code d'accès `1932`, zone protégée) : contrats
  (période, h. hebdo, brut, h. cible, rattachement à l'import anonyme),
  compléments **« Poire »** par salarié × mois (cash, **hors charges**), heures
  réalisées / prévisionnelles, **coefficient de charges patronales** persisté,
  et **décomposition mensuelle du coût global**.
- Migration `0015_couts_salariaux.sql` : `ana_contrats`, `ana_remuneration_poire`,
  `ana_params`. Le calcul du brut est factorisé dans `lib/labor.ts`.

## 2026-07-09 — Par jour de la semaine
- Nouvelle section (après « Par mois ») : pivot **année × jour de semaine**
  (lundi→dimanche), indicateur au choix (sous-ensemble ticket de « Par mois »).
  **Restreint à la période saisie** en haut, rejouée sur chaque année. Ligne
  Moyenne sur les années. 100 % client.

## 2026-07-09 — Analyse du panier moyen
- Nouveau bloc : distribution des tickets **restaurant** par tranche de 5 € de
  **panier** (montant ÷ couverts, jusqu'à « 70 €+ »), une colonne par année.
  Respecte la **fenêtre de dates** du haut, rejouée sur chaque année. Mesures :
  nombre de tickets, CA, **CA / jour ouvert**. **Diagramme à barres groupées**
  (une couleur par année) + ligne panier moyen (CA ÷ couverts). 100 % client.

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
