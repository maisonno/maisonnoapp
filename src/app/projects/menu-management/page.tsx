import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { getDishes, getMenus, getTemplates } from './lib/queries'
import TabBar from './components/TabBar'
import MenuList from './components/menus/MenuList'
import DishList from './components/dishes/DishList'
import TemplateList from './components/templates/TemplateList'
import Link from 'next/link'

type Props = {
  searchParams: Promise<{ tab?: string }>
}

export const metadata = {
  title: 'Gestion des Menus — La Pomme d\'Adam',
}

export default async function MenuManagementPage({ searchParams }: Props) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const params = await searchParams
  const activeTab = params.tab === 'dishes' ? 'dishes' : params.tab === 'templates' ? 'templates' : 'menus'

  const [menus, dishes, templates] = await Promise.all([getMenus(), getDishes(), getTemplates()])

  // Get item counts per menu
  const { data: countRows } = await supabase
    .from('mnu_menu_items')
    .select('menu_id')

  const itemCounts: Record<string, number> = {}
  for (const row of countRows ?? []) {
    itemCounts[row.menu_id] = (itemCounts[row.menu_id] ?? 0) + 1
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b shadow-sm">
        <div className="mx-auto max-w-4xl px-4 py-4 flex items-center gap-3">
          <Link href="/" className="text-gray-400 hover:text-gray-600 text-sm">
            ← Accueil
          </Link>
          <span className="text-gray-300">/</span>
          <h1 className="text-lg font-semibold text-gray-800">Gestion des Menus</h1>
          <span className="text-xs rounded-full bg-amber-100 text-amber-700 px-2 py-0.5 font-medium">
            La Pomme d&apos;Adam
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-6">
        {/* Tabs */}
        <Suspense>
          <TabBar />
        </Suspense>

        <div className="mt-6">
          {activeTab === 'menus' && (
            <MenuList menus={menus} itemCounts={itemCounts} />
          )}
          {activeTab === 'dishes' && (
            <DishList dishes={dishes} />
          )}
          {activeTab === 'templates' && (
            <TemplateList templates={templates} />
          )}
        </div>
      </main>
    </div>
  )
}
