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
    <div className="relative flex items-center gap-4 rounded-lg border bg-white px-4 py-3 shadow-sm hover:shadow-md transition-shadow hover:bg-gray-50">
      {/* Whole card is a link */}
      <Link
        href={`/projects/menu-management/${menu.id}`}
        className="absolute inset-0 rounded-lg"
        aria-label={`Éditer ${menu.label}`}
      />

      <div className="flex-1 min-w-0 pointer-events-none">
        <p className="font-semibold text-gray-800 truncate">{menu.label}</p>
        <p className="text-sm text-gray-500 mt-0.5 capitalize">{formatDate(menu.menu_date)}</p>
        {itemCount !== undefined && (
          <p className="text-xs text-gray-400 mt-0.5">{itemCount} plat(s)</p>
        )}
        {menu.notes && (
          <p className="text-xs text-gray-400 mt-0.5 truncate italic">{menu.notes}</p>
        )}
      </div>

      {/* Actions sit above the link */}
      <div className="relative z-10 flex items-center gap-1 shrink-0">
        <MenuActions menuId={menu.id} menuLabel={menu.label} />
      </div>
    </div>
  )
}
