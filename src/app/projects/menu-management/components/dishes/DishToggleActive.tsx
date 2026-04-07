'use client'

import { useTransition } from 'react'
import { toggleDishActive } from '../../actions'

type Props = {
  id: string
  isActive: boolean
}

export default function DishToggleActive({ id, isActive }: Props) {
  const [isPending, startTransition] = useTransition()

  const handleToggle = () => {
    startTransition(() => {
      toggleDishActive(id, isActive)
    })
  }

  return (
    <button
      onClick={handleToggle}
      disabled={isPending}
      title={isActive ? 'Désactiver' : 'Activer'}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors disabled:opacity-50 ${
        isActive ? 'bg-green-500' : 'bg-gray-300'
      }`}
    >
      <span
        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
          isActive ? 'translate-x-4.5' : 'translate-x-0.5'
        }`}
      />
    </button>
  )
}
