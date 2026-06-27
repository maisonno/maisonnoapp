-- =============================================================
-- Projet : Sans Chemise (préfixe : snc_)
-- Mise à jour en masse des prix, par VARIANTE.
-- Ajoute un prix par article (snc_articles.prix) — le prix du
-- modèle (snc_modeles.prix) reste le repli quand l'article n'a
-- pas de prix propre.
-- Idempotent : peut être ré-exécuté sans dommage.
-- =============================================================

-- 1) Colonne de prix par article (par variante)
alter table snc_articles add column if not exists prix numeric;

-- 2) Tarifs par variante
update snc_articles set prix = 29 where variante in ('T-Shirt', 'T-Shirt Femme', 'Débardeur');
update snc_articles set prix = 49 where variante = 'Sweat';
update snc_articles set prix = 35 where variante = 'T-Shirt Col V';
update snc_articles set prix = 15 where variante = 'Mug';
-- Non fournis : Casquette, Gourde, Coque iPhone → laissés sans prix (NULL).

-- 3) Prix « repère » du modèle (affiché sur la carte de vente) :
--    le prix du T-Shirt s'il existe, sinon le plus bas des articles tarifés.
--    On ne touche que les modèles encore au prix par défaut (0).
update snc_modeles m
set prix = coalesce(
  (select a.prix from snc_articles a
     where a.modele_id = m.id and a.variante = 'T-Shirt' and a.prix is not null limit 1),
  (select min(a.prix) from snc_articles a
     where a.modele_id = m.id and a.prix is not null)
)
where coalesce(m.prix, 0) = 0
  and exists (select 1 from snc_articles a where a.modele_id = m.id and a.prix is not null);

-- -------------------------------------------------------------
-- Récapitulatif (lecture seule) — décommenter pour vérifier :
-- select m.nom, a.variante, a.prix
--   from snc_articles a join snc_modeles m on m.id = a.modele_id
--   order by m.nom, a.variante;
-- =============================================================
