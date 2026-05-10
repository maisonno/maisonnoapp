-- =============================================================
-- Projet : Scoubidoo (préfixe : scd_)
-- Deux mini-apps : scoubidoo-caisse + scoubidoo-poire
-- =============================================================

-- -------------------------
-- Tables de référence
-- -------------------------

create table if not exists scd_type_operation (
  id   uuid default gen_random_uuid() primary key,
  name text not null unique
);

create table if not exists scd_tag (
  id   uuid default gen_random_uuid() primary key,
  name text not null unique
);

create table if not exists scd_jours_ouverts (
  id                uuid    default gen_random_uuid() primary key,
  mois              int     not null check (mois between 1 and 12),
  nb_jours_ouverts  int     not null default 0,
  objectif_par_jour numeric not null default 0,
  objectif_min      numeric not null default 0,
  unique (mois)
);

-- -------------------------
-- Table principale caisse
-- 1 ligne = 1 service du soir
-- -------------------------

create table if not exists scd_caisse (
  id              uuid        default gen_random_uuid() primary key,
  id_coda         text,
  date            date        not null,
  notes           text,
  tag_id          uuid        references scd_tag(id) on delete set null,
  ne_pas_compter  boolean     not null default false,

  -- B. Comptage espèces (nombre de billets/pièces)
  billets_500   int default 0,
  billets_200   int default 0,
  billets_100   int default 0,
  billets_50    int default 0,
  billets_20    int default 0,
  billets_10    int default 0,
  billets_5     int default 0,
  pieces_2      int default 0,
  pieces_1      int default 0,
  pieces_50c    int default 0,
  pieces_20c    int default 0,
  pieces_10c    int default 0,

  -- C. Comptage au poids (grammes)
  poids_pieces_2   numeric,
  poids_pieces_1   numeric,
  poids_pieces_50c numeric,
  poids_pieces_20c numeric,
  poids_pieces_10c numeric,

  -- D. Fond de caisse & coffre
  fond_caisse_matin  numeric not null default 0,
  fond_caisse_soir   numeric,
  mis_au_coffre      numeric,
  poire              numeric,
  ajout_monnaie      numeric default 0,
  mouvement_monnaie  numeric default 0,

  -- E. Ventes & règlements L'Addition
  total_service_ht                numeric,
  reglement_cb_du_service_v1      numeric,
  reglement_service_total         numeric,
  reglement_service_cash          numeric,
  reglement_service_cb_v2         numeric,
  reglement_service_payplus       numeric,
  reglement_service_compte_client numeric,
  reglement_service_trop_percu_cb numeric,
  reglement_service_pay_at_table  numeric,
  reglement_autres_cheque         numeric,

  -- F. TPE Pay+
  payplus_rapport_x           numeric,
  payplus_ventes_service      numeric,
  payplus_jplus1              numeric,
  payplus_jplus1_de_la_veille numeric,
  payplus_cumul_pourboire     numeric,
  payplus_pourboire_service   numeric,

  -- G. TPE Smile & Pay
  sp_cb_j_pourboire_incl             numeric,
  sp_cb_jplus1_pourboire_incl        numeric,
  sp_cb_jplus1_veille_pourboire_incl numeric,
  sp_pourboire_j                     numeric,
  sp_pourboire_jplus1                numeric,
  sp_pourboire_jplus1_de_la_veille   numeric,

  -- H. Pourboires versés
  pourboire_tpe_verse_au_pourboire numeric,
  trop_percu_verse_au_pourboire    numeric,

  -- I. Comptes clients & ajustements
  paiement_compte_cb   numeric,
  paiement_compte_cash numeric,
  ecart_cb             numeric,
  ecart_cash           numeric,

  -- Statut
  statut     text not null default 'brouillon'
             check (statut in ('brouillon', 'fermee')),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists scd_caisse_date_idx on scd_caisse (date desc);
create index if not exists scd_caisse_tag_idx  on scd_caisse (tag_id);
create index if not exists scd_caisse_mois_idx on scd_caisse (date_trunc('month', date));

-- -------------------------
-- Vue des calculs
-- -------------------------

create or replace view scd_v_caisse_calc as
with base as (
  select
    c.*,
    t.name as tag_name,

    -- total_caisse_soir (bug Coda corrigé : billets_500 inclus)
    coalesce(c.billets_500,0)*500
    + coalesce(c.billets_200,0)*200
    + coalesce(c.billets_100,0)*100
    + coalesce(c.billets_50,0)*50
    + coalesce(c.billets_20,0)*20
    + coalesce(c.billets_10,0)*10
    + coalesce(c.billets_5,0)*5
    + coalesce(c.pieces_2,0)*2
    + coalesce(c.pieces_1,0)
    + coalesce(c.pieces_50c,0)*0.5
    + coalesce(c.pieces_20c,0)*0.2
    + coalesce(c.pieces_10c,0)*0.1
    as total_caisse_soir,

    -- Comptage au poids → nombre de pièces estimé
    round(coalesce(c.poids_pieces_2,0)   / 8.5, 1) as nb_pieces_2_poids,
    round(coalesce(c.poids_pieces_1,0)   / 7.5, 1) as nb_pieces_1_poids,
    round(coalesce(c.poids_pieces_50c,0) / 7.8, 1) as nb_pieces_50c_poids,
    round(coalesce(c.poids_pieces_20c,0) / 5.7, 1) as nb_pieces_20c_poids,
    round(coalesce(c.poids_pieces_10c,0) / 4.1, 1) as nb_pieces_10c_poids,

    -- Pay+ encaissements du service
    coalesce(c.payplus_rapport_x,0)
      - coalesce(c.payplus_ventes_service,0)
      - coalesce(c.payplus_jplus1_de_la_veille,0)
    as payplus_encaissements,

    -- Pay+ pourboire du service
    coalesce(c.payplus_cumul_pourboire,0) - coalesce(c.payplus_pourboire_service,0)
    as payplus_pourboire,

    -- S&P pourboire service
    coalesce(c.sp_pourboire_j,0)
      + coalesce(c.sp_pourboire_jplus1,0)
      - coalesce(c.sp_pourboire_jplus1_de_la_veille,0)
    as sp_pourboire_service,

    -- S&P CB service hors pourboire
    (
      coalesce(c.sp_cb_j_pourboire_incl,0)
      + coalesce(c.sp_cb_jplus1_pourboire_incl,0)
      - coalesce(c.sp_cb_jplus1_veille_pourboire_incl,0)
    ) - (
      coalesce(c.sp_pourboire_j,0)
      + coalesce(c.sp_pourboire_jplus1,0)
      - coalesce(c.sp_pourboire_jplus1_de_la_veille,0)
    )
    as sp_cb_service,

    -- Trop perçu (valeur algébrique)
    -coalesce(c.reglement_service_trop_percu_cb,0) as trop_percu,

    -- Encaissements L'Addition (ce que la caisse enregistreuse pense avoir encaissé)
    coalesce(c.reglement_service_cash,0)
      + coalesce(c.reglement_service_cb_v2,0)
      + coalesce(c.reglement_service_payplus,0)
    as total_encaissements_ls,

    to_char(c.date, 'FMMM/YYYY') as mois_label

  from scd_caisse c
  left join scd_tag t on t.id = c.tag_id
)
select
  b.*,

  -- Pourboire TPE total
  b.payplus_pourboire + b.sp_pourboire_service as pourboire_tpe,

  -- Cash réel encaissé
  b.total_caisse_soir - coalesce(b.fond_caisse_matin,0) as total_encaissements_cash_reel,

  -- CA cash (hors mouvements monnaie)
  b.total_caisse_soir - coalesce(b.fond_caisse_matin,0) - coalesce(b.mouvement_monnaie,0) as total_ca_cash,

  -- CB réel encaissé
  b.payplus_encaissements + b.sp_cb_service as total_encaissements_cb_reel,

  -- Encaissements CB L'Addition
  coalesce(b.reglement_service_cb_v2,0) + coalesce(b.reglement_service_payplus,0) as total_encaissements_cb_ls,

  -- Full CA
  (b.total_caisse_soir - coalesce(b.fond_caisse_matin,0) - coalesce(b.mouvement_monnaie,0))
  + b.payplus_encaissements
  + b.sp_cb_service
  - coalesce(b.reglement_service_trop_percu_cb,0)
  + coalesce(b.reglement_service_compte_client,0)
  - coalesce(b.paiement_compte_cb,0)
  - coalesce(b.paiement_compte_cash,0)
  as full_ca,

  -- HT + Poire
  coalesce(b.total_service_ht,0) + coalesce(b.poire,0) as ht_plus_poire,

  -- Delta (répartition cash — doit être 0)
  b.total_caisse_soir
  - coalesce(b.mis_au_coffre,0)
  - coalesce(b.poire,0)
  + coalesce(b.ajout_monnaie,0)
  - coalesce(b.fond_caisse_soir,0)
  - coalesce(b.pourboire_tpe_verse_au_pourboire,0)
  - coalesce(b.trop_percu_verse_au_pourboire,0)
  as delta,

  -- Delta encaissement cash (formule corrigée)
  coalesce(b.reglement_service_cash,0)
  - (b.total_caisse_soir - coalesce(b.fond_caisse_matin,0))
  as delta_encaissement_cash,

  -- Delta encaissement CB
  (coalesce(b.reglement_service_cb_v2,0) + coalesce(b.reglement_service_payplus,0))
  - (b.payplus_encaissements + b.sp_cb_service)
  as delta_encaissement_cb,

  -- Règlement vérifier (doit être 0)
  coalesce(b.reglement_service_total,0)
  - coalesce(b.reglement_service_cash,0)
  - coalesce(b.reglement_service_cb_v2,0)
  - coalesce(b.reglement_service_payplus,0)
  - coalesce(b.reglement_service_compte_client,0)
  - coalesce(b.reglement_service_trop_percu_cb,0)
  - coalesce(b.reglement_autres_cheque,0)
  as reglement_verifier,

  -- Ecart cash service
  b.total_caisse_soir
  - coalesce(b.fond_caisse_matin,0)
  - coalesce(b.mouvement_monnaie,0)
  - coalesce(b.reglement_service_cash,0)
  - coalesce(b.paiement_compte_cash,0)
  as ecart_cash_service,

  -- CB écart service
  b.sp_cb_service
  + b.payplus_encaissements
  - coalesce(b.reglement_service_pay_at_table,0)
  - coalesce(b.reglement_service_payplus,0)
  - coalesce(b.reglement_service_cb_v2,0)
  - coalesce(b.paiement_compte_cb,0)
  + coalesce(b.ecart_cb,0)
  as cb_ecart_service,

  -- A mettre au frais
  (
    (b.total_caisse_soir - coalesce(b.fond_caisse_matin,0) - coalesce(b.mouvement_monnaie,0))
    + b.payplus_encaissements
    + b.sp_cb_service
    - coalesce(b.reglement_service_trop_percu_cb,0)
    + coalesce(b.reglement_service_compte_client,0)
    - coalesce(b.paiement_compte_cb,0)
    - coalesce(b.paiement_compte_cash,0)
  ) - (
    coalesce(b.reglement_service_cash,0)
    + coalesce(b.reglement_service_cb_v2,0)
    + coalesce(b.reglement_service_payplus,0)
  )
  as a_mettre_au_frais,

  -- Delta à ajouter en CB sur la caisse
  b.payplus_encaissements
  + b.sp_cb_service
  - coalesce(b.reglement_service_trop_percu_cb,0)
  - coalesce(b.reglement_service_payplus,0)
  - coalesce(b.reglement_service_pay_at_table,0)
  - coalesce(b.paiement_compte_cb,0)
  - coalesce(b.reglement_cb_du_service_v1,0)
  as delta_a_ajouter_cb

from base b;

-- -------------------------
-- Table compta_poire
-- -------------------------

create table if not exists scd_compta_poire (
  id                uuid default gen_random_uuid() primary key,
  id_coda           text,
  date              date not null,
  type_operation_id uuid references scd_type_operation(id) on delete set null,
  entree            numeric,
  sortie            numeric,
  notes             text,
  caisse_id         uuid references scd_caisse(id) on delete set null,
  created_by        uuid references auth.users(id),
  created_at        timestamptz default now(),
  updated_at        timestamptz default now(),
  constraint uq_scd_compta_poire_caisse unique (caisse_id)
);

create index if not exists scd_compta_poire_date_idx on scd_compta_poire (date desc);
create index if not exists scd_compta_poire_op_idx   on scd_compta_poire (type_operation_id);

-- -------------------------
-- Trigger : sync caisse → poire
-- -------------------------

create or replace function scd_sync_poire_from_caisse()
returns trigger language plpgsql as $$
declare
  v_type_id uuid;
begin
  select id into v_type_id from scd_type_operation where name = 'Versement Soir';

  if new.poire is null or new.poire = 0 then
    delete from scd_compta_poire where caisse_id = new.id;
  else
    insert into scd_compta_poire (date, type_operation_id, entree, caisse_id, created_by)
    values (new.date, v_type_id, new.poire, new.id, new.updated_by)
    on conflict (caisse_id) do update
      set entree = new.poire,
          date   = new.date;
  end if;

  return new;
end;
$$;

create trigger scd_caisse_poire_sync
  after insert or update of poire on scd_caisse
  for each row execute procedure scd_sync_poire_from_caisse();

-- -------------------------
-- Trigger updated_at
-- -------------------------

create trigger scd_caisse_updated_at
  before update on scd_caisse
  for each row execute procedure update_updated_at();

create trigger scd_compta_poire_updated_at
  before update on scd_compta_poire
  for each row execute procedure update_updated_at();

-- -------------------------
-- RLS
-- -------------------------

alter table scd_caisse          enable row level security;
alter table scd_compta_poire    enable row level security;
alter table scd_type_operation  enable row level security;
alter table scd_tag             enable row level security;
alter table scd_jours_ouverts   enable row level security;

create policy "auth read scd_caisse"          on scd_caisse          for select using (auth.role() = 'authenticated');
create policy "auth manage scd_caisse"        on scd_caisse          for all    using (auth.role() = 'authenticated');
create policy "auth read scd_compta_poire"    on scd_compta_poire    for select using (auth.role() = 'authenticated');
create policy "auth manage scd_compta_poire"  on scd_compta_poire    for all    using (auth.role() = 'authenticated');
create policy "auth read scd_type_operation"  on scd_type_operation  for select using (auth.role() = 'authenticated');
create policy "auth manage scd_type_operation" on scd_type_operation for all    using (auth.role() = 'authenticated');
create policy "auth read scd_tag"             on scd_tag             for select using (auth.role() = 'authenticated');
create policy "auth manage scd_tag"           on scd_tag             for all    using (auth.role() = 'authenticated');
create policy "auth read scd_jours_ouverts"   on scd_jours_ouverts   for select using (auth.role() = 'authenticated');
create policy "auth manage scd_jours_ouverts" on scd_jours_ouverts   for all    using (auth.role() = 'authenticated');

-- -------------------------
-- Seed référentiels
-- -------------------------

insert into scd_type_operation (name) values
  ('Versement Soir'), ('Argent de poche'), ('Complément rem'), ('Achats'),
  ('Init'), ('Cadeau'), ('Perso'), ('Déplacement'), ('Alcool'),
  ('Avance artistes'), ('Cachet'), ('Cashback'), ('Travaux'),
  ('Location Arbousiers'), ('Loyer les Arbousiers'), ('Elec les Arbousiers'),
  ('Resto'), ('Artistes'), ('Ménage'), ('Vente boisson'), ('Loyer'), ('Prêt'), ('Domi')
on conflict (name) do nothing;

insert into scd_tag (name) values
  ('Orage à 19h'), ('Karaoké'), ('Veille de bal'), ('Concert Apéro'), ('Bal')
on conflict (name) do nothing;

insert into scd_jours_ouverts (mois, nb_jours_ouverts, objectif_par_jour, objectif_min) values
  (5, 25, 2100, 1600),
  (6, 29, 3150, 2500),
  (7, 31, 4700, 4000),
  (8, 31, 5250, 4200),
  (9, 27, 3500, 2800)
on conflict (mois) do nothing;

-- -------------------------
-- Entrées dashboard
-- -------------------------

insert into projects (title, slug, description, tags, status, url, sort_order)
values
  ('Scoubidoo — Caisse', 'scoubidoo-caisse',
   'Fermeture de caisse quotidienne — La Pomme d''Adam.',
   array['Next.js','Supabase'], 'wip', '/projects/scoubidoo-caisse', 21),
  ('Scoubidoo — Poire', 'scoubidoo-poire',
   'Trésorerie cash hors registre — La Poire.',
   array['Next.js','Supabase'], 'wip', '/projects/scoubidoo-poire', 22)
on conflict (slug) do nothing;
