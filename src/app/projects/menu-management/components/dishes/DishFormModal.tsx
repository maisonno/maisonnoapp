'use client'

import { useActionState, useEffect, useRef, useTransition, useState } from 'react'
import { createDish, updateDish, archiveDish } from '../../actions'
import type { ActionState, Dish, DishCategory } from '../../lib/types'
import { CATEGORY_ORDER, CATEGORY_LABELS } from '../../lib/types'

type Props = {
  onClose: () => void
  dish?: Dish
}

const initialState: ActionState = null
const inputCls = 'w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500'

export default function DishFormModal({ onClose, dish }: Props) {
  const action = dish ? updateDish : createDish
  const [state, formAction, isPending] = useActionState(action, initialState)
  const formRef = useRef<HTMLFormElement>(null)
  const [isArchiving, startArchiveTransition] = useTransition()
  const [isActive, setIsActive] = useState(dish?.is_active ?? true)

  useEffect(() => {
    if (state?.success) {
      onClose()
    }
  }, [state, onClose])

  const handleArchive = () => {
    if (!dish) return
    const willArchive = isActive
    startArchiveTransition(async () => {
      await archiveDish(dish.id, willArchive)
      setIsActive(!willArchive)
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-800">
            {dish ? 'Modifier le plat' : 'Nouveau plat'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        <form ref={formRef} action={formAction} className="space-y-4 px-6 py-5">
          {dish && <input type="hidden" name="id" value={dish.id} />}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nom *</label>
            <input
              type="text"
              name="name"
              defaultValue={dish?.name}
              required
              className={inputCls}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              name="description"
              defaultValue={dish?.description ?? ''}
              rows={2}
              className={inputCls}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Prix (€)</label>
              <input
                type="number"
                name="price"
                defaultValue={dish?.price ?? ''}
                step="0.5"
                min="0"
                className={inputCls}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Catégorie *</label>
              <select
                name="category"
                defaultValue={dish?.category ?? 'plat'}
                className={inputCls}
              >
                {CATEGORY_ORDER.map((cat) => (
                  <option key={cat} value={cat}>{CATEGORY_LABELS[cat as DishCategory]}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Hidden is_active — kept in sync via archiveDish action */}
          <input type="hidden" name="is_active" value={isActive ? 'true' : 'false'} />

          {dish && (
            <div className="flex items-center justify-between rounded-md border border-gray-200 bg-gray-50 px-3 py-2">
              <span className="text-sm text-gray-600">
                Statut : <span className={isActive ? 'text-green-700 font-medium' : 'text-gray-400 font-medium'}>{isActive ? 'Actif' : 'Archivé'}</span>
              </span>
              <button
                type="button"
                onClick={handleArchive}
                disabled={isArchiving}
                className={`rounded-md px-3 py-1 text-xs font-medium transition-colors disabled:opacity-50 ${
                  isActive
                    ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                    : 'bg-green-100 text-green-700 hover:bg-green-200'
                }`}
              >
                {isArchiving ? '…' : isActive ? 'Archiver' : 'Désarchiver'}
              </button>
            </div>
          )}

          {state?.error && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {isPending ? 'Enregistrement…' : dish ? 'Modifier' : 'Créer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
