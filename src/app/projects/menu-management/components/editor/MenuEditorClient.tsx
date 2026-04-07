'use client'

import { useState, useTransition } from 'react'
import { removeDishFromMenu, moveItemUp, moveItemDown, toggleFeatured } from '../../actions'
import type { Dish, MenuWithItems, DishCategory } from '../../lib/types'
import { CATEGORY_ORDER, CATEGORY_LABELS } from '../../lib/types'
import DishPickerModal from './DishPickerModal'
import DishFormModal from '../dishes/DishFormModal'

type Props = {
  menu: MenuWithItems
  allDishes: Dish[]
}

const CATEGORY_ADD_LABEL: Record<DishCategory, string> = {
  entree: 'une entrée',
  a_partager: 'un plat à partager',
  plat: 'un plat',
  pizza: 'une pizza',
  salade: 'une salade',
  dessert: 'un dessert',
  glace: 'une glace',
}

export default function MenuEditorClient({ menu, allDishes }: Props) {
  const [pickerCategory, setPickerCategory] = useState<DishCategory | null>(null)
  const [editingDish, setEditingDish] = useState<Dish | null>(null)
  const [showCreateDish, setShowCreateDish] = useState(false)
  const [isPending, startTransition] = useTransition()

  const assignedDishIds = new Set(menu.items.map((i) => i.dish_id))

  const grouped = CATEGORY_ORDER.reduce<Record<DishCategory, typeof menu.items>>((acc, cat) => {
    acc[cat] = menu.items.filter((i) => i.dish.category === cat)
    return acc
  }, {} as Record<DishCategory, typeof menu.items>)

  const handleRemove = (itemId: string) => {
    startTransition(async () => {
      const result = await removeDishFromMenu(itemId)
      if (result?.error) alert(result.error)
    })
  }

  const handleMoveUp = (itemId: string) => {
    startTransition(async () => { await moveItemUp(itemId) })
  }

  const handleMoveDown = (itemId: string) => {
    startTransition(async () => { await moveItemDown(itemId) })
  }

  const handleToggleFeatured = (itemId: string, current: boolean) => {
    startTransition(async () => { await toggleFeatured(itemId, current) })
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-gray-500">{menu.items.length} plat(s) dans ce menu</p>
        <button
          onClick={() => setShowCreateDish(true)}
          className="rounded-md border border-blue-600 px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50"
        >
          + Créer un nouveau plat
        </button>
      </div>

      <div className={`space-y-5 transition-opacity ${isPending ? 'opacity-60' : ''}`}>
        {CATEGORY_ORDER.map((cat) => {
          const items = grouped[cat]
          return (
            <div key={cat}>
              <div className="mb-2 flex items-center justify-between border-b pb-1">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
                  {CATEGORY_LABELS[cat]}{items.length > 0 ? ` (${items.length})` : ''}
                </h3>
                <button
                  onClick={() => setPickerCategory(cat)}
                  className="text-xs font-medium text-blue-600 hover:underline"
                >
                  + Ajouter {CATEGORY_ADD_LABEL[cat]}
                </button>
              </div>

              {items.length === 0 ? (
                <p className="py-2 text-xs text-gray-300 italic">Aucun plat dans cette catégorie</p>
              ) : (
                <div className="space-y-1.5">
                  {items.map((item, idx) => (
                    <div key={item.id} className="flex items-center gap-2 rounded-lg border bg-white px-3 py-2.5 shadow-sm">
                      {/* Reorder arrows */}
                      <div className="flex flex-col gap-0.5 shrink-0">
                        <button
                          onClick={() => handleMoveUp(item.id)}
                          disabled={isPending || idx === 0}
                          className="rounded p-0.5 text-gray-300 hover:bg-gray-100 hover:text-gray-600 disabled:opacity-20"
                          title="Monter"
                        >
                          <ChevronUp />
                        </button>
                        <button
                          onClick={() => handleMoveDown(item.id)}
                          disabled={isPending || idx === items.length - 1}
                          className="rounded p-0.5 text-gray-300 hover:bg-gray-100 hover:text-gray-600 disabled:opacity-20"
                          title="Descendre"
                        >
                          <ChevronDown />
                        </button>
                      </div>

                      {/* Dish info */}
                      <div className="flex-1 min-w-0">
                        <span className="font-medium text-gray-800 text-sm">{item.dish.name}</span>
                        {item.dish.price !== null && (
                          <span className="ml-2 text-xs text-gray-500">{item.dish.price.toFixed(2)} €</span>
                        )}
                        {item.dish.description && (
                          <p className="text-xs text-gray-400 truncate mt-0.5">{item.dish.description}</p>
                        )}
                      </div>

                      {/* Featured toggle */}
                      <button
                        onClick={() => handleToggleFeatured(item.id, item.is_featured)}
                        disabled={isPending}
                        title={item.is_featured ? 'Retirer de la mise en avant' : 'Mettre en avant'}
                        className={`shrink-0 rounded-md px-2 py-1 text-xs font-medium transition-colors ${
                          item.is_featured
                            ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                            : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                        }`}
                      >
                        ⭐
                      </button>

                      {/* Edit dish */}
                      <button
                        onClick={() => setEditingDish(item.dish)}
                        className="shrink-0 rounded-md p-1.5 text-gray-300 hover:bg-gray-100 hover:text-gray-600"
                        title="Modifier le plat"
                      >
                        <PencilIcon />
                      </button>

                      {/* Remove from menu */}
                      <button
                        onClick={() => handleRemove(item.id)}
                        disabled={isPending}
                        className="shrink-0 rounded-md p-1.5 text-gray-300 hover:bg-red-50 hover:text-red-500 disabled:opacity-30"
                        title="Retirer du menu"
                      >
                        <XIcon />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Picker modal — filtré sur la catégorie choisie */}
      {pickerCategory !== null && (
        <DishPickerModal
          menuId={menu.id}
          assignedDishIds={assignedDishIds}
          dishes={allDishes}
          defaultCategory={pickerCategory}
          onClose={() => setPickerCategory(null)}
        />
      )}

      {/* Edit dish modal */}
      {editingDish && (
        <DishFormModal dish={editingDish} onClose={() => setEditingDish(null)} />
      )}

      {/* Create dish modal */}
      {showCreateDish && (
        <DishFormModal onClose={() => setShowCreateDish(false)} />
      )}
    </div>
  )
}

function ChevronUp() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
    </svg>
  )
}

function ChevronDown() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
    </svg>
  )
}

function XIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
    </svg>
  )
}

function PencilIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
      <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
    </svg>
  )
}
