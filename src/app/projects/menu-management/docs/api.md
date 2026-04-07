# Gestion des Menus — Server Actions & API

## Server Actions (`actions.ts`)

Toutes les mutations passent par des Server Actions Next.js 15.  
Signature standard : `(prev: ActionState, formData: FormData) => Promise<ActionState>`  
ou pour les actions directes : `(id: string) => Promise<ActionState>`

### Plats

| Fonction | Signature | Description |
|----------|-----------|-------------|
| `createDish` | `(prev, formData)` | Crée un plat |
| `updateDish` | `(prev, formData)` | Modifie un plat (nécessite `id` dans formData) |
| `deleteDish` | `(id)` | Supprime si non utilisé dans un menu |
| `toggleDishActive` | `(id, currentValue)` | Bascule `is_active` |
| `importDishesFromCsv` | `(prev, formData)` | Parse + upsert en batch (conflict sur `name`) |

### Menus

| Fonction | Signature | Description |
|----------|-----------|-------------|
| `createMenu` | `(prev, formData)` | Crée un menu vide |
| `duplicateMenu` | `(sourceId)` | Duplique menu + tous ses items, date = aujourd'hui |
| `deleteMenu` | `(id)` | Supprime menu + cascade items + docs |

### Items de menu

| Fonction | Signature | Description |
|----------|-----------|-------------|
| `addDishToMenu` | `(menuId, dishId)` | Ajoute à la fin de sa catégorie |
| `removeDishFromMenu` | `(itemId)` | Retire du menu |
| `moveItemUp` | `(itemId)` | ↑ dans la catégorie |
| `moveItemDown` | `(itemId)` | ↓ dans la catégorie |
| `toggleFeatured` | `(itemId, currentValue)` | Bascule `is_featured` |

## Routes API

### `POST /projects/menu-management/api/generate-docs`

Génère DOCX + PDF pour un menu et un template donné.

**Auth** : Cookie de session Supabase requis.

**Body** :
```json
{
  "menuId": "uuid",
  "template": "menu-table" | "affiche-facade" | "grande-affiche"
}
```

**Flow** :
1. Auth check
2. Fetch menu + items (ordonnés par catégorie puis position)
3. Lire `public/templates/{template}.docx`
4. Remplir avec `docxtemplater` (données : `menu_label`, `menu_date`, `categories[]`, `all_dishes[]`)
5. Upload DOCX → Supabase Storage `generated-docs/`
6. POST DOCX → Gotenberg (`/forms/libreoffice/convert`) → PDF
7. Upload PDF → Supabase Storage
8. Insert `mnu_generated_docs` (expires_at = +48h)
9. Retourne URLs signées (48h)

**Response 200** :
```json
{ "doc": { "id": "...", "docx_path": "...", "pdf_path": "..." } }
```

**Response erreur** :
```json
{ "error": "message" }
```

### Variables template docxtemplater

```
{{menu_label}}          — Libellé du menu
{{menu_date}}           — Date formatée en français
{{notes}}               — Notes du menu

{{#categories}}         — Boucle par catégorie
  {{label}}             — Nom de la catégorie
  {{#dishes}}
    {{name}}
    {{description}}
    {{price}}
    {{#is_featured}}⭐{{/is_featured}}
  {{/dishes}}
{{/categories}}
```

### `GET /projects/menu-management/api/cleanup-docs`

Purge les documents expirés (TTL 48h).

**Auth** : Header `Authorization: Bearer {CRON_SECRET}`

**Appelé par** : Vercel Cron (quotidien à 3h UTC, config dans `vercel.json`)

**Flow** :
1. Vérifier `CRON_SECRET`
2. Fetch `mnu_generated_docs` où `expires_at < now()`
3. Supprimer fichiers Supabase Storage
4. Supprimer lignes DB

**Response** :
```json
{ "deleted": 5 }
```

## Templates DOCX

Les templates `.docx` sont stockés dans `public/templates/` :
- `menu-table.docx` — Menu à table (A5)
- `affiche-facade.docx` — Affiche façade (A4)
- `grande-affiche.docx` — Grande affiche (A3)

Ces fichiers sont **fournis par le client** (La Pomme d'Adam) et doivent utiliser la syntaxe `{{variable}}` de docxtemplater. Les fichiers dans le repo sont des placeholders vides.
