// Tailles disponibles, dans l'ordre d'affichage
export const TAILLES = ['XS', 'S', 'M', 'L', 'XL', '2XL', 'TU'] as const

// Variantes proposées par défaut lors de la création d'un modèle
export const VARIANTES = [
  'Tshirt homme',
  'Tshirt femme',
  'Sweat',
  'Col V',
  'Débardeur',
] as const

// Prix indicatif par défaut d'une variante (€), pré-rempli dans le formulaire
// quand on coche une variante. L'utilisateur reste libre de le modifier.
export const PRIX_VARIANTE_DEFAUT: Record<string, number> = {
  'T-Shirt': 29,
  'Tshirt homme': 29,
  'T-Shirt Femme': 29,
  'Tshirt femme': 29,
  'Débardeur': 29,
  'T-Shirt Col V': 35,
  'Col V': 35,
  'Sweat': 49,
  'Mug': 15,
}

// Trie une liste de tailles selon l'ordre canonique TAILLES
export function sortTailles(values: string[]): string[] {
  return [...values].sort(
    (a, b) => TAILLES.indexOf(a as (typeof TAILLES)[number]) - TAILLES.indexOf(b as (typeof TAILLES)[number]),
  )
}
