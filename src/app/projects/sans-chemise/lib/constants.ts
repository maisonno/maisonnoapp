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

// Trie une liste de tailles selon l'ordre canonique TAILLES
export function sortTailles(values: string[]): string[] {
  return [...values].sort(
    (a, b) => TAILLES.indexOf(a as (typeof TAILLES)[number]) - TAILLES.indexOf(b as (typeof TAILLES)[number]),
  )
}
