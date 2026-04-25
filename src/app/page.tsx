import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import TikiHeader from '@/components/TikiHeader'
import ProjectCard from '@/components/ProjectCard'

export default async function HomePage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Récupère le profil du user courant pour filtrer les projets
  const { data: profile } = await supabase
    .from('usr_profiles')
    .select('role, app_access')
    .eq('id', user.id)
    .single()

  // Construit la requête projets
  let projectsQuery = supabase
    .from('projects')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false })

  // Les non-admins voient uniquement leurs apps autorisées
  if (profile && profile.role !== 'admin') {
    projectsQuery = projectsQuery.in('slug', profile.app_access ?? [])
  }

  const { data: projects } = await projectsQuery

  return (
    <main className="min-h-screen bg-slate-950">
      <TikiHeader user={user} />

      <div className="container mx-auto px-4 max-w-6xl py-10">
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-white">Projets</h2>
          <p className="text-slate-400 text-sm mt-1">Expérimentations & mini-apps</p>
        </div>

        {projects && projects.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        ) : (
          <div className="text-center py-24">
            <p className="text-slate-500 text-sm mb-2">Aucun projet disponible.</p>
            <p className="text-slate-600 text-xs">
              Contacte un administrateur pour obtenir des accès.
            </p>
          </div>
        )}
      </div>
    </main>
  )
}
