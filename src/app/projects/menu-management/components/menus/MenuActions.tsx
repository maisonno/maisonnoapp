'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { duplicateMenu, deleteMenu } from '../../actions'

type Props = {
  menuId: string
  menuLabel: string
}

export default function MenuActions({ menuId, menuLabel }: Props) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const handleDuplicate = () => {
    startTransition(async () => {
      const result = await duplicateMenu(menuId)
      if (result?.error) { alert(result.error); return }
      if (result?.newMenuId) {
        router.push(`/projects/menu-management/${result.newMenuId}`)
      }
    })
  }

  const handleDelete = () => {
    if (!confirm(`Supprimer le menu « ${menuLabel} » et tous ses plats ?`)) return
    startTransition(async () => {
      const result = await deleteMenu(menuId)
      if (result?.error) alert(result.error)
    })
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleDuplicate}
        disabled={isPending}
        className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50 flex items-center gap-1.5"
      >
        <CopyIcon />
        {isPending ? 'Duplication…' : 'Dupliquer'}
      </button>
      <button
        onClick={handleDelete}
        disabled={isPending}
        title="Supprimer"
        className="rounded-md p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
      >
        <TrashIcon />
      </button>
    </div>
  )
}

function CopyIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
      <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
      <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
    </svg>
  )
}
