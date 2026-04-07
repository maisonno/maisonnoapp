'use client'

import { useState } from 'react'
import type { Menu } from '../../lib/types'
import MenuCard from './MenuCard'
import CreateMenuModal from './CreateMenuModal'

type Props = {
  menus: Menu[]
  itemCounts: Record<string, number>
}

export default function MenuList({ menus, itemCounts }: Props) {
  const [showCreate, setShowCreate] = useState(false)

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-gray-500">{menus.length} menu(s)</p>
        <button
          onClick={() => setShowCreate(true)}
          className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
        >
          + Nouveau menu
        </button>
      </div>

      <div className="space-y-2">
        {menus.map((menu) => (
          <MenuCard key={menu.id} menu={menu} itemCount={itemCounts[menu.id]} />
        ))}

        {menus.length === 0 && (
          <div className="py-12 text-center">
            <p className="text-gray-400 text-sm">Aucun menu. Créez-en un pour commencer.</p>
          </div>
        )}
      </div>

      {showCreate && <CreateMenuModal onClose={() => setShowCreate(false)} />}
    </div>
  )
}
