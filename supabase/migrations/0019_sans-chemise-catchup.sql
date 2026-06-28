-- =============================================================
-- Projet : Sans Chemise (préfixe : snc_)
-- RATTRAPAGE : garantit la présence de toutes les colonnes
-- attendues par l'app (prix_variantes, variantes_phares,
-- mode_paiement). À exécuter si l'app affiche des écrans vides
-- alors que la base contient des données (une colonne manquante
-- fait échouer la requête → 0 ligne renvoyée).
--
-- Regroupe et rend idempotents les ajouts de 0016 / 0017 / 0018.
-- Sans danger même si ces migrations ont déjà été exécutées.
-- =============================================================

-- 1) Colonnes manquantes -------------------------------------
alter table snc_modeles add column if not exists prix_variantes  jsonb  not null default '{}'::jsonb;
alter table snc_modeles add column if not exists variantes_phares text[] not null default '{}';
alter table snc_ventes  add column if not exists mode_paiement text
  check (mode_paiement in ('cb', 'especes'));

-- 2) Seed des prix par variante (uniquement si encore vide) ---
update snc_modeles m
set prix_variantes = coalesce((
  select jsonb_object_agg(x.v, x.price)
  from (
    select v, case v
      when 'T-Shirt'        then 29
      when 'T-Shirt Femme'  then 29
      when 'Débardeur'      then 29
      when 'T-Shirt Col V'  then 35
      when 'Sweat'          then 49
      when 'Mug'            then 15
      else null
    end as price
    from unnest(m.variantes) as v
  ) x
  where x.price is not null
), '{}'::jsonb)
where coalesce(m.prix_variantes, '{}'::jsonb) = '{}'::jsonb;

-- 3) Prix de base (repli) = plus bas des prix de variante -----
update snc_modeles m
set prix = sub.minp
from (
  select id, min(value::numeric) as minp
  from snc_modeles, jsonb_each_text(prix_variantes)
  where prix_variantes <> '{}'::jsonb
  group by id
) sub
where m.id = sub.id
  and coalesce(m.prix, 0) = 0;

-- 4) L'ancien prix par article n'est plus utilisé -------------
alter table snc_articles drop column if exists prix;

-- -------------------------------------------------------------
-- Vérification :
-- select count(*) as modeles from snc_modeles where actif;
-- select nom, prix, prix_variantes, variantes_phares from snc_modeles order by nom;
-- =============================================================
