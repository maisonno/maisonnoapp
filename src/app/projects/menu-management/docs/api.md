# Gestion des Menus — Server Actions & API

## Server Actions (`actions.ts`)

Toutes les mutations passent par des Server Actions Next.js 15.  
Elles appellent toutes `revalidatePath('/projects/menu-management')` après une mutation réussie.

**Type de retour standard :**
```typescript
type ActionState = { error?: string; success?: string } | null
```

### Plats

| Fonction | Signature | Description |
|----------|-----------|-------------|
| `createDish` | `(prev, formData)` | Crée un plat |
| `updateDish` | `(prev, formData)` | Modifie un plat (nécessite `id` dans formData) |
| `deleteDish` | `(id)` | Supprime si le plat n'est utilisé dans aucun menu |
| `toggleDishActive` | `(id, currentValue)` | Bascule `is_active` |
| `importDishesFromCsv` | `(prev, formData)` | Parse CSV/Excel + insert en batch |

**Format CSV attendu pour l'import :**
Colonnes (insensibles à la casse) : `nom`, `description`, `prix`, `catégorie`, `actif`  
Catégories acceptées : `entrée`, `à partager`, `plat`, `pizza`, `salade`, `dessert`, `glace`

### Menus

| Fonction | Signature | Description |
|----------|-----------|-------------|
| `createMenu` | `(prev, formData)` | Crée un menu vide |
| `duplicateMenu` | `(sourceId)` | Duplique menu + tous ses items, date = aujourd'hui |
| `deleteMenu` | `(id)` | Supprime menu + cascade items + docs |

### Items de menu

| Fonction | Signature | Description |
|----------|-----------|-------------|
| `addDishToMenu` | `(menuId, dishId)` | Ajoute le plat à la fin de sa catégorie dans le menu |
| `removeDishFromMenu` | `(itemId)` | Retire le plat du menu |
| `moveItemUp` | `(itemId)` | ↑ dans la catégorie courante |
| `moveItemDown` | `(itemId)` | ↓ dans la catégorie courante |
| `toggleFeatured` | `(itemId, currentValue)` | Bascule `is_featured` |

---

## Routes API

### `POST /projects/menu-management/api/generate-docs`

Génère DOCX + PDF pour un menu et un template donné.

**Auth** : cookie de session Supabase requis.

**Body JSON :**
```json
{
  "menuId": "uuid",
  "template": "menu-table" | "affiche-facade" | "grande-affiche"
}
```

**Flow :**
1. Vérification auth
2. Fetch menu + items (ordonnés par catégorie puis position)
3. Lecture de `public/templates/{template}.docx`
4. Remplissage via `docxtemplater` + `pizzip`
5. Upload DOCX → Supabase Storage `generated-docs/`
6. POST DOCX → Gotenberg (`/forms/libreoffice/convert`) → PDF
7. Upload PDF → Supabase Storage
8. Insert `mnu_generated_docs` (`expires_at = now() + 48h`)
9. Retourne URLs signées valables 48h

**Response 200 :**
```json
{ "doc": { "id": "...", "docx_path": "url signée", "pdf_path": "url signée" } }
```

**Note :** si `GOTENBERG_URL` n'est pas configuré, le DOCX est généré mais le PDF est absent (`pdf_path: null`).

---

### `GET /projects/menu-management/api/cleanup-docs`

Purge les documents expirés (TTL 48h).

**Auth :** header `Authorization: Bearer {CRON_SECRET}`

**Appelé par :** Vercel Cron, quotidien à 3h UTC (config dans `vercel.json`)

**Flow :**
1. Vérifie `CRON_SECRET`
2. Fetch `mnu_generated_docs` où `expires_at < now()`
3. Supprime les fichiers Supabase Storage
4. Supprime les lignes DB

**Response :**
```json
{ "deleted": 5 }
```

---

## Variables disponibles dans les templates `.docx`

### Informations du menu

| Variable | Exemple |
|---|---|
| `{menu_label}` | Menu du midi |
| `{menu_date}` | lundi 7 avril 2026 |
| `{notes}` | Terrasse ouverte (vide si non renseigné) |

### Par catégorie (boucles indépendantes)

```
{#entrees}    {name}  {description}  {price}  {#is_featured}★{/is_featured}  {/entrees}
{#a_partager} {name}  {description}  {price}  {#is_featured}★{/is_featured}  {/a_partager}
{#plats}      {name}  {description}  {price}  {#is_featured}★{/is_featured}  {/plats}
{#pizzas}     {name}  {description}  {price}  {#is_featured}★{/is_featured}  {/pizzas}
{#salades}    {name}  {description}  {price}  {#is_featured}★{/is_featured}  {/salades}
{#desserts}   {name}  {description}  {price}  {#is_featured}★{/is_featured}  {/desserts}
{#glaces}     {name}  {description}  {price}  {#is_featured}★{/is_featured}  {/glaces}
```

### Drapeaux booléens (sections conditionnelles)

```
{#has_entrees}    … {/has_entrees}
{#has_a_partager} … {/has_a_partager}
{#has_plats}      … {/has_plats}
{#has_pizzas}     … {/has_pizzas}
{#has_salades}    … {/has_salades}
{#has_desserts}   … {/has_desserts}
{#has_glaces}     … {/has_glaces}
{#has_featured}   … {/has_featured}
```

### Plats mis en avant

```
{#featured_dishes}
  {name}  {description}  {price}  {category}
{/featured_dishes}
```

### Boucle générique toutes catégories (ordre canonique)

```
{#categories}
  {label}
  {#dishes}
    {name}  {description}  {price}  {#is_featured}★{/is_featured}
  {/dishes}
{/categories}
```

---

## Templates `.docx`

Stockés dans `public/templates/` (inclus dans le build Vercel) :

| Fichier | Format | Usage |
|---|---|---|
| `menu-table.docx` | A5 | Menu posé sur table |
| `affiche-facade.docx` | A4 | Affiche entrée du restaurant |
| `grande-affiche.docx` | A3 | Grande affiche extérieure |

Voir `docs/templates-guide.md` pour le guide de préparation complet.

---

## Variables d'environnement

| Variable | Obligatoire | Usage |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Oui | Client Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Oui | Client Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Oui (cleanup) | Purge des docs expirés |
| `GOTENBERG_URL` | Non* | Conversion DOCX → PDF |
| `CRON_SECRET` | Oui (cleanup) | Protection route de purge |

*Sans `GOTENBERG_URL`, seul le DOCX est généré (pas de PDF).
