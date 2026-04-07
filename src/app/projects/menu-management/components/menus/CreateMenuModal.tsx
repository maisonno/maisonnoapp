'use client'

import { useActionState, useEffect } from 'react'
import { createMenu } from '../../actions'
import type { ActionState } from '../../lib/types'

type Props = {
  onClose: () => void
}

const initialState: ActionState = null
const inputCls = 'w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500'

function defaultLabel() {
  return new Date().toLocaleDateString('fr-FR', {
    weekday: undefined,
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).replace(/^(\d+)\s/, (_, d) => `Menu du ${parseInt(d)} `)
}

export default function CreateMenuModal({ onClose }: Props) {
  const [state, formAction, isPending] = useActionState(createMenu, initialState)

  useEffect(() => {
    if (state?.success) onClose()
  }, [state, onClose])

  const today = new Date().toISOString().slice(0, 10)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-800">Nouveau menu</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        <form action={formAction} className="space-y-4 px-6 py-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Libellé *</label>
            <input
              type="text"
              name="label"
              defaultValue={defaultLabel()}
              required
              className={inputCls}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
            <input
              type="date"
              name="menu_date"
              defaultValue={today}
              required
              className={inputCls}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              name="notes"
              rows={2}
              className={inputCls}
            />
          </div>

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
              {isPending ? 'Création…' : 'Créer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
