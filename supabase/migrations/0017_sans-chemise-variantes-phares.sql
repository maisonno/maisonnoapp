-- =============================================================
-- Projet : Sans Chemise (préfixe : snc_)
-- Variantes « phares » (mises en avant) par modèle.
-- Liste des variantes étoilées, stockée sur le modèle.
-- Idempotent.
-- =============================================================

alter table snc_modeles
  add column if not exists variantes_phares text[] not null default '{}';

-- =============================================================
