-- =============================================================
-- Ajout de l'option "retourner les pages paires" sur mnu_templates
-- et du chemin PDF inversé sur mnu_generated_docs
-- =============================================================

alter table mnu_templates
  add column if not exists flip_even_pages boolean not null default false;

alter table mnu_generated_docs
  add column if not exists pdf_inversed_path text;
