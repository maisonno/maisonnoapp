# Guide des templates Word — Menu Pomme

## Principe général

Les templates `.docx` utilisent la syntaxe **docxtemplater**.  
Tu crées ton document Word normalement (mise en page, polices, couleurs, tableaux), et tu places des **balises** aux endroits où les données doivent apparaître.

Lors de la génération, l'application remplace les balises par les vraies données du menu.

> **Important :** incorporer les polices dans le fichier Word avant l'upload  
> (Fichier → Options → Enregistrement → Incorporer les polices dans le fichier)  
> Sinon, LibreOffice substitue les polices lors de la conversion PDF.

---

## Les balises

### Balise simple : `{variable}`
Remplacée par la valeur correspondante.

```
{menu_label}   →   Menu du midi
{menu_date}    →   lundi 7 avril 2026
{notes}        →   (notes internes, vide si non renseigné)
```

### Boucle : `{#liste} … {/liste}`
Le bloc entre les deux balises est répété pour chaque élément.

```
{#plats}
{name} …………………………… {price}
{/plats}
```
→ génère une ligne par plat.

### Conditionnel : `{#booleen} … {/booleen}`
Le bloc n'apparaît que si la condition est vraie.

```
{#is_featured}★ {/is_featured}{name}
```
→ affiche ★ uniquement pour les plats mis en avant.

---

## Toutes les variables disponibles

### Informations du menu

| Variable | Exemple de valeur |
|---|---|
| `{menu_label}` | Menu du midi |
| `{menu_date}` | lundi 7 avril 2026 |
| `{notes}` | Terrasse ouverte |

### Par catégorie (boucle)

Chaque variable est une liste de plats. Dans la boucle, tu accèdes à :

| Variable | Valeur |
|---|---|
| `{name}` | Poulet chasseur |
| `{description}` | Filet de poulet, champignons… |
| `{price}` | 23.00 € |
| `{#is_featured}` | vrai si le plat est mis en avant |

**Les 7 catégories :**

```
{#entrees}    … {/entrees}       Entrées
{#a_partager} … {/a_partager}    À partager
{#plats}      … {/plats}         Plats
{#pizzas}     … {/pizzas}        Pizzas
{#salades}    … {/salades}       Salades
{#desserts}   … {/desserts}      Desserts
{#glaces}     … {/glaces}        Glaces
```

### Drapeaux booléens (affichage conditionnel)

Utile pour masquer une section si elle est vide :

```
{#has_entrees}    … {/has_entrees}
{#has_a_partager} … {/has_a_partager}
{#has_plats}      … {/has_plats}
{#has_pizzas}     … {/has_pizzas}
{#has_salades}    … {/has_salades}
{#has_desserts}   … {/has_desserts}
{#has_glaces}     … {/has_glaces}
```

### Plats mis en avant

```
{#featured_dishes}
  {name} — {description} …………… {price}
{/featured_dishes}

{#has_featured} … {/has_featured}   →  section visible uniquement s'il y a des plats mis en avant
```

### Boucle générique toutes catégories

```
{#categories}
  {label}
  {#dishes}
    {name}  {description}  {price}
  {/dishes}
{/categories}
```

---

## Exemples complets

### Exemple 1 — Affiche façade (plats uniquement)

```
LA POMME D'ADAM

{menu_date}

──────────────────────────────────────

NOS PLATS

{#plats}
{name}
{description}
{price}

{/plats}
```

---

### Exemple 2 — Menu à table avec sections séparées

```
{menu_label}
{menu_date}

{#has_entrees}
ENTRÉES
{#entrees}
{#is_featured}★ {/is_featured}{name} …………… {price}
{description}

{/entrees}
{/has_entrees}

PLATS
{#plats}
{#is_featured}★ {/is_featured}{name} …………… {price}
{description}

{/plats}

{#has_desserts}
DESSERTS
{#desserts}
{name} …………… {price}
{/desserts}
{/has_desserts}
```

---

### Exemple 3 — Affiche avec "Nos suggestions" en avant

```
{menu_date}

★ NOS SUGGESTIONS ★
{#featured_dishes}
{name}
{description}
{price}
{/featured_dishes}

────────────────────

PLATS DU JOUR
{#plats}
{name} …………… {price}
{/plats}
```

---

### Exemple 4 — Grande affiche A3 avec tableau Word

Dans un tableau Word :

| **{menu_label}** | **{menu_date}** |
|---|---|
| **ENTRÉES** | **PLATS** |
| {#entrees}{name} — {price} | {#plats}{name} — {price} |
| {description}{/entrees} | {description}{/plats} |
| **DESSERTS** | **PIZZAS** |
| {#desserts}{name} — {price}{/desserts} | {#pizzas}{name} — {price}{/pizzas} |

---

## Règles importantes

1. **Ne pas couper une balise** sur deux lignes ou deux cellules.  
   ✅ `{#plats}` dans une cellule, `{/plats}` dans la même cellule  
   ❌ `{#plats}` dans une cellule, `{/plats}` dans une cellule différente

2. **Respecter la casse exactement** : `{menu_label}` pas `{Menu_Label}`

3. **La ligne de boucle est répétée** : le paragraphe/la ligne qui contient `{name}` est dupliqué pour chaque plat. Mettre les éléments à répéter *entre* `{#plats}` et `{/plats}`.

4. **Tester avec un template simple** avant de travailler sur la mise en page finale.

5. **Sauts de page** : utilise les sauts de page natifs de Word (Insertion → Saut de page) entre les sections.

6. **Si les balises sont "coupées" par Word** (erreur "Unopened loop") : supprimer et retaper la balise entière sans interruption, ou taper dans Notepad puis coller dans Word.

---

## Workflow recommandé

1. Créer le template dans Word avec des données fictives pour voir le rendu
2. Activer l'incorporation des polices (Fichier → Options → Enregistrement)
3. Remplacer les données fictives par les balises
4. Uploader le fichier dans l'onglet **Modèles** de l'application
5. Générer depuis un menu et vérifier le résultat
6. Ajuster jusqu'au rendu souhaité
7. Pour mettre à jour un template : onglet **Modèles** → crayon → uploader le nouveau fichier
