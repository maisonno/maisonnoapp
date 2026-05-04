'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { parseDishesFromBuffer } from './lib/csv-parser'
import type { ActionState, DishCategory } from './lib/types'

const REVALIDATE_PATH = '/projects/menu-management'

// ─────────────────────────────────────────────
// DISHES
// ─────────────────────────────────────────────

export async function createDish(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const supabase = await createClient()

  const name = formData.get('name') as string
  const description = (formData.get('description') as string) || null
  const priceRaw = formData.get('price') as string
  const price = priceRaw ? parseFloat(priceRaw) : null
  const category = formData.get('category') as DishCategory
  const is_active = formData.get('is_active') !== 'false'

  if (!name?.trim()) return { error: 'Le nom est obligatoire.' }

  const { error } = await supabase.from('mnu_dishes').insert({
    name: name.trim(),
    description: description?.trim() || null,
    price,
    category,
    is_active,
  })

  if (error) return { error: error.message }

  revalidatePath(REVALIDATE_PATH)
  return { success: 'Plat créé.' }
}

export async function updateDish(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const supabase = await createClient()

  const id = formData.get('id') as string
  const name = formData.get('name') as string
  const description = (formData.get('description') as string) || null
  const priceRaw = formData.get('price') as string
  const price = priceRaw ? parseFloat(priceRaw) : null
  const category = formData.get('category') as DishCategory
  const is_active = formData.get('is_active') !== 'false'

  if (!name?.trim()) return { error: 'Le nom est obligatoire.' }

  const { error } = await supabase
    .from('mnu_dishes')
    .update({ name: name.trim(), description: description?.trim() || null, price, category, is_active })
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath(REVALIDATE_PATH)
  return { success: 'Plat mis à jour.' }
}

export async function deleteDish(id: string): Promise<ActionState> {
  const supabase = await createClient()

  // Check not used in any menu
  const { count } = await supabase
    .from('mnu_menu_items')
    .select('id', { count: 'exact', head: true })
    .eq('dish_id', id)

  if (count && count > 0) {
    return { error: 'Ce plat est utilisé dans un menu. Retirez-le d\'abord.' }
  }

  const { error } = await supabase.from('mnu_dishes').delete().eq('id', id)
  if (error) return { error: error.message }

  revalidatePath(REVALIDATE_PATH)
  return { success: 'Plat supprimé.' }
}

export async function toggleDishActive(id: string, currentValue: boolean): Promise<ActionState> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('mnu_dishes')
    .update({ is_active: !currentValue })
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath(REVALIDATE_PATH)
  return null
}

export async function importDishesFromCsv(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const file = formData.get('file') as File
  if (!file || file.size === 0) return { error: 'Fichier manquant.' }

  const buffer = await file.arrayBuffer()
  const { rows, errors } = parseDishesFromBuffer(buffer)

  if (errors.length > 0 && rows.length === 0) {
    return { error: errors.join('\n') }
  }

  const supabase = await createClient()
  const { error } = await supabase.from('mnu_dishes').insert(
    rows.map((r) => ({ ...r })),
  )

  if (error) return { error: error.message }

  revalidatePath(REVALIDATE_PATH)
  const msg = `${rows.length} plat(s) importé(s).${errors.length > 0 ? '\nAvertissements : ' + errors.join('; ') : ''}`
  return { success: msg }
}

// ─────────────────────────────────────────────
// MENUS
// ─────────────────────────────────────────────

export async function createMenu(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const supabase = await createClient()

  const label = formData.get('label') as string
  const menu_date = formData.get('menu_date') as string
  const notes = (formData.get('notes') as string) || null

  if (!label?.trim()) return { error: 'Le libellé est obligatoire.' }
  if (!menu_date) return { error: 'La date est obligatoire.' }

  const { error } = await supabase.from('mnu_menus').insert({
    label: label.trim(),
    menu_date,
    notes: notes?.trim() || null,
  })

  if (error) return { error: error.message }

  revalidatePath(REVALIDATE_PATH)
  return { success: 'Menu créé.' }
}

