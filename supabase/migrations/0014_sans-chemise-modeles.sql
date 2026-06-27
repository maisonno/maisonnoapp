-- =============================================================
-- Projet : Sans Chemise (préfixe : snc_)
-- Seed des modèles & variantes depuis l'inventaire de la marque.
-- Idempotent : un modèle déjà présent (même nom) est ignoré.
-- Stock laissé à 0 (inventaire vide) — prix à compléter ensuite.
-- =============================================================

do $$
declare mid uuid;
begin
  if not exists (select 1 from snc_modeles where nom = 'Bonheur intégral') then
    insert into snc_modeles (nom, prix, variantes, tailles)
      values ('Bonheur intégral', 0, array['T-Shirt'], array['XS','S','M','L','XL'])
      returning id into mid;
    insert into snc_articles (modele_id, variante, taille)
      select mid, v, t from unnest(array['T-Shirt']) v, unnest(array['XS','S','M','L','XL']) t;
  end if;
end $$;

do $$
declare mid uuid;
begin
  if not exists (select 1 from snc_modeles where nom = 'Born Naked') then
    insert into snc_modeles (nom, prix, variantes, tailles)
      values ('Born Naked', 0, array['T-Shirt'], array['XS','S','M','L','XL'])
      returning id into mid;
    insert into snc_articles (modele_id, variante, taille)
      select mid, v, t from unnest(array['T-Shirt']) v, unnest(array['XS','S','M','L','XL']) t;
  end if;
end $$;

do $$
declare mid uuid;
begin
  if not exists (select 1 from snc_modeles where nom = 'Durville Chill') then
    insert into snc_modeles (nom, prix, variantes, tailles)
      values ('Durville Chill', 0, array['T-Shirt'], array['XS','S','M','L','XL'])
      returning id into mid;
    insert into snc_articles (modele_id, variante, taille)
      select mid, v, t from unnest(array['T-Shirt']) v, unnest(array['XS','S','M','L','XL']) t;
  end if;
end $$;

do $$
declare mid uuid;
begin
  if not exists (select 1 from snc_modeles where nom = 'Geek & Nu') then
    insert into snc_modeles (nom, prix, variantes, tailles)
      values ('Geek & Nu', 0, array['T-Shirt'], array['XS','S','M','L','XL'])
      returning id into mid;
    insert into snc_articles (modele_id, variante, taille)
      select mid, v, t from unnest(array['T-Shirt']) v, unnest(array['XS','S','M','L','XL']) t;
  end if;
end $$;

do $$
declare mid uuid;
begin
  if not exists (select 1 from snc_modeles where nom = 'Gigi') then
    insert into snc_modeles (nom, prix, variantes, tailles)
      values ('Gigi', 0, array['T-Shirt Femme','T-Shirt'], array['XS','S','M','L','XL'])
      returning id into mid;
    insert into snc_articles (modele_id, variante, taille)
      select mid, v, t from unnest(array['T-Shirt Femme','T-Shirt']) v, unnest(array['XS','S','M','L','XL']) t;
  end if;
end $$;

do $$
declare mid uuid;
begin
  if not exists (select 1 from snc_modeles where nom = 'Héliopoly - Le bonheur n''a pas de prix !') then
    insert into snc_modeles (nom, prix, variantes, tailles)
      values ('Héliopoly - Le bonheur n''a pas de prix !', 0, array['T-Shirt'], array['XS','S','M','L','XL'])
      returning id into mid;
    insert into snc_articles (modele_id, variante, taille)
      select mid, v, t from unnest(array['T-Shirt']) v, unnest(array['XS','S','M','L','XL']) t;
  end if;
end $$;

do $$
declare mid uuid;
begin
  if not exists (select 1 from snc_modeles where nom = 'I Love Île du Levant') then
    insert into snc_modeles (nom, prix, variantes, tailles)
      values ('I Love Île du Levant', 0, array['Sweat','T-Shirt','Débardeur','T-Shirt Col V'], array['XS','S','M','L','XL'])
      returning id into mid;
    insert into snc_articles (modele_id, variante, taille)
      select mid, v, t from unnest(array['Sweat','T-Shirt','Débardeur','T-Shirt Col V']) v, unnest(array['XS','S','M','L','XL']) t;
  end if;
