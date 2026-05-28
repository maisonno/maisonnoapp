-- =============================================================
-- Migration 0011 : GRANTs explicites sur toutes les tables
-- Requis avant le 30/10/2026 : Supabase ne expose plus les tables
-- du schéma public par défaut (Data API / PostgREST / supabase-js).
-- Les GRANTs s'ajoutent au-dessus des politiques RLS existantes.
-- =============================================================

-- Dashboard
grant select, insert, update, delete on table projects to authenticated;

-- user-management
grant select, insert, update, delete on table usr_profiles to authenticated;

-- menu-management
grant select, insert, update, delete on table mnu_dishes        to authenticated;
grant select, insert, update, delete on table mnu_menus         to authenticated;
grant select, insert, update, delete on table mnu_menu_items    to authenticated;
grant select, insert, update, delete on table mnu_generated_docs to authenticated;

-- scoubidoo-caisse & scoubidoo-poire
grant select, insert, update, delete on table scd_caisse           to authenticated;
grant select, insert, update, delete on table scd_compta_poire     to authenticated;
grant select, insert, update, delete on table scd_tag              to authenticated;
grant select, insert, update, delete on table scd_type_operation   to authenticated;
grant select, insert, update, delete on table scd_jours_ouverts    to authenticated;
grant select on scd_v_caisse_calc to authenticated;