export async function duplicateMenu(sourceId: string): Promise<ActionState & { newMenuId?: string }> {
  const supabase = await createClient()

  // Fetch source menu
  const { data: source, error: srcErr } = await supabase
    .from('mnu_menus')
    .select('*')
    .eq('id', sourceId)
    .single()

  if (srcErr || !source) return { error: 'Menu source introuvable.' }

  const today = new Date()
  const label = `Menu du ${today.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}`

  const { data: newMenu, error: menuErr } = await supabase
    .from('mnu_menus')
    .insert({
      label,
      menu_date: today.toISOString().slice(0, 10),
      notes: source.notes,
    })
    .select('id')
    .single()

  if (menuErr || !newMenu) return { error: menuErr?.message ?? 'Erreur de duplication.' }

  // Copy items
  const { data: items } = await supabase
    .from('mnu_menu_items')
    .select('dish_id, position, is_featured')
    .eq('menu_id', sourceId)

  if (items && items.length > 0) {
    const { error: itemsErr } = await supabase.from('mnu_menu_items').insert(
      items.map((item) => ({
        menu_id: newMenu.id,
        dish_id: item.dish_id,
        position: item.position,
        is_featured: item.is_featured,
      })),
    )
    if (itemsErr) return { error: itemsErr.message }
  }

  revalidatePath(REVALIDATE_PATH)
  return { success: 'Menu dupliqué.', newMenuId: newMenu.id }
}

export async function updateMenuLabel(menuId: string, label: string): Promise<ActionState> {
  const supabase = await createClient()
  if (!label.trim()) return { error: 'Le libellé est obligatoire.' }
  const { error } = await supabase.from('mnu_menus').update({ label: label.trim() }).eq('id', menuId)
  if (error) return { error: error.message }
  revalidatePath(REVALIDATE_PATH)
  return { success: 'Libellé mis à jour.' }
}

export async function archiveDish(id: string, archived: boolean): Promise<ActionState> {
  const supabase = await createClient()
  const { error } = await supabase.from('mnu_dishes').update({ is_active: !archived }).eq('id', id)
  if (error) return { error: error.message }
  revalidatePath(REVALIDATE_PATH)
  return null
}

export async function reorderMenuItems(orderedItemIds: string[]): Promise<ActionState> {
  const supabase = await createClient()
  await Promise.all(
    orderedItemIds.map((id, idx) =>
      supabase.from('mnu_menu_items').update({ position: idx }).eq('id', id),
    ),
  )
  revalidatePath(REVALIDATE_PATH)
  return null
}

export async function deleteMenu(id: string): Promise<ActionState> {
  const supabase = await createClient()
  const { error } = await supabase.from('mnu_menus').delete().eq('id', id)
  if (error) return { error: error.message }

  revalidatePath(REVALIDATE_PATH)
  return { success: 'Menu supprimé.' }
}

// ─────────────────────────────────────────────
// MENU ITEMS
// ─────────────────────────────────────────────

export async function addDishToMenu(menuId: string, dishId: string): Promise<ActionState> {
  const supabase = await createClient()

  // Get the dish category to calculate next position within category
  const { data: dish } = await supabase
    .from('mnu_dishes')
    .select('category')
    .eq('id', dishId)
    .single()

  if (!dish) return { error: 'Plat introuvable.' }

  // Find max position within same category in this menu
  const { data: existing } = await supabase
    .from('mnu_menu_items')
    .select('position, mnu_dishes!inner(category)')
    .eq('menu_id', menuId)
    .eq('mnu_dishes.category', dish.category)
    .order('position', { ascending: false })
    .limit(1)

  const nextPosition = existing && existing.length > 0 ? (existing[0].position as number) + 1 : 0

  const { error } = await supabase.from('mnu_menu_items').insert({
    menu_id: menuId,
    dish_id: dishId,
    position: nextPosition,
  })

  if (error) {
    if (error.code === '23505') return { error: 'Ce plat est déjà dans le menu.' }
    return { error: error.message }
  }

  revalidatePath(REVALIDATE_PATH)
  return null
}