end $$;

do $$
declare mid uuid;
begin
  if not exists (select 1 from snc_modeles where nom = 'I Love Levant') then
    insert into snc_modeles (nom, prix, variantes, tailles)
      values ('I Love Levant', 0, array['Casquette'], array['TU'])
      returning id into mid;
    insert into snc_articles (modele_id, variante, taille)
      select mid, v, t from unnest(array['Casquette']) v, unnest(array['TU']) t;
  end if;
end $$;

do $$
declare mid uuid;
begin
  if not exists (select 1 from snc_modeles where nom = 'I Pomme Levant') then
    insert into snc_modeles (nom, prix, variantes, tailles)
      values ('I Pomme Levant', 0, array['T-Shirt'], array['XS','S','M','L','XL'])
      returning id into mid;
    insert into snc_articles (modele_id, variante, taille)
      select mid, v, t from unnest(array['T-Shirt']) v, unnest(array['XS','S','M','L','XL']) t;
  end if;
end $$;

do $$
declare mid uuid;
begin
  if not exists (select 1 from snc_modeles where nom = 'Île du Levant') then
    insert into snc_modeles (nom, prix, variantes, tailles)
      values ('Île du Levant', 0, array['Sweat','T-Shirt Femme','Débardeur','T-Shirt'], array['XS','S','M','L','XL'])
      returning id into mid;
    insert into snc_articles (modele_id, variante, taille)
      select mid, v, t from unnest(array['Sweat','T-Shirt Femme','Débardeur','T-Shirt']) v, unnest(array['XS','S','M','L','XL']) t;
  end if;
end $$;

do $$
declare mid uuid;
begin
  if not exists (select 1 from snc_modeles where nom = 'La Pomme d''Adam') then
    insert into snc_modeles (nom, prix, variantes, tailles)
      values ('La Pomme d''Adam', 0, array['Gourde'], array['TU'])
      returning id into mid;
    insert into snc_articles (modele_id, variante, taille)
      select mid, v, t from unnest(array['Gourde']) v, unnest(array['TU']) t;
  end if;
end $$;

do $$
declare mid uuid;
begin
  if not exists (select 1 from snc_modeles where nom = 'La Pomme d''Adam 2026') then
    insert into snc_modeles (nom, prix, variantes, tailles)
      values ('La Pomme d''Adam 2026', 0, array['T-Shirt Col V','Débardeur','Sweat','T-Shirt Femme','T-Shirt'], array['XS','S','M','L','XL'])
      returning id into mid;
    insert into snc_articles (modele_id, variante, taille)
      select mid, v, t from unnest(array['T-Shirt Col V','Débardeur','Sweat','T-Shirt Femme','T-Shirt']) v, unnest(array['XS','S','M','L','XL']) t;
  end if;
end $$;

do $$
declare mid uuid;
begin
  if not exists (select 1 from snc_modeles where nom = 'La Pomme d''Adam 2026 — Accessoires') then
    insert into snc_modeles (nom, prix, variantes, tailles)
      values ('La Pomme d''Adam 2026 — Accessoires', 0, array['Coque iPhone','Mug'], array['TU'])
      returning id into mid;
    insert into snc_articles (modele_id, variante, taille)
      select mid, v, t from unnest(array['Coque iPhone','Mug']) v, unnest(array['TU']) t;
  end if;
end $$;

do $$
declare mid uuid;
begin
  if not exists (select 1 from snc_modeles where nom = 'Levantin') then
    insert into snc_modeles (nom, prix, variantes, tailles)
      values ('Levantin', 0, array['T-Shirt'], array['XS','S','M','L','XL'])
      returning id into mid;
    insert into snc_articles (modele_id, variante, taille)
      select mid, v, t from unnest(array['T-Shirt']) v, unnest(array['XS','S','M','L','XL']) t;
  end if;
end $$;

