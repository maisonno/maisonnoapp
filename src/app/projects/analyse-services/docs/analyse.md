# Guide d'analyse — données « Analyse des services »

Document de contexte destiné à **Claude** (ou à toute personne) qui interroge
directement la base Supabase pour produire des analyses.

**Établissement** : La Pomme d'Adam, bar-restaurant saisonnier, Île du Levant.
**Fermé de novembre à mars** — l'absence de données en hiver est normale.
Toutes les tables sont préfixées `ana_`.

---

## 1. Les 5 pièges à connaître avant toute requête

Ces règles ne sont **pas** évidentes en lisant le schéma. Les ignorer produit
des chiffres faux mais crédibles.

1. **Les lignes offertes sont exclues du chiffre d'affaires.**
   `ana_lines.offert = true` → repas maison, gestes commerciaux. Leur `prix_ht`
   vaut déjà 0. Les tickets **100 % offerts** sont carrément absents de la vue
   `ana_v_ticket_metrics`.

2. **Le service du soir déborde sur la nuit.**
   Soir = `heure >= 17 OU heure < 5`. Une ardoise fermée à 1 h du matin
   appartient au service du **soir de la veille**, pas au midi. Le seuil de 17 h
   est le défaut ; l'app permet 12/16/18/19.

3. **La Poire n'est pas soumise à la TVA.**
   `ana_poire_daily.montant_ttc` est du cash comptoir. Son montant est
   **identique en TTC et en HT** : ne jamais le diviser par 1,10. Elle s'ajoute
   au **bar** et au total, et n'est **pas ventilée** midi/soir (saisie au jour).

4. **Un « jour ouvert » est pondéré, pas binaire.**
   Un service compte comme ouvert s'il a **≥ 5 tickets**. Midi seul = **0,25 j**,
   soir seul = **0,75 j**, les deux = **1 j**. Tous les ratios « par jour » de
   l'app utilisent cette pondération, pas le nombre de dates distinctes.

5. **`prix_ht` est un total de ligne, pas un prix unitaire.**
   Il est déjà net de remise et multiplié par la quantité. Ne pas le multiplier
   par `qte`. Le TTC se reconstitue par `prix_ht * (1 + taux)`, `taux` étant un
   décimal (0.10, 0.20…).

---

## 2. Ventes — le modèle

### `ana_v_ticket_metrics` — **la table à utiliser par défaut**
Vue **matérialisée**, une ligne par ticket, offerts déjà exclus. C'est la source
de vérité pour toute analyse de CA.

| Colonne | Sens |
|---|---|
| `ticket_id`, `jour`, `heure` | `heure` = heure d'ouverture du ticket (0-23) |
| `couverts` | saisis dans L'Addition ; **0 hors service à table** (bar) |
| `ht`, `ttc` | totaux du ticket, offerts exclus |
| `n_entree`, `n_plat`, `n_dessert`, `n_boisson` | quantités par poste |
| `n_plat_offert` | plats offerts (exclus du CA, comptés pour info) |
| `ttc_*` / `ht_*` (`_entree`, `_plat`, `_dessert`, `_boisson`, `_autre`) | CA par poste |
| `type` | `resto` (≥1 plat **ou** entrée) · `dessert` (dessert seul) · `bar` (aucun plat/entrée/dessert) |

> ⚠️ **Vue matérialisée** : elle peut être en retard sur les imports.
> Rafraîchir si besoin : `select ana_refresh_metrics();`

### Tables brutes (pour descendre au produit)
- **`ana_tickets`** — `ticket_id` (PK), `jour`, `heure`, `couverts`, `total_ttc`,
  `total_ht`, `etablissement`.
- **`ana_lines`** — `line_id` (PK), `ticket_id`, `jour`, `nom` (libellé produit),
  `qte`, `prix_ht` (total ligne), `taux`, `categorie`, `type_produit`, `offert`.
- **`ana_category_map`** — `categorie` → `bucket` ∈ {entree, plat, dessert,
  boisson, autre}. La fonction `ana_f_bucket(categorie, nom)` applique ce mapping
  avec un rattrapage par nom.

### `ana_poire_daily`
`jour` (PK), `montant_ttc`, `tag` (ex. « Karaoké », « Bal »). Cash comptoir hors
caisse, saisi au jour, alimenté depuis la mini-app Scoubidoo.

### `ana_v_pinsa_monthly`
`ym` ('YYYY-MM'), `n_pinsa`. **La catégorie « Pinsa » englobe les demi/petites
pinsas** (« Petite Mykonos + salade », « demi Pinsapéro ») — chacune compte 1,
c'est un plat. Compter par le **nom** du produit raterait les « Petite … ».

---

## 3. Masse salariale — le modèle

Source : **API ComboHR** (synchronisation). `ana_labor` est l'ancien import
fichier, conservé pour l'historique antérieur à la synchro.

- **`ana_contrats`** — `id`, `nom_affichage`, `poste`, `contrat` (CDD/saisonnier…),
  `date_debut`, `date_fin`, `heures_hebdo_contrat`, `salaire_brut_mensuel`,
  `heures_hebdo_cible`, `actif`, `combo_contract_id`.
- **`ana_heures_mois`** — (`contrat_id`, `mois`) : `heures_reelles` (pointages),
  `heures_planifiees` (planning), `heures_projetees` (**pointé si connu, sinon
  planifié** — la mesure juste pour un mois en cours), et les `supp_equiv_*`
  correspondants (équivalent-heures de la majoration heures supp).
- **`ana_semaines_planifiees`** — (`contrat_id`, `semaine`) : semaines ayant un
  planning. Sert à repérer l'**horizon de planification**.
