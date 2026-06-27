-- =============================================================
-- Projet : Sans Chemise (préfixe : snc_)
-- Prix PAR VARIANTE, géré au niveau du modèle.
-- Remplace l'approche prix-par-article de 0015 :
--   - ajoute snc_modeles.prix_variantes (jsonb) = { variante: prix }
--   - retire snc_articles.prix (le prix se dérive du modèle)
-- Le prix appliqué à une vente = prix_variantes[variante] ?? prix.
-- Idempotent. (Si 0015 n'a pas été exécuté, aucun souci.)
-- =============================================================

-- 1) Colonne map prix par variante
alter table snc_modeles add column if not exists prix_variantes jsonb not null default '{}'::jsonb;

-- 2) Seed des prix par variante pour chaque modèle, à partir de ses variantes.
--    Variantes non tarifées (Casquette, Gourde, Coque iPhone) : non incluses.
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

-- 3) Prix de base du modèle (repli / affichage) = le plus bas des prix de variante.
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

-- 4) Le prix par article n'a plus lieu d'être (dérivé du modèle)
alter table snc_articles drop column if exists prix;

-- -------------------------------------------------------------
-- Vérification (lecture seule) :
-- select nom, prix, prix_variantes from snc_modeles order by nom;
-- =============================================================
