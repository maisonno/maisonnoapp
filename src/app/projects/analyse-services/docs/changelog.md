# Changelog

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
