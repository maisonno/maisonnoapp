# Gestion des Menus — Changelog

## v0.1.0 — 2026-04-07

### Initial setup

- Structure du projet créée (`menu-management`)
- Migration SQL `0002_menu-management.sql` : tables `mnu_dishes`, `mnu_menus`, `mnu_menu_items`, `mnu_generated_docs`
- Catalogue des plats : CRUD complet, import CSV/Excel, toggle actif
- Gestion des menus : création, duplication (date = aujourd'hui + copie items), suppression
- Éditeur de menu : assignation des plats, réordonnancement ↑↓ par catégorie, mise en avant
- Génération documents : DOCX via `docxtemplater`, PDF via Gotenberg
- Stockage Supabase Storage avec TTL 48h + purge Vercel Cron
- Design Material classique (Tailwind, pas de tiki)
- Compatible iPad (boutons ↑↓ à la place du drag & drop)

### À faire (prochaines itérations)

- [ ] Uploader les vrais templates `.docx` dans `public/templates/`
- [ ] Déployer Gotenberg sur Railway ou Render
- [ ] Configurer variables d'env Vercel (`GOTENBERG_URL`, `CRON_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`)
- [ ] Créer le bucket Supabase Storage `generated-docs`
- [ ] Importer la liste de plats existante via l'interface CSV
