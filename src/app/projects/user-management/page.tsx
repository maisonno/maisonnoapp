import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import TikiHeader from '@/components/TikiHeader'
import UserManagementClient from './components/UserManagementClient'

export default async function UserManagementPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()

  // Seuls les admins peuvent accéder à cette page.
  // On lit le rôle via le client admin (service role) pour ne pas dépendre
  // des politiques RLS de usr_profiles.
  const { data: currentProfile } = await admin
    .from('usr_profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (currentProfile?.role !== 'admin') redirect('/')

  // Tous les utilisateurs auth + leurs profils
  const [{ data: { users: authUsers } }, { data: profiles }, { data: projects }] =
    await Promise.all([
      admin.auth.admin.listUsers({ perPage: 1000 }),
      admin.from('usr_profiles').select('*'),
      admin.from('projects').select('slug, title').order('sort_order'),
    ])

  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]))

  const users = authUsers.map((u) => ({
    id: u.id,
    email: u.email ?? '',
    created_at: u.created_at,
    last_sign_in_at: u.last_sign_in_at ?? null,
    profile: profileMap.get(u.id) ?? null,
  }))

  return (
    <main className="min-h-screen bg-slate-950">
      <TikiHeader user={user} />
      <div className="container mx-auto px-4 max-w-6xl py-8">
        <UserManagementClient
          users={users}
          projects={projects ?? []}
          currentUserId={user.id}
        />
      </div>
    </main>
  )
}
