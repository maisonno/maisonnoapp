'use client'

import { useState, useTransition } from 'react'
import { deleteDish } from '../../actions'
import type { Dish } from '../../lib/types'
import { CATEGORY_LABELS } from '../../lib/types'
import DishFormModal from './DishFormModal'

type Props = {
  dish: Dish
}

export default function DishCard({ dish }: Props) {
  const [editing, setEditing] = useState(false)
  const [isPending, startTransition] = useTransition()

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm(`Supprimer « ${dish.name} » ?`)) return
    startTransition(async () => {
      const result = await deleteDish(dish.id)
      if (result?.error) alert(result.error)
    })
  }

  return (
    <>
      <div
        onClick={() => setEditing(true)}
        className={`flex cursor-pointer items-center gap-3 rounded-lg border bg-white px-4 py-3 shadow-sm transition-all hover:bg-gray-50 hover:shadow-md ${isPending ? 'opacity-50' : ''} ${!dish.is_active ? 'opacity-60' : ''}`}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-gray-800 truncate">{dish.name}</span>
            {!dish.is_active && (
              <span className="text-xs rounded-full bg-gray-100 text-gray-400 px-2 py-0.5">Archivé</span>
            )}
          </div>
          {dish.description && (
            <p className="text-xs text-gray-500 mt-0.5 truncate">{dish.description}</p>
          )}
          <div className="flex items-center gap-3 mt-1">
            <span className="text-xs rounded-full bg-gray-100 text-gray-600 px-2 py-0.5">
              {CATEGORY_LABELS[dish.category]}
            </span>
            {dish.price !== null && (
              <span className="text-sm font-medium text-gray-700">{dish.price.toFixed(2)} €</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={handleDelete}
            disabled={isPending}
            className="rounded-md p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
            title="Supprimer"
          >
            <TrashIcon />
          </button>
        </div>
      </div>

      {editing && <DishFormModal dish={dish} onClose={() => setEditing(false)} />}
    </>
  )
}

function TrashIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
    </svg>
  )
}
