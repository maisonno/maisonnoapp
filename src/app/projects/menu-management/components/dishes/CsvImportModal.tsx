'use client'

import { useActionState, useEffect, useRef } from 'react'
import { importDishesFromCsv } from '../../actions'
import type { ActionState } from '../../lib/types'

type Props = {
  onClose: () => void
}

const initialState: ActionState = null

export default function CsvImportModal({ onClose }: Props) {
  const [state, formAction, isPending] = useActionState(importDishesFromCsv, initialState)
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (state?.success) {
      formRef.current?.reset()
    }
  }, [state])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-800">Importer des plats</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div className="rounded-md bg-blue-50 px-4 py-3 text-sm text-blue-700">
            <p className="font-medium mb-1">Format attendu (CSV ou Excel) :</p>
            <p>Colonnes : <code>nom</code>, <code>description</code>, <code>prix</code>, <code>catégorie</code>, <code>actif</code></p>
            <p className="mt-1 text-xs text-blue-600">
              Catégories : entrée, à partager, plat, pizza, salade, dessert, glace
            </p>
          </div>

          <form ref={formRef} action={formAction} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fichier CSV ou Excel
              </label>
              <input
                type="file"
                name="file"
                accept=".csv,.xlsx,.xls"
                required
                className="w-full text-sm text-gray-600 file:mr-3 file:rounded-md file:border-0 file:bg-blue-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-blue-700 hover:file:bg-blue-100"
              />
            </div>

            {state?.error && (
              <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 whitespace-pre-wrap">{state.error}</p>
            )}
            {state?.success && (
              <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700 whitespace-pre-wrap">{state.success}</p>
            )}

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Fermer
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {isPending ? 'Import en cours…' : 'Importer'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
