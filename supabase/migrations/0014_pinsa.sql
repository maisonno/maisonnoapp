-- =============================================================
-- Projet : Analyse des services (préfixe : ana_)
-- Comptage mensuel des pinsa (catégorie « Pinsa »)
-- =============================================================
-- À exécuter dans le SQL Editor Supabase.
--
-- La catégorie « Pinsa » regroupe les pinsas entières ET les demi/petites
-- (« Petite Mykonos + salade », « demi Pinsapéro », Pinsaladière…). On somme la
-- quantité des lignes NON offertes : chaque demi/petite compte 1 (c'est un plat).
-- Vue légère (agrégat mensuel), non matérialisée → toujours à jour.
-- =============================================================

create or replace view ana_v_pinsa_monthly as
select to_char(l.jour, 'YYYY-MM') as ym,
       sum(l.qte)                 as n_pinsa
from ana_lines l
where l.offert = false
  and lower(coalesce(l.categorie, '')) = 'pinsa'
group by 1;

grant select on ana_v_pinsa_monthly to authenticated;

select pg_notify('pgrst', 'reload schema');
