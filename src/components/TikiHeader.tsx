import { logout } from '@/app/actions'
import type { User } from '@supabase/supabase-js'

export default function AppHeader({ user }: { user: User }) {
  return (
    <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-sm sticky top-0 z-10">
      <div className="container mx-auto px-4 max-w-6xl h-14 flex items-center justify-between">
        <span className="text-white font-semibold tracking-tight">
          maisonno
        </span>

        <div className="flex items-center gap-4">
          <span className="text-slate-500 text-sm hidden sm:block truncate max-w-[200px]">
            {user.email}
          </span>
          <form action={logout}>
            <button
              type="submit"
              className="text-slate-400 hover:text-slate-200 text-sm transition-colors"
            >
              Déconnexion
            </button>
          </form>
        </div>
      </div>
    </header>
  )
}
