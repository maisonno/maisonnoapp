# Gestion des Menus — Vue d'ensemble

## Quoi

Application de gestion des menus quotidiens pour le restaurant **La Pomme d'Adam** (Île du Levant).

## Pourquoi

Chaque jour, le chef sélectionne les plats du menu parmi un catalogue, compose le menu, puis génère et imprime des documents prêts à l'affichage (affiche façade, menu à table, grande affiche).

## Pour qui

Usage exclusivement interne, par le chef (non-technicien), principalement depuis un **iPad**.

## Fonctionnalités

### Catalogue des plats
- Créer, modifier, supprimer des plats
- Champs : nom, description, prix, catégorie, actif (au menu)
- Catégories : Entrées, À partager, Plats, Pizzas, Salades, Desserts, Glaces
- Activer/désactiver un plat (toggle rapide)
- Importer des plats en masse via CSV ou Excel

### Gestion des menus
- Créer un menu (libellé + date)
- Dupliquer un menu existant (date = aujourd'hui, items copiés)
- Supprimer un menu
- Assigner des plats à un menu depuis le catalogue
- Réordonner les plats **à l'intérieur de chaque catégorie** (boutons ↑↓, compatible iPad)
- Marquer des plats comme "mis en avant"

### Génération de documents
- 3 templates distincts : menu à table (A5), affiche façade (A4), grande affiche (A3)
- Génération DOCX via `docxtemplater` (templates `.docx` dans `public/templates/`)
- Conversion PDF via **Gotenberg** (service Docker externe sur Railway/Render)
- Ouverture PDF dans un nouvel onglet → impression directe (iPad + desktop)
- Téléchargement DOCX direct
- Documents conservés 48h dans Supabase Storage, purgés automatiquement par Vercel Cron

## Route

`/projects/menu-management`

## Code projet

`MENU_POM`