- **`ana_primes`** — `mois` (PK), `montant_temps_plein`.
- **`ana_remuneration_poire`** — (`contrat_id`, `mois`), `montant`. Complément
  cash **distinct** de la prime, il s'y **ajoute**.
- **`ana_params`** — `cle`/`valeur` : `taux_charges_patronales` (~0,30),
  `heures_temps_plein` (39).

### Formule du coût (convention CHR, estimation de gestion)
```
taux horaire   = salaire_brut_mensuel / (heures_hebdo_contrat × 52/12)
brut           = ( base au prorata de la période de contrat
                 + taux horaire × supp_equiv        (heures supp)
                 + fériés / 1er mai (+100 %)
                 + 6ème jour (base ÷ 6, « 6 jours payés 7 »)
                 ) × 1,10                            (provision congés payés)
coût global    = brut × (1 + taux_charges_patronales)
                 + prime + complément Poire          ← cash, HORS charges
```
- **Barème heures supp** : ≤ 39 h ×1,10 · 39-43 h ×1,20 · > 43 h ×1,50,
  calculé **semaine par semaine**.
- **Pas de majoration de nuit** (convention CHR).
- **Prime** = `montant_temps_plein` × quotité (`heures_hebdo_contrat / 39`,
  plafonnée à 1) × prorata des jours du mois couverts par le contrat.
  Ce sont les heures **contractuelles**, pas le réalisé.
- Le taux de charges réel mesuré sur 2025 est **26,8 %** (paramètre à 30 %).

---

## 4. Requêtes types (validées)

```sql
-- CA par jour, ventilé par type, Poire incluse
select t.jour,
       sum(t.ttc) filter (where t.type = 'resto')   as ca_resto,
       sum(t.ttc) filter (where t.type = 'dessert') as ca_dessert,
       sum(t.ttc) filter (where t.type = 'bar')     as ca_bar,
       coalesce(max(p.montant_ttc), 0)              as poire,
       sum(t.ttc) + coalesce(max(p.montant_ttc), 0) as ca_total,
       sum(t.couverts) filter (where t.type = 'resto') as couverts
from ana_v_ticket_metrics t
left join ana_poire_daily p on p.jour = t.jour
group by t.jour
order by t.jour;
```

```sql
-- Répartition midi / soir (attention au rebouclage de nuit)
select t.jour,
       case when t.heure >= 17 or t.heure < 5 then 'soir' else 'midi' end as service,
       count(*) as tickets, sum(t.ttc) as ca, sum(t.couverts) as couverts
from ana_v_ticket_metrics t
group by 1, 2
order by 1, 2;
```

```sql
-- Jours d'ouverture pondérés par mois (0,25 midi / 0,75 soir, seuil 5 tickets)
with svc as (
  select t.jour,
         count(*) filter (where not (t.heure >= 17 or t.heure < 5)) as tk_midi,
         count(*) filter (where     (t.heure >= 17 or t.heure < 5)) as tk_soir
  from ana_v_ticket_metrics t
  group by t.jour
)
select to_char(jour, 'YYYY-MM') as mois,
       sum( (case when tk_midi >= 5 then 0.25 else 0 end)
          + (case when tk_soir >= 5 then 0.75 else 0 end) ) as jours_ouverts
from svc group by 1 order by 1;
```

```sql
-- Panier moyen restaurant (CA / couverts), tickets sans couvert exclus
select to_char(jour, 'YYYY-MM') as mois,
       sum(ttc) / nullif(sum(couverts), 0) as panier_moyen
from ana_v_ticket_metrics
where type = 'resto' and couverts > 0
group by 1 order by 1;
```

```sql
-- Top produits par CA (offerts exclus)
select l.nom, l.categorie,
       sum(l.qte) as quantite,
       sum(l.prix_ht * (1 + l.taux)) as ca_ttc
from ana_lines l
where not l.offert
group by 1, 2
order by ca_ttc desc
limit 30;
```

```sql
-- Masse salariale mensuelle (heures projetées) vs CA
with cout as (
  select to_char(h.mois, 'YYYY-MM') as mois,
         sum( (c.salaire_brut_mensuel
               + (c.salaire_brut_mensuel / nullif(c.heures_hebdo_contrat * 52/12.0, 0))
                 * h.supp_equiv_projete
              ) * (1 + 1/6.0) * 1.10 ) as brut
  from ana_heures_mois h
  join ana_contrats c on c.id = h.contrat_id
  group by 1
),
ca as (
  select to_char(jour, 'YYYY-MM') as mois, sum(ttc) as ca_ttc
  from ana_v_ticket_metrics group by 1
)
select ca.mois, ca.ca_ttc, cout.brut,
       cout.brut * 1.30 as cout_charge,
       100 * cout.brut * 1.30 / nullif(ca.ca_ttc, 0) as pct_masse_sur_ca
from ca left join cout using (mois)
order by ca.mois;
```

---

## 5. Comparaisons entre années — la convention de l'app
Pour comparer deux saisons, l'app **rejoue la même fenêtre calendaire (MM-JJ)**
sur chaque année plutôt que de comparer des totaux annuels : les saisons n'ont ni
la même durée ni la même date d'ouverture. Reproduire ce principe donne des
comparaisons honnêtes.

## 6. Ce que la base ne contient pas
- **Coûts matières / achats** — pas encore importés (onglet « Coûts appro » à venir).
- **Fériés et 1er mai depuis ComboHR** — l'API ne les distingue pas ; ces
  colonnes valent 0 sur les mois synchronisés (elles n'existent que dans
  l'ancien import `ana_labor`).
- **Le détail des pourboires** et les encaissements par moyen de paiement, qui
  vivent dans la mini-app `scoubidoo-caisse` (`scd_*`).
