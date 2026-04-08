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

type Tab = DishCategory | 'all' | 'archived'

const TABS: { key: Tab; label: string }[] = [
  { key: 'all', label: 'Tous' },
  { key: 'entree', label: 'Entrées' },
  { key: 'a_partager', label: 'À partager' },
  { key: 'plat', label: 'Plats' },
  { key: 'pizza', label: 'Pizzas' },
  { key: 'salade', label: 'Salades' },
  { key: 'dessert', label: 'Desserts' },
  { key: 'glace', label: 'Glaces' },
  { key: 'archived', label: 'Archivés' },
]

export default function DishList({ dishes }: Props) {
  const [showCreate, setShowCreate] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [activeTab, setActiveTab] = useState<Tab>('all')
  const [search, setSearch] = useState('')

  const filtered = dishes.filter((d) => {
    if (activeTab === 'archived') return !d.is_active
    if (!d.is_active) return false
    if (activeTab !== 'all' && d.category !== activeTab) return false
    if (search && !d.name.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  // For "all" tab — group by category. For specific tab — flat list.
  const grouped = CATEGORY_ORDER.reduce<Record<DishCategory, Dish[]>>((acc, cat) => {
    acc[cat] = filtered.filter((d) => d.category === cat)
    return acc
  }, {} as Record<DishCategory, Dish[]>)

  return (
    <div>
      {/* Sub-tabs */}
      <div className="mb-4 overflow-x-auto">
        <div className="flex gap-1 border-b border-gray-200 min-w-max">
          {TABS.map((tab) => {
            const count = tab.key === 'archived'
              ? dishes.filter((d) => !d.is_active).length
              : tab.key === 'all'
              ? dishes.filter((d) => d.is_active).length
              : dishes.filter((d) => d.is_active && d.category === tab.key).length
            return (
              <button
                key={tab.key}
                onClick={() => { setActiveTab(tab.key); setSearch('') }}
                className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab.key
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300'
                }`}
              >
                {tab.label}
                {count > 0 && (
                  <span className="ml-1 text-xs text-gray-400">({count})</span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Header */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <input
          type="search"
          placeholder="Rechercher…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
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

      <p className="mb-3 text-sm text-gray-500">{filtered.length} plat(s)</p>

      {/* List */}
      {activeTab === 'all' || activeTab === 'archived' ? (
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
      ) : (
        <div className="space-y-2">
          {filtered.map((dish) => <DishCard key={dish.id} dish={dish} />)}
          {filtered.length === 0 && (
            <p className="py-8 text-center text-sm text-gray-400">Aucun plat dans cette catégorie.</p>
          )}
        </div>
      )}

      {showCreate && <DishFormModal onClose={() => setShowCreate(false)} />}
      {showImport && <CsvImportModal onClose={() => setShowImport(false)} />}
    </div>
  )
}
