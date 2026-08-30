# API & accès aux données

Cette app n'expose **pas** de Server Actions ni de routes API : les mutations
(import) se font directement depuis le client via `@supabase/supabase-js` (clé
`anon` + session, RLS), et les lectures via le client serveur SSR.

## Lectures serveur — `lib/queries.ts`
- `getAllTicketMetrics(): Promise<TicketMetric[]>`
  Charge **toute** la vue `ana_v_ticket_metrics` par pages de 1000 lignes
  (contournement de la limite PostgREST). Colonnes restreintes au strict
  nécessaire au calcul.
- `getAllPoire(): Promise<PoireDay[]>`
  Charge `ana_poire_daily` (`jour`, `montant_ttc`).
- `getMeteo(): Promise<Record<string, MeteoJourRow>>`
  Charge `ana_meteo_daily` par pages et l'indexe **par jour** (`YYYY-MM-DD`) pour
  une jointure O(1) avec le tableau jour par jour.
- `getImportLog(limit = 20): Promise<ImportLogEntry[]>`
  Dernières entrées de `ana_import_log`.

## Server Action — `syncMeteo()` (`actions.ts`)
Synchronise `ana_meteo_daily` depuis **Open-Meteo** (sans clé, CC BY 4.0) :
1. lit le premier jour de ventes dans `ana_tickets` ;
2. `fetchArchive(premierJour, aujourd'hui − 6 j)` → réanalyse **ERA5** (fiable,
   mais ~5 jours de latence, d'où la marge de 6 jours) ;
3. `fetchRecent(12, 7)` → fenêtre récente + prévisions, en ne conservant que les
   jours **non** couverts par l'archive ;
4. upsert par lots de 500 sur `jour`, puis `revalidatePath`.

Helpers dans `lib/meteo.ts` : `meteoIcon(code)` (code WMO → emoji),
`meteoLabel(code)`, `meteoTooltip(row)`. Rendu réseau **côté serveur** (Vercel) —
comme le connecteur ComboHR.

## Écritures client — `components/ImportClient.tsx`
Upserts par lots de 500 via le client browser :
- `ana_tickets` `upsert(..., { onConflict: 'ticket_id' })` — **avant** les lignes.
- `ana_lines` `upsert(..., { onConflict: 'line_id' })`.
- `ana_poire_daily` `upsert(..., { onConflict: 'jour' })`.
- `ana_import_log` `insert(...)` après chaque fichier.

## Logique de calcul — `lib/analytics.ts` (pur, testable)
- `buildPoireMap(rows)` → `{ 'YYYY-MM-DD': montant_ttc }`.
- `compute(tickets, poireMap, ctrl)` → matrice resto/dessert/bar × midi/soir,
  agrégat resto par service, agrégat jour, Poire TTC/valeur.
- `mergeRes({Midi, Soir})` → total resto.
- `yearStats(tickets, poireMap, year, mdFrom, mdTo, ctrl)` → ligne de comparaison
  annuelle pour une fenêtre calendaire.
- `grandTotal(C)` → total affiché dans la vue d'ensemble.

`ctrl` (`DashControls`) : `{ from, to, cutoff, base ('ttc'|'ht'), incPoire }`. La
Poire est du cash non soumis à la TVA : son montant est identique en TTC et en HT.

## Parsing — `lib/parsers.ts`
- `num`, `rate`, `isoDate` : coercition robuste (gère `-`, `%`, séries Excel,
  `DD/MM/YYYY`).
- `detectWorkbookKind(wb)` : 'ventes' | 'poire' | 'unknown'.
- `parseVentes(wb, fname)` → `{ tickets, lines, rowsIn }`.
- `parsePoireRows(rows, fname)` / `parsePoireWorkbook(wb, fname)` →
  `{ poire, rowsIn }`.
- `csvToRows(text)` : CSV BOM/`;`/`,` → objets.
