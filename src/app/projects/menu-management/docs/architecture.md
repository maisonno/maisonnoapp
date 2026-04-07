# Gestion des Menus — Architecture

## Structure des fichiers

```
src/app/projects/menu-management/
├── page.tsx                          ← Dashboard (onglets Menus | Plats)
├── [menuId]/page.tsx                 ← Éditeur d'un menu
├── actions.ts                        ← Toutes les Server Actions
├── components/
│   ├── TabBar.tsx                    ← Client, navigation par URL query param ?tab=
│   ├── menus/
│   │   ├── MenuList.tsx              ← Client (état create modal)
│   │   ├── MenuCard.tsx              ← Client (import actions)
│   │   ├── CreateMenuModal.tsx       ← Client, useActionState(createMenu)
│   │   └── MenuActions.tsx           ← Client, useTransition
│   ├── editor/
│   │   ├── MenuEditorClient.tsx      ← Client, réordonnancement + featured
│   │   ├── DishPickerModal.tsx       ← Client, ajout de plats au menu
│   │   └── DocumentPanel.tsx         ← Client, fetch API generate-docs
│   └── dishes/
│       ├── DishList.tsx              ← Client (état modals + filtres)
│       ├── DishCard.tsx              ← Client (edit/delete)
│       ├── DishFormModal.tsx         ← Client, useActionState(createDish|updateDish)
│       ├── DishToggleActive.tsx      ← Client, useTransition
│       └── CsvImportModal.tsx        ← Client, useActionState(importDishesFromCsv)
├── api/
│   ├── generate-docs/route.ts        ← POST — génère DOCX + PDF
│   └── cleanup-docs/route.ts         ← GET — purge (Vercel Cron)
└── lib/
    ├── types.ts                       ← Types + constantes (CATEGORY_ORDER, LABELS)
    ├── queries.ts                     ← Fonctions fetch Supabase (Server Components)
    └── csv-parser.ts                  ← Parse CSV/Excel avec xlsx
```

## Composants : Server vs Client

| Composant | Type | Raison |
|-----------|------|--------|
| `page.tsx` | Server | Fetch auth + données Supabase |
| `[menuId]/page.tsx` | Server | Fetch menu + items + docs |
| `TabBar` | Client | `useSearchParams()` |
| `MenuList` | Client | État modal création |
| `MenuCard` | Client | Import de Server Actions |
| `DishList` | Client | Filtres locaux + état modals |
| `DishCard` | Client | Delete + edit |
| `MenuEditorClient` | Client | useTransition pour ↑↓ + featured |
| `DocumentPanel` | Client | Fetch API `generate-docs` |

## Flux de données

### Mutations (Server Actions)
```
Client Component
  → appelle Server Action (actions.ts)
  → Supabase mutation
  → revalidatePath('/projects/menu-management')
  → React rerender automatique
```

### Génération de documents
```
DocumentPanel (client)
  → POST /api/generate-docs { menuId, template }
  → API Route (serveur)
    → Fetch menu data (Supabase)
    → Fill .docx template (docxtemplater)
    → Upload DOCX (Supabase Storage)
    → POST DOCX → Gotenberg → PDF
    → Upload PDF (Supabase Storage)
    → Insert mnu_generated_docs
    → Retourne { doc: GeneratedDoc } avec URLs signées
  → DocumentPanel affiche liens PDF/DOCX
```

### Réordonnancement (↑↓)
```
MenuEditorClient
  → moveItemUp(itemId) / moveItemDown(itemId)
  → _swapItems() :
    1. Fetch l'item + sa catégorie
    2. Fetch tous les items de la même catégorie
    3. Swap les valeurs `position` des deux voisins
  → revalidatePath()
```

## Routing

| URL | Composant | Description |
|-----|-----------|-------------|
| `/projects/menu-management` | page.tsx | Liste menus (défaut) |
| `/projects/menu-management?tab=dishes` | page.tsx | Catalogue plats |
| `/projects/menu-management/[menuId]` | [menuId]/page.tsx | Éditeur menu |

## Design

Material Design classique avec Tailwind CSS. Pas de classes tiki (spécifique à cette app).
- Fond : `bg-gray-50`
- Cards : `bg-white rounded-lg border shadow-sm`
- Actions primaires : `bg-blue-600 text-white rounded-md`
- Danger : hover `text-red-600 bg-red-50`
- Font : Lato (héritée du layout racine)
