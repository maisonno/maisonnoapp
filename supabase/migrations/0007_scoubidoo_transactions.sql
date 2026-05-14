-- Stockage des transactions S&P importées (JSONB)
alter table scd_caisse
  add column if not exists sp_transactions_json jsonb;
