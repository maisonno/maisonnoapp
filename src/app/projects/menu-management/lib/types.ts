export type DishCategory =
  | 'entree'
  | 'a_partager'
  | 'plat'
  | 'pizza'
  | 'salade'
  | 'dessert'
  | 'glace'

export const CATEGORY_ORDER: DishCategory[] = [
  'entree',
  'a_partager',
  'plat',
  'pizza',
  'salade',
  'dessert',
  'glace',
]

export const CATEGORY_LABELS: Record<DishCategory, string> = {
  entree: 'Entrées',
  a_partager: 'À partager',
  plat: 'Plats',
  pizza: 'Pizzas',
  salade: 'Salades',
  dessert: 'Desserts',
  glace: 'Glaces',
}

export type Dish = {
  id: string
  name: string
  description: string | null
  price: number | null
  category: DishCategory
  is_active: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

export type Menu = {
  id: string
  label: string
  menu_date: string
  notes: string | null
  created_at: string
  updated_at: string
}

export type MenuItem = {
  id: string
  menu_id: string
  dish_id: string
  position: number
  is_featured: boolean
  created_at: string
  updated_at: string
  dish: Dish
}

export type MenuWithItems = Menu & {
  items: MenuItem[]
}

export type GeneratedDoc = {
  id: string
  menu_id: string
  template_name: string
  docx_path: string | null
  pdf_path: string | null
  pdf_inversed_path: string | null
  expires_at: string
  created_at: string
}

export type Template = {
  id: string
  name: string
  storage_path: string | null
  description: string | null
  flip_even_pages: boolean
  created_at: string
  updated_at: string
}

export type ActionState = { error?: string; success?: string } | null