do $$
declare mid uuid;
begin
  if not exists (select 1 from snc_modeles where nom = 'Levantine') then
    insert into snc_modeles (nom, prix, variantes, tailles)
      values ('Levantine', 0, array['T-Shirt Femme'], array['XS','S','M','L','XL'])
      returning id into mid;
    insert into snc_articles (modele_id, variante, taille)
      select mid, v, t from unnest(array['T-Shirt Femme']) v, unnest(array['XS','S','M','L','XL']) t;
  end if;
end $$;

do $$
declare mid uuid;
begin
  if not exists (select 1 from snc_modeles where nom = 'Marie-Jo chante') then
    insert into snc_modeles (nom, prix, variantes, tailles)
      values ('Marie-Jo chante', 0, array['T-Shirt'], array['XS','S','M','L','XL'])
      returning id into mid;
    insert into snc_articles (modele_id, variante, taille)
      select mid, v, t from unnest(array['T-Shirt']) v, unnest(array['XS','S','M','L','XL']) t;
  end if;
end $$;

do $$
declare mid uuid;
begin
  if not exists (select 1 from snc_modeles where nom = 'Métro pédestre du Levant') then
    insert into snc_modeles (nom, prix, variantes, tailles)
      values ('Métro pédestre du Levant', 0, array['T-Shirt','T-Shirt Col V'], array['XS','S','M','L','XL'])
      returning id into mid;
    insert into snc_articles (modele_id, variante, taille)
      select mid, v, t from unnest(array['T-Shirt','T-Shirt Col V']) v, unnest(array['XS','S','M','L','XL']) t;
  end if;
end $$;

do $$
declare mid uuid;
begin
  if not exists (select 1 from snc_modeles where nom = 'Nage libre') then
    insert into snc_modeles (nom, prix, variantes, tailles)
      values ('Nage libre', 0, array['Sweat'], array['XS','S','M','L','XL'])
      returning id into mid;
    insert into snc_articles (modele_id, variante, taille)
      select mid, v, t from unnest(array['Sweat']) v, unnest(array['XS','S','M','L','XL']) t;
  end if;
end $$;

do $$
declare mid uuid;
begin
  if not exists (select 1 from snc_modeles where nom = 'Nage libre — Accessoires') then
    insert into snc_modeles (nom, prix, variantes, tailles)
      values ('Nage libre — Accessoires', 0, array['Mug'], array['TU'])
      returning id into mid;
    insert into snc_articles (modele_id, variante, taille)
      select mid, v, t from unnest(array['Mug']) v, unnest(array['TU']) t;
  end if;
end $$;

do $$
declare mid uuid;
begin
  if not exists (select 1 from snc_modeles where nom = 'Nage Libre Femme') then
    insert into snc_modeles (nom, prix, variantes, tailles)
      values ('Nage Libre Femme', 0, array['T-Shirt'], array['XS','S','M','L','XL'])
      returning id into mid;
    insert into snc_articles (modele_id, variante, taille)
      select mid, v, t from unnest(array['T-Shirt']) v, unnest(array['XS','S','M','L','XL']) t;
  end if;
end $$;

do $$
declare mid uuid;
begin
  if not exists (select 1 from snc_modeles where nom = 'Nage Libre Homme') then
    insert into snc_modeles (nom, prix, variantes, tailles)
      values ('Nage Libre Homme', 0, array['T-Shirt'], array['XS','S','M','L','XL'])
      returning id into mid;
    insert into snc_articles (modele_id, variante, taille)
      select mid, v, t from unnest(array['T-Shirt']) v, unnest(array['XS','S','M','L','XL']) t;
  end if;
end $$;

do $$
declare mid uuid;
begin
  if not exists (select 1 from snc_modeles where nom = 'Nicolas ''DJ No Sleep'' de la Pomme d''Adam') then
    insert into snc_modeles (nom, prix, variantes, tailles)
      values ('Nicolas ''DJ No Sleep'' de la Pomme d''Adam', 0, array['T-Shirt'], array['XS','S','M','L','XL'])
      returning id into mid;
    insert into snc_articles (modele_id, variante, taille)
      select mid, v, t from unnest(array['T-Shirt']) v, unnest(array['XS','S','M','L','XL']) t;
  end if;
