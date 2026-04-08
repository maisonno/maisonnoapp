# Menu Pomme — Changelog

## v0.5.0 — 2026-04-08

### Templates
- Téléchargement du fichier `.docx` d'un modèle (bouton ↓ sur la carte)
- Lien "Télécharger le guide" dans l'onglet Modèles (`/docs/templates-guide.md`)
- Guide mis à jour : workflow upload via app, conseil polices incorporées

### Documentation
- Mise à jour complète de toutes les docs suite aux évolutions v0.4.0

---

## v0.4.0 — 2026-04-08

### Renommage
- Application renommée **Menu Pomme** (anciennement "Gestion des Menus")

### UX — Éditeur de menu
- Drag & drop pour réordonner les plats (`@dnd-kit`, touch support iPad/iPhone)
- Bouton crayon sur le nom du menu → renommage inline
- Étoile pleine si plat mis en avant, étoile contour sinon

### UX — Catalogue des plats
- Sous-onglets de filtrage : Tous · Entrées · À partager · Plats · Pizzas · Salades · Desserts · Glaces · Archivés
- Archivage / désarchivage depuis la modale de modification (bouton Archiver/Désarchiver)
- Badge "Archivé" sur les cartes de plats archivés
- Plats archivés masqués dans la popup d'ajout au menu

### UX — Menus
- Bouton "Dupliquer" avec texte complet (plus petit icône seul)
- Après duplication : titre = "Menu du DD Mmmm YYYY", redirection directe vers le nouveau menu

### UX — Modèles
- Modification des modèles en popup (cohérent avec les autres modales)
- Upload d'un nouveau fichier possible lors de la modification d'un modèle

### Technique
- Nouvelles Server Actions : `updateMenuLabel`, `archiveDish`, `reorderMenuItems`
- `duplicateMenu` retourne désormais `newMenuId` pour la navigation
- `updateTemplate` accepte remplacement de fichier (`newStoragePath`, `oldStoragePath`)

---

## v0.3.0 — 2026-04-07

### Templates dynamiques
- Table `mnu_templates` + bucket Storage `templates`
- Onglet "Modèles" dans la nav principale
- CRUD modèles : création (avec upload .docx), modification, suppression
- Génération de documents utilise désormais `templateId` + Storage (plus de fichiers statiques)
- `DocumentPanel` liste les modèles dynamiquement depuis la DB
- Guide docxtemplater : variables par catégorie, `featured_dishes`, drapeaux booléens

### Fix
- Balises docxtemplater inconnues → chaîne vide (plus d'erreur "Multi error")
- Messages d'erreur détaillés avec nom du tag fautif
- Storage RLS policies pour buckets `templates` et `generated-docs`

---

## v0.2.0 — 2026-04-07

### UX — Éditeur de menu
- Toutes les catégories affichées en permanence (même vides)
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
- Remplacement de l'`upsert` par un `insert` simple
- Ajout de `public/dishes_import.csv` : 123 plats de La Pomme d'Adam pré-formatés

---

## v0.1.0 — 2026-04-07

### Initial setup

- Structure du projet créée (`menu-management`, préfixe `mnu_`)
- Migration SQL `0002_menu-management.sql` : tables `mnu_dishes`, `mnu_menus`, `mnu_menu_items`, `mnu_generated_docs`
- Catalogue des plats : CRUD complet, import CSV/Excel
- Gestion des menus : création, duplication, suppression
- Éditeur de menu : assignation des plats, réordonnancement, mise en avant
- Génération documents : DOCX via `docxtemplater`, PDF via Gotenberg, stockage Supabase Storage TTL 48h
- Purge Vercel Cron quotidienne à 3h UTC
- Design Material (Tailwind), compatible iPad
- Docs initiales : overview, architecture, database, api, changelog
