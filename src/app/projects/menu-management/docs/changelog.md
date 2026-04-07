# Gestion des Menus — Changelog

## v0.3.0 — 2026-04-07

### Documentation
- Ajout de `docs/templates-guide.md` : guide complet de préparation des templates Word avec exemples

### Template data — nouvelles variables
- Variables par catégorie : `entrees`, `a_partager`, `plats`, `pizzas`, `salades`, `desserts`, `glaces`
- Drapeaux booléens : `has_entrees`, `has_plats`, `has_desserts`… (masquage conditionnel)
- `featured_dishes` : liste des plats mis en avant
- `has_featured` : booléen, vrai s'il y a au moins un plat mis en avant

---

## v0.2.0 — 2026-04-07

### UX — Éditeur de menu
- Toutes les catégories sont affichées en permanence (même vides)
- Bouton "Ajouter une entrée / un plat / …" par section, pré-filtré sur la catégorie
- Bouton "Modifier" (✏️) sur chaque plat dans l'éditeur
- Bouton "Créer un nouveau plat" en haut de l'éditeur de menu

### UX — Formulaires
- Fix : texte illisible dans les inputs (couleur jaune tiki) → `text-gray-900 bg-white` explicite
- Nouveau menu : libellé par défaut "Menu du dd Mmmm YYYY"

### UX — Navigation iPad
- MenuCard entièrement cliquable → ouvre directement l'éditeur
- DishCard entièrement cliquable → ouvre directement l'édition du plat

### Fix — Import CSV
- Remplacement de l'`upsert` (qui échouait faute de contrainte unique sur `name`) par un `insert` simple
- Ajout de `public/dishes_import.csv` : 123 plats de La Pomme d'Adam pré-formatés

---

## v0.1.0 — 2026-04-07

### Initial setup

- Structure du projet créée (`menu-management`, préfixe `mnu_`)
- Migration SQL `0002_menu-management.sql` : tables `mnu_dishes`, `mnu_menus`, `mnu_menu_items`, `mnu_generated_docs`
- Catalogue des plats : CRUD complet, toggle actif/inactif, import CSV/Excel
- Gestion des menus : création, duplication (date = aujourd'hui + copie items), suppression
- Éditeur de menu : assignation des plats, réordonnancement ↑↓ par catégorie, mise en avant (⭐)
- Génération documents : DOCX via `docxtemplater`, PDF via Gotenberg, stockage Supabase Storage TTL 48h
- Purge Vercel Cron quotidienne à 3h UTC (`vercel.json`)
- Design Material classique (Tailwind), compatible iPad (boutons ↑↓)
- Docs initiales : overview, architecture, database, api, changelog

---

## À faire (prochaines étapes)

- [ ] Uploader les vrais templates `.docx` dans `public/templates/`
- [ ] Déployer Gotenberg sur Railway ou Render
- [ ] Configurer variables d'env Vercel : `GOTENBERG_URL`, `CRON_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`
- [ ] Créer le bucket Supabase Storage `generated-docs` (privé)
- [ ] Importer les plats via `public/dishes_import.csv`
- [ ] Merger le PR #1 (correctif sécurité Next.js CVE-2025-55182)
