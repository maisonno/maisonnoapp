import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import TikiHeader from '@/components/TikiHeader'
import ProjectCard from '@/components/ProjectCard'

export default async function HomePage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: projects } = await supabase
    .from('projects')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false })

  return (
    <main className="min-h-screen bg-tiki-bark">
      <TikiHeader user={user} />

      <div className="container mx-auto px-4 max-w-6xl py-12">
        {/* Page title */}
        <div className="text-center mb-12">
          <div className="tiki-divider text-sm mb-4">
            <span className="font-tiki text-tiki-gold text-2xl tracking-widest px-4">
              Le Lounge
            </span>
          </div>
          <p className="text-tiki-mist/60 text-sm font-body uppercase tracking-widest">
            Projets perso &amp; expérimentations
          </p>
        </div>

        {projects && projects.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {projects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        ) : (
          <EmptyState />
        )}
      </div>
    </main>
  )
}

function EmptyState() {
  return (
    <div className="text-center py-24 space-y-4">
      <div className="text-6xl select-none">🏝️</div>
      <h2 className="font-tiki text-tiki-gold text-2xl">
        Le lounge est vide pour l&apos;instant
      </h2>
      <p className="text-tiki-mist/60 font-body text-sm max-w-sm mx-auto">
        Ajoute tes premiers projets directement depuis ton dashboard Supabase,
        dans la table{' '}
        <code className="text-tiki-amber font-mono">projects</code>.
      </p>
    </div>
  )
}
