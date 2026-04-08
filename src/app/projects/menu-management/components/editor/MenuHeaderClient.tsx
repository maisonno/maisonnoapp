'use client'

import { useState, useTransition } from 'react'
import { updateMenuLabel } from '../../actions'

type Props = {
  menuId: string
  label: string
  date: string   // already formatted
  notes?: string | null
}

const inputCls = 'w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500'

export default function MenuHeaderClient({ menuId, label, date, notes }: Props) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(label)
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

  const handleSave = () => {
    if (!value.trim()) { setError('Le libellé est obligatoire.'); return }
    setError('')
    startTransition(async () => {
      const result = await updateMenuLabel(menuId, value)
      if (result?.error) { setError(result.error); return }
      setEditing(false)
    })
  }

  const handleCancel = () => {
    setValue(label)
    setError('')
    setEditing(false)
  }

  return (
    <div>
      {editing ? (
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') handleCancel() }}
            autoFocus
            className={inputCls + ' text-base font-semibold'}
          />
          <button
            onClick={handleSave}
            disabled={isPending}
            className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 shrink-0"
          >
            {isPending ? '…' : 'OK'}
          </button>
          <button
            onClick={handleCancel}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 shrink-0"
          >
            ✕
          </button>
          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-semibold text-gray-800 truncate">{value}</h1>
          <button
            onClick={() => setEditing(true)}
            className="shrink-0 rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            title="Renommer"
          >
            <PencilIcon />
          </button>
        </div>
      )}
      <p className="text-sm text-gray-500 capitalize mt-0.5">{date}</p>
      {notes && <p className="text-xs text-gray-400 mt-0.5 italic">{notes}</p>}
    </div>
  )
}

function PencilIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
      <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
    </svg>
  )
}
