import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getMenuWithItems, getDishes, getGeneratedDocs, getTemplates } from '../lib/queries'
import MenuEditorClient from '../components/editor/MenuEditorClient'
import MenuHeaderClient from '../components/editor/MenuHeaderClient'
import DocumentPanel from '../components/editor/DocumentPanel'
import Link from 'next/link'

type Props = {
  params: Promise<{ menuId: string }>
}

function formatDate(dateStr: string) {
  const date = new Date(dateStr + 'T00:00:00')
  return date.toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
}

export default async function MenuEditorPage({ params }: Props) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { menuId } = await params
  const [menu, dishes, docs, templates] = await Promise.all([
    getMenuWithItems(menuId),
    getDishes(),
    getGeneratedDocs(menuId),
    getTemplates(),
  ])

  if (!menu) notFound()

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b shadow-sm">
        <div className="mx-auto max-w-4xl px-4 py-4">
          <div className="flex items-center gap-3 mb-1">
            <Link href="/projects/menu-management" className="text-gray-400 hover:text-gray-600 text-sm shrink-0">
              ← Menus
            </Link>
            <span className="text-gray-300">/</span>
            <MenuHeaderClient
              menuId={menu.id}
              label={menu.label}
              date={formatDate(menu.menu_date)}
              notes={menu.notes}
            />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-6 space-y-8">
        {/* Menu editor */}
        <section>
          <h2 className="text-base font-semibold text-gray-700 mb-3">Composition du menu</h2>
          <MenuEditorClient menu={menu} allDishes={dishes} />
        </section>

        {/* Documents */}
        <section>
          <h2 className="text-base font-semibold text-gray-700 mb-3">Documents</h2>
          <DocumentPanel menuId={menu.id} docs={docs} templates={templates} />
        </section>
      </main>
    </div>
  )
}
