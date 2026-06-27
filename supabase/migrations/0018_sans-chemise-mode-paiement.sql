-- =============================================================
-- Projet : Sans Chemise (préfixe : snc_)
-- Mode de paiement sur les ventes : CB ou espèces.
-- Idempotent. Les ventes existantes restent à NULL (inconnu).
-- =============================================================

alter table snc_ventes
  add column if not exists mode_paiement text
  check (mode_paiement in ('cb', 'especes'));

-- =============================================================
