'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'

const BASE = '/projects/analyse-services'

const TABS = [
  { key: 'revenus', label: 'Revenus caisse', href: `${BASE}?tab=revenus` },
  { key: 'salaires', label: 'Coûts salariaux', href: `${BASE}?tab=salaires` },
  { key: 'appro', label: 'Coûts appro', href: `${BASE}?tab=appro` },
  { key: 'autres', label: 'Autres coûts', href: `${BASE}?tab=autres` },
  { key: 'synthese', label: 'Synthèse', href: `${BASE}?tab=synthese` },
  { key: 'import', label: 'Importation', href: `${BASE}/import` },
]

export default function TabBar() {
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const active = pathname?.endsWith('/import') ? 'import' : (searchParams.get('tab') ?? 'revenus')

  return (
    <nav className="anatabs">
      {TABS.map((t) => (
        <Link key={t.key} href={t.href} className={active === t.key ? 'act' : ''}>
          {t.label}
        </Link>
      ))}
    </nav>
  )
}
