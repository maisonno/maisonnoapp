import Link from 'next/link'
import type { Menu } from '../../lib/types'
import MenuActions from './MenuActions'

type Props = {
  menu: Menu
  itemCount?: number
}

function formatDate(dateStr: string) {
  const date = new Date(dateStr + 'T00:00:00')
  return date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

export default function MenuCard({ menu, itemCount }: Props) {
  return (
    <div className="flex items-center gap-4 rounded-lg border bg-white px-4 py-3 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <Link
            href={`/projects/menu-management/${menu.id}`}
            className="font-semibold text-gray-800 hover:text-blue-600 truncate"
          >
            {menu.label}
          </Link>
        </div>
        <p className="text-sm text-gray-500 mt-0.5 capitalize">{formatDate(menu.menu_date)}</p>
        {itemCount !== undefined && (
          <p className="text-xs text-gray-400 mt-0.5">{itemCount} plat(s)</p>
        )}
        {menu.notes && (
          <p className="text-xs text-gray-400 mt-0.5 truncate italic">{menu.notes}</p>
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <Link
          href={`/projects/menu-management/${menu.id}`}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
        >
          Éditer
        </Link>
        <MenuActions menuId={menu.id} menuLabel={menu.label} />
      </div>
    </div>
  )
}