export async function removeDishFromMenu(itemId: string): Promise<ActionState> {
  const supabase = await createClient()
  const { error } = await supabase.from('mnu_menu_items').delete().eq('id', itemId)
  if (error) return { error: error.message }

  revalidatePath(REVALIDATE_PATH)
  return null
}

export async function moveItemUp(itemId: string): Promise<ActionState> {
  return _swapItems(itemId, 'up')
}

export async function moveItemDown(itemId: string): Promise<ActionState> {
  return _swapItems(itemId, 'down')
}

async function _swapItems(itemId: string, direction: 'up' | 'down'): Promise<ActionState> {
  const supabase = await createClient()

  // Fetch current item + its dish category
  const { data: item } = await supabase
    .from('mnu_menu_items')
    .select('id, menu_id, position, dish:mnu_dishes(category)')
    .eq('id', itemId)
    .single()

  if (!item) return { error: 'Item introuvable.' }

  const category = (item.dish as unknown as { category: DishCategory }).category

  // Fetch all items in same category, ordered by position
  const { data: siblings } = await supabase
    .from('mnu_menu_items')
    .select('id, position, dish:mnu_dishes!inner(category)')
    .eq('menu_id', item.menu_id)
    .eq('mnu_dishes.category', category)
    .order('position')

  if (!siblings) return null

  const idx = siblings.findIndex((s) => s.id === itemId)
  const targetIdx = direction === 'up' ? idx - 1 : idx + 1

  if (targetIdx < 0 || targetIdx >= siblings.length) return null

  const current = siblings[idx]
  const target = siblings[targetIdx]

  // Swap positions
  await supabase.from('mnu_menu_items').update({ position: target.position }).eq('id', current.id)
  await supabase.from('mnu_menu_items').update({ position: current.position }).eq('id', target.id)

  revalidatePath(REVALIDATE_PATH)
  return null
}

export async function toggleFeatured(itemId: string, currentValue: boolean): Promise<ActionState> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('mnu_menu_items')
    .update({ is_featured: !currentValue })
    .eq('id', itemId)

  if (error) return { error: error.message }

  revalidatePath(REVALIDATE_PATH)
  return null
}

// ─────────────────────────────────────────────
// TEMPLATES
// ─────────────────────────────────────────────

export async function createTemplate(
  name: string,
  storagePath: string,
  description: string,
  flipEvenPages: boolean,
): Promise<ActionState> {
  const supabase = await createClient()

  const { error } = await supabase.from('mnu_templates').insert({
    name: name.trim(),
    storage_path: storagePath,
    description: description.trim() || null,
    flip_even_pages: flipEvenPages,
  })

  if (error) return { error: error.message }

  revalidatePath(REVALIDATE_PATH)
  return { success: 'Modèle créé.' }
}

export async function updateTemplate(
  id: string,
  name: string,
  description: string,
  flipEvenPages: boolean,
  newStoragePath?: string,
  oldStoragePath?: string,
): Promise<ActionState> {
  const supabase = await createClient()

  const updateData: Record<string, string | boolean | null> = {
    name: name.trim(),
    description: description.trim() || null,
    flip_even_pages: flipEvenPages,
  }
  if (newStoragePath) updateData.storage_path = newStoragePath

  const { error } = await supabase.from('mnu_templates').update(updateData).eq('id', id)
  if (error) return { error: error.message }

  // Delete old file if replaced
  if (newStoragePath && oldStoragePath) {
    await supabase.storage.from('templates').remove([oldStoragePath])
  }

  revalidatePath(REVALIDATE_PATH)
  return { success: 'Modèle mis à jour.' }
}

export async function deleteTemplate(id: string, storagePath: string | null): Promise<ActionState> {
  const supabase = await createClient()

  if (storagePath) {
    await supabase.storage.from('templates').remove([storagePath])
  }

  const { error } = await supabase.from('mnu_templates').delete().eq('id', id)
  if (error) return { error: error.message }

  revalidatePath(REVALIDATE_PATH)
  return { success: 'Modèle supprimé.' }
}
