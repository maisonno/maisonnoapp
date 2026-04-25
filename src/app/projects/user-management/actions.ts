'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

type ProfileData = {
  first_name: string
  last_name: string
  role: 'user' | 'admin'
  app_access: string[]
}

type ActionResult = { success?: boolean; error?: string }

export async function createUser(data: { email: string } & ProfileData): Promise<ActionResult> {
  const admin = createAdminClient()

  const { data: invite, error: inviteError } = await admin.auth.admin.inviteUserByEmail(
    data.email,
    {
      data: { first_name: data.first_name, last_name: data.last_name },
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
    }
  )

  if (inviteError) return { error: inviteError.message }

  const { error: profileError } = await admin.from('usr_profiles').upsert({
    id: invite.user.id,
    first_name: data.first_name || null,
    last_name: data.last_name || null,
    role: data.role,
    app_access: data.app_access,
  })

  if (profileError) return { error: profileError.message }

  revalidatePath('/projects/user-management')
  return { success: true }
}

export async function updateProfile(userId: string, data: ProfileData): Promise<ActionResult> {
  const admin = createAdminClient()

  const { error } = await admin.from('usr_profiles').upsert({
    id: userId,
    first_name: data.first_name || null,
    last_name: data.last_name || null,
    role: data.role,
    app_access: data.app_access,
  })

  if (error) return { error: error.message }

  revalidatePath('/projects/user-management')
  return { success: true }
}

export async function sendPasswordReset(email: string): Promise<ActionResult> {
  const supabase = await createClient()

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
  })

  if (error) return { error: error.message }
  return { success: true }
}
