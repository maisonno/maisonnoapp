-- =============================================================
-- Projet : Analyse des services (préfixe : ana_)
-- Météo quotidienne à l'Île du Levant
-- =============================================================
-- À exécuter dans le SQL Editor Supabase.
--
-- Source : Open-Meteo (https://open-meteo.com) — sans clé API, licence CC BY 4.0.
--   · /v1/archive  (ERA5) pour l'historique, avec ~5 jours de latence
--   · /v1/forecast (past_days) pour les jours récents et à venir
--
-- `weather_code` suit la codification WMO (0 = ciel dégagé, 3 = couvert,
-- 61 = pluie, 95 = orage…), traduite en pictogramme côté app.
-- =============================================================

create table if not exists ana_meteo_daily (
  jour          date primary key,
  weather_code  smallint,        -- code WMO
  t_max         numeric,         -- °C
  t_min         numeric,         -- °C
  precipitation numeric,         -- mm cumulés
  vent_max      numeric,         -- km/h
  source        text,            -- 'archive' | 'forecast'
  synced_at     timestamptz default now()
);

alter table ana_meteo_daily enable row level security;
create policy "auth read ana_meteo_daily"   on ana_meteo_daily for select using (auth.role() = 'authenticated');
create policy "auth manage ana_meteo_daily" on ana_meteo_daily for all    using (auth.role() = 'authenticated');
grant select, insert, update, delete on table ana_meteo_daily to authenticated;

select pg_notify('pgrst', 'reload schema');
