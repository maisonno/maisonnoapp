'use client'

import { useState } from 'react'
import type { Dish, DishCategory } from '../../lib/types'
import { CATEGORY_ORDER, CATEGORY_LABELS } from '../../lib/types'
import DishCard from './DishCard'
import DishFormModal from './DishFormModal'
import CsvImportModal from './CsvImportModal'

type Props = {
  dishes: Dish[]
}

export default function DishList({ dishes }: Props) {
  const [showCreate, setShowCreate] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [filterCategory, setFilterCategory] = useState<DishCategory | 'all'>('all')
  const [filterActive, setFilterActive] = useState<'all' | 'active' | 'inactive'>('all')
  const [search, setSearch] = useState('')

  const filtered = dishes.filter((d) => {
    if (filterCategory !== 'all' && d.category !== filterCategory) return false
    if (filterActive === 'active' && !d.is_active) return false
    if (filterActive === 'inactive' && d.is_active) return false
    if (search && !d.name.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const grouped = CATEGORY_ORDER.reduce<Record<DishCategory, Dish[]>>((acc, cat) => {
    acc[cat] = filtered.filter((d) => d.category === cat)
    return acc
  }, {} as Record<DishCategory, Dish[]>)

  return (
    <div>
      {/* Header */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <input
            type="search"
            placeholder="Rechercher…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value as DishCategory | 'all')}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
          >
            <option value="all">Toutes catégories</option>
            {CATEGORY_ORDER.map((cat) => (
              <option key={cat} value={cat}>{CATEGORY_LABELS[cat]}</option>
            ))}
          </select>
          <select
            value={filterActive}
            onChange={(e) => setFilterActive(e.target.value as 'all' | 'active' | 'inactive')}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
          >
            <option value="all">Tous les plats</option>
            <option value="active">Au menu uniquement</option>
            <option value="inactive">Hors menu</option>
          </select>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setShowImport(true)}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Importer CSV
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
          >
            + Nouveau plat
          </button>
        </div>
      </div>

      {/* Count */}
      <p className="mb-3 text-sm text-gray-500">{filtered.length} plat(s)</p>

      {/* Grouped list */}
      <div className="space-y-6">
        {CATEGORY_ORDER.map((cat) => {
          const items = grouped[cat]
          if (items.length === 0) return null
          return (
            <div key={cat}>
              <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500">
                {CATEGORY_LABELS[cat]} ({items.length})
              </h3>
              <div className="space-y-2">
                {items.map((dish) => <DishCard key={dish.id} dish={dish} />)}
              </div>
            </div>
          )
        })}

        {filtered.length === 0 && (
          <p className="py-8 text-center text-sm text-gray-400">Aucun plat trouvé.</p>
        )}
      </div>

      {showCreate && <DishFormModal onClose={() => setShowCreate(false)} />}
      {showImport && <CsvImportModal onClose={() => setShowImport(false)} />}
    </div>
  )
}
