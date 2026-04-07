'use client'

import { useState, useTransition } from 'react'
import { addDishToMenu } from '../../actions'
import type { Dish, DishCategory } from '../../lib/types'
import { CATEGORY_ORDER, CATEGORY_LABELS } from '../../lib/types'

type Props = {
  menuId: string
  assignedDishIds: Set<string>
  dishes: Dish[]
  defaultCategory?: DishCategory
  onClose: () => void
}

export default function DishPickerModal({ menuId, assignedDishIds, dishes, defaultCategory, onClose }: Props) {
  const [isPending, startTransition] = useTransition()
  const [search, setSearch] = useState('')
  const [filterCategory, setFilterCategory] = useState<DishCategory | 'all'>(defaultCategory ?? 'all')

  const available = dishes.filter((d) => {
    if (assignedDishIds.has(d.id)) return false
    if (filterCategory !== 'all' && d.category !== filterCategory) return false
    if (search && !d.name.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const grouped = CATEGORY_ORDER.reduce<Record<DishCategory, Dish[]>>((acc, cat) => {
    acc[cat] = available.filter((d) => d.category === cat)
    return acc
  }, {} as Record<DishCategory, Dish[]>)

  const handleAdd = (dishId: string) => {
    startTransition(async () => {
      const result = await addDishToMenu(menuId, dishId)
      if (result?.error) alert(result.error)
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="flex w-full max-w-lg flex-col rounded-lg bg-white shadow-xl" style={{ maxHeight: '85vh' }}>
        <div className="flex items-center justify-between border-b px-6 py-4 shrink-0">
          <h2 className="text-lg font-semibold text-gray-800">Ajouter des plats</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        <div className="border-b px-6 py-3 shrink-0 flex gap-2">
          <input
            type="search"
            placeholder="Rechercher…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-none"
          />
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value as DishCategory | 'all')}
            className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-none"
          >
            <option value="all">Toutes</option>
            {CATEGORY_ORDER.map((cat) => (
              <option key={cat} value={cat}>{CATEGORY_LABELS[cat]}</option>
            ))}
          </select>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {CATEGORY_ORDER.map((cat) => {
            const items = grouped[cat]
            if (items.length === 0) return null
            return (
              <div key={cat}>
                <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-gray-400">
                  {CATEGORY_LABELS[cat]}
                </h3>
                <div className="space-y-1">
                  {items.map((dish) => (
                    <div key={dish.id} className="flex items-center justify-between rounded-md border border-gray-100 bg-gray-50 px-3 py-2">
                      <div className="min-w-0">
                        <span className="text-sm font-medium text-gray-800">{dish.name}</span>
                        {dish.price !== null && (
                          <span className="ml-2 text-xs text-gray-500">{dish.price.toFixed(2)} €</span>
                        )}
                        {dish.description && (
                          <p className="text-xs text-gray-400 truncate">{dish.description}</p>
                        )}
                      </div>
                      <button
                        onClick={() => handleAdd(dish.id)}
                        disabled={isPending}
                        className="ml-3 shrink-0 rounded-md bg-blue-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                      >
                        + Ajouter
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}

          {available.length === 0 && (
            <p className="py-8 text-center text-sm text-gray-400">
              {dishes.length === 0 ? 'Aucun plat dans le catalogue.' : 'Tous les plats disponibles sont déjà dans ce menu.'}
            </p>
          )}
        </div>

        <div className="border-t px-6 py-3 shrink-0">
          <button
            onClick={onClose}
            className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  )
}
