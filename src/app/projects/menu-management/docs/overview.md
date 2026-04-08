# Menu Pomme — Vue d'ensemble

## Quoi

Application de gestion des menus quotidiens pour le restaurant **La Pomme d'Adam** (Île du Levant).

## Pourquoi

Chaque jour, le chef sélectionne les plats du menu parmi un catalogue, compose le menu, puis génère et imprime des documents prêts à l'affichage (affiche façade, menu à table, grande affiche).

## Pour qui

Usage exclusivement interne, par le chef (non-technicien), principalement depuis un **iPad**.

## Fonctionnalités

### Catalogue des plats
- Créer, modifier, supprimer des plats
- Champs : nom, description, prix, catégorie
- Catégories : Entrées, À partager, Plats, Pizzas, Salades, Desserts, Glaces
- Archiver / désarchiver un plat (les plats archivés sont masqués à la saisie de menu)
- Importer des plats en masse via CSV ou Excel
- Filtrage par sous-onglets : Tous · Entrées · À partager · Plats · Pizzas · Salades · Desserts · Glaces · Archivés

### Gestion des menus
- Créer un menu (libellé + date)
- Dupliquer un menu existant (titre = "Menu du DD Mmmm YYYY", items copiés, ouvre directement le nouveau menu)
- Renommer un menu via le bouton crayon dans l'éditeur
- Supprimer un menu
- Assigner des plats à un menu depuis le catalogue
- Réordonner les plats par drag & drop (poignée 3 traits, compatible iPad/iPhone)
- Marquer des plats comme "mis en avant" (étoile pleine / contour)

### Gestion des modèles
- Créer, modifier, supprimer des modèles de document
- Upload du fichier `.docx` directement dans l'app (Supabase Storage bucket `templates`)
- Télécharger le fichier `.docx` d'un modèle
- Modifier le fichier d'un modèle existant (remplacement)
- Guide de préparation des templates téléchargeable depuis l'onglet Modèles

### Génération de documents
- Génération DOCX via `docxtemplater` (template téléchargé depuis Supabase Storage)
- Conversion PDF via **Gotenberg** (service Docker externe sur Railway)
- Ouverture PDF dans un nouvel onglet → impression directe (iPad + desktop)
- Téléchargement DOCX direct
- Documents conservés 48h dans Supabase Storage (`generated-docs`), purgés automatiquement par Vercel Cron

## Route

`/projects/menu-management`

## Code projet

`MENU_POM`
