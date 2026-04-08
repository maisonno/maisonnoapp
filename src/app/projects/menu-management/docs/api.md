# Menu Pomme — Server Actions & API

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
| `archiveDish` | `(id, archived)` | Archive (`is_active=false`) ou désarchive un plat |
| `importDishesFromCsv` | `(prev, formData)` | Parse CSV/Excel + insert en batch |

**Format CSV attendu pour l'import :**
Colonnes (insensibles à la casse) : `nom`, `description`, `prix`, `catégorie`, `actif`  
Catégories acceptées : `entrée`, `à partager`, `plat`, `pizza`, `salade`, `dessert`, `glace`

### Menus

| Fonction | Signature | Description |
|----------|-----------|-------------|
| `createMenu` | `(prev, formData)` | Crée un menu vide |
| `duplicateMenu` | `(sourceId)` | Duplique menu + items, titre = "Menu du DD Mmmm YYYY", retourne `newMenuId` |
| `updateMenuLabel` | `(menuId, label)` | Renomme un menu |
| `deleteMenu` | `(id)` | Supprime menu + cascade items + docs |

### Items de menu

| Fonction | Signature | Description |
|----------|-----------|-------------|
| `addDishToMenu` | `(menuId, dishId)` | Ajoute le plat à la fin de sa catégorie dans le menu |
| `removeDishFromMenu` | `(itemId)` | Retire le plat du menu |
| `reorderMenuItems` | `(orderedItemIds[])` | Réordonne les items d'une catégorie (drag & drop) |
| `toggleFeatured` | `(itemId, currentValue)` | Bascule `is_featured` |

### Modèles

| Fonction | Signature | Description |
|----------|-----------|-------------|
| `createTemplate` | `(name, storagePath, description)` | Crée un modèle en DB (fichier déjà uploadé côté client) |
| `updateTemplate` | `(id, name, description, newStoragePath?, oldStoragePath?)` | Met à jour nom/description, remplace le fichier si `newStoragePath` fourni |
| `deleteTemplate` | `(id, storagePath)` | Supprime le modèle en DB + le fichier dans Storage |

---

## Routes API

### `POST /projects/menu-management/api/generate-docs`

Génère DOCX + PDF pour un menu et un template donné.

**Auth** : cookie de session Supabase requis.

**Body JSON :**
```json
{
  "menuId": "uuid",
  "templateId": "uuid"
}
```

**Flow :**
1. Vérification auth
2. Fetch template (`mnu_templates`) — vérifie que `storage_path` est présent
3. Fetch menu + items (ordonnés par catégorie puis position)
4. Téléchargement du `.docx` depuis Supabase Storage bucket `templates`
5. Remplissage via `docxtemplater` + `pizzip`
6. Upload DOCX → Supabase Storage `generated-docs/`
7. POST DOCX → Gotenberg (`/forms/libreoffice/convert`) → PDF
8. Upload PDF → Supabase Storage
9. Insert `mnu_generated_docs` (`expires_at = now() + 48h`)
10. Retourne URLs signées valables 48h

**Response 200 :**
```json
{
  "doc": { "id": "...", "docx_path": "url signée", "pdf_path": "url signée" },
  "pdf_warning": null
}
```

**Note :** si Gotenberg échoue ou `GOTENBERG_URL` n'est pas configuré, `pdf_warning` contient le message d'erreur et seul le DOCX est disponible.

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

## Modèles `.docx`

Stockés dans Supabase Storage bucket `templates` (privé).  
Gérés depuis l'onglet **Modèles** de l'application.  
Voir `docs/templates-guide.md` (ou téléchargeable depuis l'app) pour le guide de préparation complet.

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
