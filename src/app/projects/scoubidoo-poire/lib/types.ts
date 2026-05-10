export type TypeOperation = {
  id: string
  name: string
}

export type Mouvement = {
  id: string
  date: string
  type_operation_id: string | null
  type_operation_name: string | null
  entree: number | null
  sortie: number | null
  notes: string | null
  caisse_id: string | null
  created_at: string
}

export type MouvementFields = {
  date: string
  type_operation_id: string
  montant: string
  sens: 'entree' | 'sortie'
  notes: string
}

export type ActionState = {
  error?: string
  success?: boolean
}
