'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

const TABS = [
  { key: 'menus', label: 'Menus' },
  { key: 'dishes', label: 'Catalogue des plats' },
  { key: 'templates', label: 'Modèles' },
]

export default function TabBar() {
  const searchParams = useSearchParams()
  const active = searchParams.get('tab') ?? 'menus'

  return (
    <div className="border-b border-gray-200">
      <nav className="-mb-px flex gap-6">
        {TABS.map((tab) => (
          <Link
            key={tab.key}
            href={`/projects/menu-management?tab=${tab.key}`}
            className={`py-3 text-sm font-medium border-b-2 transition-colors ${
              active === tab.key
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300'
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </nav>
    </div>
  )
}
