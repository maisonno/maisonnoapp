export type Modele = {
  id: string
  nom: string
  prix: number
  // Prix par variante (€) : { "T-Shirt": 29, "Sweat": 49, ... }
  prixVariantes: Record<string, number>
  variantes: string[]
  tailles: string[]
  actif: boolean
}

// Article = déclinaison concrète (modèle × variante × taille) + stock courant
export type Article = {
  id: string
  modele_id: string
  variante: string
  taille: string
  actif: boolean
  stock: number
  // Prix propre à l'article (par variante). null → on retombe sur le prix du modèle.
  prix: number | null
}

// Modèle enrichi de ses articles actifs (pour la saisie de vente)
export type ModeleWithArticles = Modele & {
  articles: Article[]
  stockTotal: number
}

export type Vente = {
  id: string
  date: string
  article_id: string
  quantite: number
  prix_unitaire: number
  notes: string | null
  created_at: string
  // dénormalisé pour l'affichage
  modele_nom: string
  variante: string
  taille: string
}

export type Mouvement = {
  id: string
  date: string
  article_id: string
  quantite: number
  sens: 'reception' | 'retrait'
  motif: string | null
  created_at: string
  // dénormalisé pour l'affichage
  modele_nom: string
  variante: string
  taille: string
}

export type ActionState = {
  error?: string
  success?: boolean
}
