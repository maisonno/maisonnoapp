import { createClient } from '@/lib/supabase/server'
import type { Dish, Menu, MenuItem, MenuWithItems, GeneratedDoc, Template } from './types'
import { CATEGORY_ORDER } from './types'

export async function getDishes(): Promise<Dish[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('mnu_dishes')
    .select('*')
    .order('category')
    .order('sort_order')
    .order('name')

  if (error) throw new Error(error.message)
  return data as Dish[]
}

export async function getMenus(): Promise<Menu[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('mnu_menus')
    .select('*')
    .order('menu_date', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return data as Menu[]
}

export async function getMenuWithItems(menuId: string): Promise<MenuWithItems | null> {
  const supabase = await createClient()

  const { data: menu, error: menuError } = await supabase
    .from('mnu_menus')
    .select('*')
    .eq('id', menuId)
    .single()

  if (menuError) return null

  const { data: items, error: itemsError } = await supabase
    .from('mnu_menu_items')
    .select('*, dish:mnu_dishes(*)')
    .eq('menu_id', menuId)
    .order('position')

  if (itemsError) throw new Error(itemsError.message)

  const sortedItems = (items as MenuItem[]).sort((a, b) => {
    const catA = CATEGORY_ORDER.indexOf(a.dish.category)
    const catB = CATEGORY_ORDER.indexOf(b.dish.category)
    if (catA !== catB) return catA - catB
    return a.position - b.position
  })

  return { ...(menu as Menu), items: sortedItems }
}

export async function getGeneratedDocs(menuId: string): Promise<GeneratedDoc[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('mnu_generated_docs')
    .select('*')
    .eq('menu_id', menuId)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return data as GeneratedDoc[]
}

export async function getTemplates(): Promise<Template[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('mnu_templates')
    .select('*')
    .order('created_at')

  if (error) throw new Error(error.message)
  return data as Template[]
}