end $$;

do $$
declare mid uuid;
begin
  if not exists (select 1 from snc_modeles where nom = 'Olivier en jaune') then
    insert into snc_modeles (nom, prix, variantes, tailles)
      values ('Olivier en jaune', 0, array['T-Shirt'], array['XS','S','M','L','XL'])
      returning id into mid;
    insert into snc_articles (modele_id, variante, taille)
      select mid, v, t from unnest(array['T-Shirt']) v, unnest(array['XS','S','M','L','XL']) t;
  end if;
end $$;

do $$
declare mid uuid;
begin
  if not exists (select 1 from snc_modeles where nom = 'Planche à poil') then
    insert into snc_modeles (nom, prix, variantes, tailles)
      values ('Planche à poil', 0, array['T-Shirt','Sweat','Débardeur','T-Shirt Col V'], array['XS','S','M','L','XL'])
      returning id into mid;
    insert into snc_articles (modele_id, variante, taille)
      select mid, v, t from unnest(array['T-Shirt','Sweat','Débardeur','T-Shirt Col V']) v, unnest(array['XS','S','M','L','XL']) t;
  end if;
end $$;

do $$
declare mid uuid;
begin
  if not exists (select 1 from snc_modeles where nom = 'République Naturiste d''Héliopolis') then
    insert into snc_modeles (nom, prix, variantes, tailles)
      values ('République Naturiste d''Héliopolis', 0, array['T-Shirt Femme','Sweat','T-Shirt'], array['XS','S','M','L','XL'])
      returning id into mid;
    insert into snc_articles (modele_id, variante, taille)
      select mid, v, t from unnest(array['T-Shirt Femme','Sweat','T-Shirt']) v, unnest(array['XS','S','M','L','XL']) t;
  end if;
end $$;

do $$
declare mid uuid;
begin
  if not exists (select 1 from snc_modeles where nom = 'République Naturiste d''Héliopolis — Accessoires') then
    insert into snc_modeles (nom, prix, variantes, tailles)
      values ('République Naturiste d''Héliopolis — Accessoires', 0, array['Mug'], array['TU'])
      returning id into mid;
    insert into snc_articles (modele_id, variante, taille)
      select mid, v, t from unnest(array['Mug']) v, unnest(array['TU']) t;
  end if;
end $$;

do $$
declare mid uuid;
begin
  if not exists (select 1 from snc_modeles where nom = 'République Naturiste d''Héliopolis (Macaron)') then
    insert into snc_modeles (nom, prix, variantes, tailles)
      values ('République Naturiste d''Héliopolis (Macaron)', 0, array['T-Shirt'], array['XS','S','M','L','XL'])
      returning id into mid;
    insert into snc_articles (modele_id, variante, taille)
      select mid, v, t from unnest(array['T-Shirt']) v, unnest(array['XS','S','M','L','XL']) t;
  end if;
end $$;

do $$
declare mid uuid;
begin
  if not exists (select 1 from snc_modeles where nom = 'Strip Fighter') then
    insert into snc_modeles (nom, prix, variantes, tailles)
      values ('Strip Fighter', 0, array['T-Shirt'], array['XS','S','M','L','XL'])
      returning id into mid;
    insert into snc_articles (modele_id, variante, taille)
      select mid, v, t from unnest(array['T-Shirt']) v, unnest(array['XS','S','M','L','XL']) t;
  end if;
end $$;

do $$
declare mid uuid;
begin
  if not exists (select 1 from snc_modeles where nom = 'Tous à poil') then
    insert into snc_modeles (nom, prix, variantes, tailles)
      values ('Tous à poil', 0, array['T-Shirt'], array['XS','S','M','L','XL'])
      returning id into mid;
    insert into snc_articles (modele_id, variante, taille)
      select mid, v, t from unnest(array['T-Shirt']) v, unnest(array['XS','S','M','L','XL']) t;
  end if;
end $$;
